import logging
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import catalog, config, llm, rules

log = logging.getLogger("trolyai")
logging.basicConfig(level=logging.INFO)
app = FastAPI(title="AssistantService", docs_url=None, redoc_url=None, openapi_url=None)

_cua_so: dict[str, deque] = defaultdict(deque)       # ip -> thời điểm các lượt trong 60 giây gần nhất
_llm_ngay: dict[str, tuple[str, int]] = {}            # ip -> (ngày, số lượt gọi LLM)


class TinNhan(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=config.TIN_NHAN_TOI_DA)


class YeuCau(BaseModel):
    messages: list[TinNhan] = Field(min_length=1, max_length=40)


def _ip(req: Request) -> str:
    return (req.headers.get("x-forwarded-for") or (req.client.host if req.client else "?")).split(",")[0].strip()


def _qua_toc_do(ip: str) -> bool:
    now = time.time()
    q = _cua_so[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= config.LUOT_MOI_PHUT:
        return True
    q.append(now)
    if len(_cua_so) > 5000:   # tránh phình bộ nhớ
        for k in [k for k, v in _cua_so.items() if not v][:1000]:
            _cua_so.pop(k, None)
    return False


def _con_luot_llm(ip: str) -> bool:
    ngay = time.strftime("%Y-%m-%d")
    d, n = _llm_ngay.get(ip, (ngay, 0))
    if d != ngay:
        n = 0
    if n >= config.LUOT_LLM_MOI_NGAY:
        return False
    _llm_ngay[ip] = (ngay, n + 1)
    return True


@app.get("/health")
def health():
    return {"trangThai": "OK", "llm": bool(config.GEMINI_API_KEY)}


@app.post("/api/tro-ly/chat")
async def chat(yc: YeuCau, req: Request):
    ip = _ip(req)
    if _qua_toc_do(ip):
        return JSONResponse({"loi": "Bạn gửi hơi nhanh, vui lòng thử lại sau ít phút."}, status_code=429)
    ls = [m.model_dump() for m in yc.messages][-config.LICH_SU_TOI_DA:]
    while ls and ls[0]["role"] != "user":   # Gemini yêu cầu lượt đầu là của khách
        ls.pop(0)
    if not ls or ls[-1]["role"] != "user" or not ls[-1]["content"].strip():
        return JSONResponse({"loi": "Tin nhắn trống."}, status_code=400)

    ho_so = await catalog.ho_so_so_do(req.headers.get("authorization"))
    if llm.san_sang() and _con_luot_llm(ip):
        try:
            kq = await llm.tra_loi(ls, ho_so)
            return {**kq, "cheDo": "llm"}
        except llm.LoiLLM as e:
            log.warning("LLM lỗi, chuyển về chế độ luật: %s", e)
        except Exception:   # không để lỗi bất ngờ làm chatbot im lặng
            log.exception("LLM lỗi không lường trước")
    kq = await rules.tra_loi(ls[-1]["content"], ho_so)
    return {**kq, "cheDo": "luat"}
