import os


def _bat_buoc(ten: str) -> str:
    gia_tri = os.environ.get(ten)
    if not gia_tri:
        raise RuntimeError(f"Thiếu biến môi trường {ten}")
    return gia_tri


DB_HOST = os.environ.get("DB_HOST", "sqlserver")
DB_PORT = int(os.environ.get("DB_PORT", "1433"))
DB_NAME = os.environ.get("DB_NAME", "ThoiTrang_NguoiDung")
DB_USER = os.environ.get("DB_USER", "dv_nguoidung")
DB_PASSWORD = _bat_buoc("DB_PASSWORD")
KHOA_NOI_BO = _bat_buoc("KHOA_NOI_BO")

THU_MUC_KHOA = os.environ.get("THU_MUC_KHOA", "/khoa")
ISSUER = "thoitrang-nguoidung"
ACCESS_PHUT = int(os.environ.get("ACCESS_PHUT", "15"))
REFRESH_NGAY = int(os.environ.get("REFRESH_NGAY", "14"))

WEB_URL = os.environ.get("WEB_URL", "http://localhost:8080").rstrip("/")
THONG_BAO_URL = os.environ.get("THONG_BAO_URL", "http://thongbao:8080").rstrip("/")
TEN_CUA_HANG = os.environ.get("TEN_CUA_HANG", "BHD Fashion Store")
PHIEN_BAN_CHINH_SACH = os.environ.get("PHIEN_BAN_CHINH_SACH", "2026-07")
