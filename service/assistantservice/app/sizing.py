"""Gợi ý cỡ từ số đo. Dùng khi khách gõ số đo ngay trong chat; số đo đã lưu trong hồ sơ do userservice tính (nguoidung)."""


def _gan_nhat(v: float, muc: list[int]) -> int:
    return min(muc, key=lambda m: abs(m - v))


def goi_y_size(chieu_cao=None, can_nang=None, vong_nguc=None, vong_eo=None, co_giay=None) -> dict:
    kq: dict = {}
    if vong_nguc is None and can_nang:
        vong_nguc = can_nang * 0.65 + 52
    if vong_nguc is not None:
        kq["kichCoAo"] = "S" if vong_nguc <= 87 else "M" if vong_nguc <= 93 else "L" if vong_nguc <= 99 else "XL"
    if vong_eo is None and can_nang:
        vong_eo = can_nang * 0.5 + 48
    if vong_eo is not None:
        kq["kichCoQuan"] = str(_gan_nhat(vong_eo / 2.54, [28, 29, 30, 31, 32, 33, 34]))
    if co_giay is not None:
        kq["kichCoGiay"] = str(_gan_nhat(co_giay, [38, 39, 40, 41, 42, 43]))
    return kq
