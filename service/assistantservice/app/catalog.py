"""Đọc dữ liệu sản phẩm qua các API công khai của sanpham/donhang (không cần khóa nội bộ, chỉ đọc)."""
import httpx

from . import config

_http = httpx.AsyncClient(timeout=8.0)


async def _get(url: str, params: dict | None = None):
    try:
        r = await _http.get(url, params={k: v for k, v in (params or {}).items() if v not in (None, "")})
        return r.json() if r.status_code == 200 else None
    except httpx.HTTPError:
        return None


def the_san_pham(sp: dict) -> dict:
    """Rút gọn thành thẻ hiển thị; mọi giá trị lấy thẳng từ CSDL, không đi qua LLM."""
    return {
        "slug": sp.get("duongDan"),
        "ten": sp.get("tenSanPham"),
        "gia": sp.get("giaBan"),
        "giaGoc": sp.get("giaGoc"),
        "anh": sp.get("anhChinh"),
        "conHang": sp.get("conHang"),
        "diem": sp.get("diemDanhGiaTB"),
        "mau": [m.get("mauSac") for m in (sp.get("mauSac") or [])][:5],
    }


async def tim_san_pham(tu_khoa=None, gia_tu=None, gia_den=None, kich_co=None, mau_sac=None,
                       giam_gia=None, sap_xep=None, gioi_han: int = 5) -> list[dict]:
    d = await _get(f"{config.SAN_PHAM_URL}/api/san-pham", {
        "tuKhoa": tu_khoa, "giaTu": gia_tu, "giaDen": gia_den, "kichCo": kich_co, "mauSac": mau_sac,
        "giamGia": "true" if giam_gia else None, "sapXep": sap_xep, "kichThuoc": gioi_han,
    })
    return [the_san_pham(x) for x in (d or {}).get("danhSach", [])][:gioi_han]


async def chi_tiet(slug: str) -> dict | None:
    d = await _get(f"{config.SAN_PHAM_URL}/api/san-pham/{slug}")
    if not d:
        return None
    sp = d["sanPham"]
    ton: dict[str, dict[str, int]] = {}
    for b in d.get("bienThe", []):
        ton.setdefault(b["mauSac"], {})[b["kichCo"]] = max(0, int(b.get("conLai") or 0))
    return {
        "the": the_san_pham({**sp, "anhChinh": (d.get("hinhAnh") or [{}])[0].get("duongDanAnh"),
                              "conHang": any(v > 0 for m in ton.values() for v in m.values())}),
        "thuongHieu": sp.get("thuongHieu"), "chatLieu": sp.get("chatLieu"), "moTaNgan": sp.get("moTaNgan"),
        "danhGia": f"{sp.get('diemDanhGiaTB')}/5 ({sp.get('soLuotDanhGia')} lượt)",
        "daBan": sp.get("soLuongDaBan"),
        "tonKhoTheoMauVaSize": ton,   # số lượng còn lại (đã trừ giữ chỗ)
    }


async def ma_giam_gia() -> list[dict]:
    d = await _get(f"{config.DON_HANG_URL}/api/phieu-giam-gia/cong-khai")
    return d if isinstance(d, list) else []


async def ho_so_so_do(authorization: str | None) -> dict | None:
    """Số đo đã lưu trong hồ sơ của khách đang đăng nhập (BFF chuyển Bearer token xuống). None nếu chưa đăng nhập hoặc chưa nhập.
    Chỉ giữ giới tính và size gợi ý; số đo thô không đi tiếp vào LLM."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        r = await _http.get(f"{config.NGUOI_DUNG_URL}/api/nguoi-dung/toi/thong-so", headers={"authorization": authorization})
        if r.status_code != 200:
            return None
        d = r.json()
    except (httpx.HTTPError, ValueError):
        return None
    goi_y = d.get("goiY") or {}
    if not goi_y:
        return None
    return {"gioiTinh": (d.get("thongSo") or {}).get("gioiTinh"), "goiY": goi_y}
