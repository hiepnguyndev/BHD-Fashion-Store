import asyncio
import hashlib
import logging
import os
import secrets
import shutil
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from . import config, imaging, vton

log = logging.getLogger("thudo")
logging.basicConfig(level=logging.INFO)

_http = httpx.AsyncClient(timeout=15.0)
_hang_doi: asyncio.Queue = asyncio.Queue()
_viec: dict[str, dict] = {}                 # mã -> thông tin việc
_cache: dict[str, str] = {}                 # khóa nội dung -> mã việc đã xong
_luot: dict[int, tuple[str, int]] = {}      # mã người dùng -> (ngày, số lượt)
_stt = iter(range(1, 10**9))                # số thứ tự để tính vị trí trong hàng đợi


def _loi(ma: int, nd: str):
    return JSONResponse({"loi": nd}, status_code=ma)


def _xoa_viec(ma: str):
    v = _viec.pop(ma, None)
    if v:
        shutil.rmtree(v["thuMuc"], ignore_errors=True)
        if _cache.get(v.get("khoa", "")) == ma:
            _cache.pop(v["khoa"], None)


async def _nguoi_dung(req: Request) -> int | None:
    auth = req.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    try:
        r = await _http.get(f"{config.NGUOI_DUNG_URL}/api/nguoi-dung/toi", headers={"authorization": auth})
        return int(r.json()["maNguoiDung"]) if r.status_code == 200 else None
    except (httpx.HTTPError, KeyError, ValueError):
        return None


def _con_luot(nd: int) -> int:
    ngay = time.strftime("%Y-%m-%d")
    d, n = _luot.get(nd, (ngay, 0))
    return config.LUOT_MOI_NGAY - (n if d == ngay else 0)


def _tru_luot(nd: int, so: int):
    ngay = time.strftime("%Y-%m-%d")
    d, n = _luot.get(nd, (ngay, 0))
    _luot[nd] = (ngay, (n if d == ngay else 0) + so)


async def _tai_anh_ao(slug: str, mau: str | None) -> tuple[bytes, str, str]:
    """Trả về (bytes ảnh áo, tên sản phẩm, url ảnh). Báo lỗi nếu sản phẩm không hỗ trợ thử đồ."""
    r = await _http.get(f"{config.SAN_PHAM_URL}/api/san-pham/{slug}")
    if r.status_code != 200:
        raise vton.LoiThuDo("Không tìm thấy sản phẩm.")
    d = r.json()
    if not any(c.get("duongDan") in config.DANH_MUC_HO_TRO for c in d.get("danhMuc", [])):
        raise vton.LoiThuDo("Hiện mới hỗ trợ thử đồ với áo.")
    ds = d.get("hinhAnh") or []
    chon = next((h for h in ds if mau and h.get("mauSac") == mau), None) or next((h for h in ds if h.get("laAnhChinh")), None) or (ds[0] if ds else None)
    if not chon:
        raise vton.LoiThuDo("Sản phẩm chưa có ảnh để thử.")
    url = chon["duongDanAnh"]
    if url.startswith("/anh/"):
        url = config.GATEWAY_URL + url
    elif not url.lower().startswith(("http://", "https://")):
        raise vton.LoiThuDo("Ảnh sản phẩm không hợp lệ.")
    a = await _http.get(url, follow_redirects=False)
    if a.status_code != 200 or len(a.content) > config.ANH_TOI_DA_BYTE:
        raise vton.LoiThuDo("Không tải được ảnh sản phẩm.")
    return a.content, d["sanPham"]["tenSanPham"], url


async def _tho():
    """Chạy lần lượt từng việc: các Space miễn phí chỉ nên nhận một yêu cầu một lúc."""
    while True:
        ma = await _hang_doi.get()
        v = _viec.get(ma)
        if not v or v["trangThai"] != "cho":
            continue
        v["trangThai"] = "dang_xu_ly"
        try:
            await asyncio.to_thread(vton.thu_do, v["anhNguoi"], v["anhAo"], v["moTa"], v["ketQua"])
            v["trangThai"], v["hetHan"] = "xong", time.time() + config.GIU_KET_QUA_PHUT * 60
            _cache[v["khoa"]] = ma
        except vton.LoiThuDo as e:
            v["trangThai"], v["thongDiep"] = "loi", str(e)
            _tru_luot(v["nguoiDung"], -1)   # lỗi phía dịch vụ thì hoàn lại lượt
        except Exception:  # noqa: BLE001
            log.exception("Lỗi không lường trước khi thử đồ")
            v["trangThai"], v["thongDiep"] = "loi", "Có lỗi khi xử lý ảnh. Bạn thử lại sau nhé."
            _tru_luot(v["nguoiDung"], -1)
        finally:
            # ảnh gốc của khách không cần giữ nữa
            for k in ("anhNguoi", "anhAo"):
                try:
                    os.remove(v[k])
                except OSError:
                    pass
            v["hetHan"] = v.get("hetHan") or time.time() + 5 * 60


async def _don_dep():
    while True:
        await asyncio.sleep(60)
        now = time.time()
        for ma in [m for m, v in _viec.items() if v.get("hetHan") and v["hetHan"] < now]:
            _xoa_viec(ma)


@asynccontextmanager
async def vong_doi(_: FastAPI):
    os.makedirs(config.THU_MUC, exist_ok=True)
    tac_vu = [asyncio.create_task(_tho()), asyncio.create_task(_don_dep())]
    yield
    for t in tac_vu:
        t.cancel()


app = FastAPI(title="TryOnService", docs_url=None, redoc_url=None, openapi_url=None, lifespan=vong_doi)


@app.get("/health")
def health():
    return {"trangThai": "OK", "spaces": config.SPACES}


@app.post("/api/thu-do", status_code=202)
async def tao_viec(req: Request, anh: UploadFile = File(...), slug: str = Form(..., max_length=220),
                   mau: str | None = Form(default=None, max_length=50), dongY: str = Form(default="")):
    nd = await _nguoi_dung(req)
    if nd is None:
        return _loi(401, "Bạn cần đăng nhập để thử đồ.")
    if dongY != "true":
        return _loi(400, "Bạn cần đồng ý để ảnh được gửi tới dịch vụ AI trước khi thử đồ.")
    if _con_luot(nd) <= 0:
        return _loi(429, f"Bạn đã dùng hết {config.LUOT_MOI_NGAY} lượt thử đồ hôm nay. Hãy quay lại vào ngày mai nhé.")
    if sum(1 for v in _viec.values() if v["trangThai"] in ("cho", "dang_xu_ly")) >= config.HANG_DOI_TOI_DA:
        return _loi(503, "Hệ thống thử đồ đang rất đông. Bạn thử lại sau ít phút nhé.")
    if any(v["nguoiDung"] == nd and v["trangThai"] in ("cho", "dang_xu_ly") for v in _viec.values()):
        return _loi(409, "Bạn đang có một lượt thử đồ đang xử lý, vui lòng đợi xong.")

    du_lieu = await anh.read(config.ANH_TOI_DA_BYTE + 1)
    if len(du_lieu) > config.ANH_TOI_DA_BYTE:
        return _loi(413, "Ảnh quá lớn (tối đa 10 MB).")
    try:
        nguoi = imaging.mo_anh(du_lieu)
        if min(nguoi.size) < 256:
            return _loi(422, "Ảnh quá nhỏ. Vui lòng dùng ảnh rõ nét hơn (cạnh ngắn tối thiểu 256 px).")
        bytes_ao, ten_ao, url_ao = await _tai_anh_ao(slug, mau)
        ao = imaging.mo_anh(bytes_ao)
    except imaging.LoiAnh as e:
        return _loi(422, str(e))
    except vton.LoiThuDo as e:
        return _loi(422, str(e))
    except httpx.HTTPError:
        return _loi(502, "Không lấy được thông tin sản phẩm. Vui lòng thử lại.")

    nguoi, ao = imaging.ve_khung_3_4(nguoi, True), imaging.ve_khung_3_4(ao, False)
    khoa = hashlib.sha256(nguoi.tobytes() + url_ao.encode()).hexdigest()

    ma = secrets.token_urlsafe(12)
    thu_muc = os.path.join(config.THU_MUC, ma)
    os.makedirs(thu_muc)
    v = {"nguoiDung": nd, "trangThai": "cho", "thuMuc": thu_muc, "khoa": khoa, "moTa": ten_ao,
         "anhNguoi": os.path.join(thu_muc, "nguoi.jpg"), "anhAo": os.path.join(thu_muc, "ao.jpg"),
         "ketQua": os.path.join(thu_muc, "ket-qua.png"), "hetHan": None, "stt": next(_stt)}
    cu = _viec.get(_cache.get(khoa, ""))
    if cu and cu["nguoiDung"] == nd and cu["trangThai"] == "xong" and os.path.exists(cu["ketQua"]):
        shutil.copyfile(cu["ketQua"], v["ketQua"])    # cùng ảnh, cùng áo: dùng lại kết quả, không tốn lượt
        v["trangThai"], v["hetHan"] = "xong", time.time() + config.GIU_KET_QUA_PHUT * 60
        _viec[ma] = v
        return {"maThuDo": ma, "trangThai": "xong", "conLai": _con_luot(nd)}
    imaging.luu_jpeg(nguoi, v["anhNguoi"])
    imaging.luu_jpeg(ao, v["anhAo"])
    _viec[ma] = v
    _tru_luot(nd, 1)
    await _hang_doi.put(ma)
    return {"maThuDo": ma, "trangThai": "cho", "conLai": _con_luot(nd)}


async def _cua_toi(req: Request, ma: str):
    nd = await _nguoi_dung(req)
    if nd is None:
        return None, _loi(401, "Bạn cần đăng nhập.")
    v = _viec.get(ma)
    if not v or v["nguoiDung"] != nd:
        return None, _loi(404, "Không tìm thấy lượt thử đồ (có thể đã hết hạn).")
    return v, None


@app.get("/api/thu-do/{ma}")
async def xem_viec(ma: str, req: Request):
    v, loi = await _cua_toi(req, ma)
    if loi:
        return loi
    vi_tri = 0
    if v["trangThai"] == "cho":
        # số việc đang chạy hoặc xếp trước bạn
        vi_tri = sum(1 for x in _viec.values() if x["trangThai"] == "dang_xu_ly" or (x["trangThai"] == "cho" and x["stt"] < v["stt"])) + 1
    return {"trangThai": v["trangThai"], "viTri": vi_tri, "thongDiep": v.get("thongDiep"), "conLai": _con_luot(v["nguoiDung"])}


@app.get("/api/thu-do/{ma}/anh")
async def anh_ket_qua(ma: str, req: Request):
    v, loi = await _cua_toi(req, ma)
    if loi:
        return loi
    if v["trangThai"] != "xong" or not os.path.exists(v["ketQua"]):
        return _loi(404, "Chưa có kết quả.")
    return FileResponse(v["ketQua"], media_type="image/png", headers={"Cache-Control": "no-store"})


@app.delete("/api/thu-do/{ma}")
async def xoa_viec(ma: str, req: Request):
    v, loi = await _cua_toi(req, ma)
    if loi:
        return loi
    if v["trangThai"] in ("cho", "dang_xu_ly"):
        return _loi(409, "Lượt thử đồ đang xử lý.")
    _xoa_viec(ma)
    return {"thongBao": "Đã xóa ảnh kết quả."}
