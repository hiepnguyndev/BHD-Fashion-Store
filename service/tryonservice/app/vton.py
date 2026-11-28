"""Gọi các Space IDM-VTON công khai trên Hugging Face qua gradio_client. Space có thể quá tải, đổi API hoặc ngừng hoạt động,
nên thử lần lượt từng Space và báo lỗi thân thiện khi tất cả đều không dùng được."""
import logging
import shutil

from gradio_client import Client, handle_file

from . import config

log = logging.getLogger("thudo")
_clients: dict[str, Client] = {}


class LoiThuDo(Exception):
    """Lỗi có thể nói thẳng với khách."""


def _lay_client(space: str) -> Client:
    c = _clients.get(space)
    if c is None:
        c = Client(space, token=config.HF_TOKEN, verbose=False, httpx_kwargs={"timeout": 90})
        _clients[space] = c
    return c


def thu_do(anh_nguoi: str, anh_ao: str, mo_ta_ao: str, ra: str) -> str:
    """Chạy đồng bộ (gọi trong luồng riêng). Trả về đường dẫn file kết quả đã chép vào `ra`."""
    loi_cuoi = ""
    for space in config.SPACES:
        try:
            c = _lay_client(space)
            kq = c.submit(
                {"background": handle_file(anh_nguoi), "layers": [], "composite": None},
                handle_file(anh_ao), mo_ta_ao[:100], True, False, 30, 42,
                api_name="/tryon",
            ).result(timeout=config.CHO_TOI_DA_GIAY)
            nguon = kq[0] if isinstance(kq, (list, tuple)) else kq
            shutil.copyfile(nguon, ra)
            return ra
        except Exception as e:  # noqa: BLE001 - Space có thể lỗi theo nhiều cách khác nhau
            loi_cuoi = f"{type(e).__name__}: {str(e)[:200]}"
            log.warning("Space %s không dùng được: %s", space, loi_cuoi)
            _clients.pop(space, None)   # lần sau tạo lại client
    if "quota" in loi_cuoi.lower() or "gpu" in loi_cuoi.lower():
        raise LoiThuDo("Dịch vụ AI miễn phí đã hết lượt GPU trong hôm nay. Bạn thử lại sau ít giờ nhé.")
    raise LoiThuDo("Dịch vụ thử đồ miễn phí đang quá tải hoặc tạm ngừng. Bạn thử lại sau ít phút nhé.")
