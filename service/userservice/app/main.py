"""UserService (Python · FastAPI): đăng ký, đăng nhập, phiên, hồ sơ, địa chỉ, quyền riêng tư dữ liệu, quản trị người dùng."""
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from . import security, config as ch
from .db import camel, ket_noi, lay_mot, lay_nhieu, thuc_thi

log = logging.getLogger("nguoidung")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def vong_doi(_: FastAPI):
    security.khoi_tao_khoa()
    yield


app = FastAPI(title="UserService", docs_url=None, redoc_url=None, openapi_url=None, lifespan=vong_doi)

RE_EMAIL = r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$"
RE_SDT = r"^(0|\+84)\d{9,10}$"


def utc_bay_gio() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)  # CSDL lưu UTC dạng naive


def loi(ma: int, noi_dung: str) -> HTTPException:
    return HTTPException(status_code=ma, detail=noi_dung)


# ---------------------------------------------------------------- mô hình dữ liệu vào
class DangKy(BaseModel):
    hoTen: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=RE_EMAIL, max_length=150)
    matKhau: str = Field(min_length=8, max_length=72)
    soDienThoai: str | None = Field(default=None, pattern=RE_SDT)
    dongYChinhSach: bool


class DangNhap(BaseModel):
    email: str = Field(max_length=150)
    matKhau: str = Field(max_length=72)


class LamMoi(BaseModel):
    maLamMoi: str = Field(min_length=20, max_length=200)


class MaXacThucVao(BaseModel):
    ma: str = Field(min_length=20, max_length=200)


class EmailVao(BaseModel):
    email: str = Field(pattern=RE_EMAIL, max_length=150)


class DatLai(BaseModel):
    ma: str = Field(min_length=20, max_length=200)
    matKhauMoi: str = Field(min_length=8, max_length=72)


class CapNhatHoSo(BaseModel):
    hoTen: str = Field(min_length=2, max_length=100)
    soDienThoai: str | None = Field(default=None, pattern=RE_SDT)


class DoiMatKhau(BaseModel):
    matKhauCu: str = Field(max_length=72)
    matKhauMoi: str = Field(min_length=8, max_length=72)


class ThongSoVao(BaseModel):
    chieuCao: int | None = Field(default=None, ge=100, le=230)
    canNang: int | None = Field(default=None, ge=25, le=250)
    vongNguc: int | None = Field(default=None, ge=50, le=160)
    vongEo: int | None = Field(default=None, ge=40, le=160)
    coGiay: float | None = Field(default=None, ge=34, le=46)


class DiaChiVao(BaseModel):
    tenNguoiNhan: str = Field(min_length=2, max_length=100)
    soDienThoai: str = Field(pattern=RE_SDT)
    diaChiCuThe: str = Field(min_length=3, max_length=255)
    maPhuongXa: str | None = Field(default=None, max_length=20)
    phuongXa: str = Field(min_length=1, max_length=100)
    maTinhThanh: str | None = Field(default=None, max_length=20)
    tinhThanh: str = Field(min_length=1, max_length=100)
    macDinh: bool = False


class XoaTaiKhoan(BaseModel):
    matKhau: str = Field(max_length=72)


class QuanTriSua(BaseModel):
    trangThai: str | None = Field(default=None, pattern=r"^(HoatDong|Khoa)$")
    vaiTro: str | None = Field(default=None, pattern=r"^(KhachHang|QuanTri)$")


# ---------------------------------------------------------------- tiện ích
def ip_khach(req: Request) -> str:
    xff = req.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()[:45]
    return (req.client.host if req.client else "")[:45]


_that_bai: dict[str, deque] = defaultdict(deque)
CUA_SO_GIAY, TOI_DA_THAT_BAI = 300, 5


def kiem_tra_gioi_han(khoa: str) -> None:
    hang = _that_bai[khoa]
    gio = time.monotonic()
    while hang and gio - hang[0] > CUA_SO_GIAY:
        hang.popleft()
    if len(hang) >= TOI_DA_THAT_BAI:
        raise loi(429, "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau vài phút.")


def ghi_that_bai(khoa: str) -> None:
    _that_bai[khoa].append(time.monotonic())


def gui_email(mau: str, den: str, du_lieu: dict, ma_tham_chieu: str | None = None) -> None:
    """Gọi NotificationService. Lỗi chỉ ghi log: người dùng có thể bấm gửi lại."""
    try:
        httpx.post(f"{ch.THONG_BAO_URL}/noi-bo/gui-email", timeout=8,
                   headers={"X-Khoa-Noi-Bo": ch.KHOA_NOI_BO},
                   json={"mau": mau, "den": den, "duLieu": du_lieu, "maThamChieu": ma_tham_chieu}
                   ).raise_for_status()
    except Exception as e:  # noqa: BLE001
        log.warning("Không gửi được email %s: %s", mau, e)


def tao_ma_xac_thuc(con, ma_nguoi_dung: int, loai: str, phut: int) -> str:
    ma = security.ma_ngau_nhien()
    thuc_thi(con, "UPDATE dbo.MaXacThuc SET DaDung = 1 WHERE MaNguoiDung = %s AND Loai = %s AND DaDung = 0",
             ma_nguoi_dung, loai)  # mã mới vô hiệu hóa mã cũ
    thuc_thi(con, "INSERT INTO dbo.MaXacThuc (MaNguoiDung, Loai, MaBam, HetHanLuc) VALUES (%s, %s, %s, %s)",
             ma_nguoi_dung, loai, security.sha256_hex(ma), utc_bay_gio() + timedelta(minutes=phut))
    return ma


def dung_ma(con, ma: str, loai: str) -> dict:
    """Đánh dấu mã đã dùng bằng một câu UPDATE nguyên tử; trả về dòng mã hoặc ném 400."""
    cur = con.cursor()
    cur.execute(
        "UPDATE dbo.MaXacThuc SET DaDung = 1 OUTPUT inserted.MaNguoiDung "
        "WHERE MaBam = %s AND Loai = %s AND DaDung = 0 AND HetHanLuc > %s",
        (security.sha256_hex(ma), loai, utc_bay_gio()))
    dong = cur.fetchone()
    cur.close()
    if not dong:
        raise loi(400, "Liên kết không hợp lệ hoặc đã hết hạn.")
    return dong


def phat_phien(con, nguoi_dung: dict, req: Request) -> dict:
    ma_lam_moi = security.ma_ngau_nhien()
    thuc_thi(con,
             "INSERT INTO dbo.PhienDangNhap (MaNguoiDung, MaLamMoiBam, ThietBi, DiaChiIP, HetHanLuc) "
             "VALUES (%s, %s, %s, %s, %s)",
             nguoi_dung["MaNguoiDung"], security.sha256_hex(ma_lam_moi),
             (req.headers.get("user-agent") or "")[:200], ip_khach(req),
             utc_bay_gio() + timedelta(days=ch.REFRESH_NGAY))
    return {
        "accessToken": security.tao_access_token(nguoi_dung),
        "maLamMoi": ma_lam_moi,
        "hetHanSau": ch.ACCESS_PHUT * 60,
        "nguoiDung": ho_so(nguoi_dung),
    }


def ho_so(nd: dict) -> dict:
    return {
        "maNguoiDung": nd["MaNguoiDung"], "hoTen": nd["HoTen"], "email": nd["Email"],
        "soDienThoai": nd["SoDienThoai"], "vaiTro": nd["VaiTro"],
        "emailDaXacThuc": bool(nd["EmailDaXacThuc"]),
    }


def nguoi_dung_hien_tai(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise loi(401, "Bạn chưa đăng nhập.")
    try:
        return security.giai_ma_access_token(authorization[7:].strip())
    except jwt.PyJWTError:
        raise loi(401, "Phiên đăng nhập đã hết hạn.")


def chi_quan_tri(nd: dict = Depends(nguoi_dung_hien_tai)) -> dict:
    if nd.get("vai_tro") != "QuanTri":
        raise loi(403, "Bạn không có quyền thực hiện thao tác này.")
    return nd


def lay_nd_hoat_dong(con, ma: int) -> dict:
    nd = lay_mot(con, "SELECT * FROM dbo.NguoiDung WHERE MaNguoiDung = %s AND TrangThai <> 'DaXoa'", ma)
    if not nd:
        raise loi(401, "Tài khoản không tồn tại.")
    return nd


# ---------------------------------------------------------------- sức khỏe
@app.get("/health")
def suc_khoe():
    if not security.khoa_san_sang():
        raise loi(503, "Chưa sẵn sàng")
    with ket_noi() as con:
        lay_mot(con, "SELECT 1 AS x")
    return {"trangThai": "ok"}


# ---------------------------------------------------------------- xác thực
@app.post("/api/nguoi-dung/dang-ky", status_code=201)
def dang_ky(d: DangKy, nen: BackgroundTasks):
    if not d.dongYChinhSach:
        raise loi(422, "Bạn cần đồng ý Chính sách bảo mật và Điều khoản sử dụng.")
    email = d.email.strip().lower()
    with ket_noi() as con:
        if lay_mot(con, "SELECT 1 AS x FROM dbo.NguoiDung WHERE Email = %s", email):
            raise loi(409, "Email này đã được đăng ký.")
        cur = con.cursor()
        cur.execute(
            "INSERT INTO dbo.NguoiDung (HoTen, Email, SoDienThoai, MatKhauBam, NgayDongYChinhSach, PhienBanChinhSach) "
            "OUTPUT inserted.MaNguoiDung VALUES (%s, %s, %s, %s, %s, %s)",
            (d.hoTen.strip(), email, d.soDienThoai, security.bam_mat_khau(d.matKhau),
             utc_bay_gio(), ch.PHIEN_BAN_CHINH_SACH))
        ma_nd = cur.fetchone()["MaNguoiDung"]
        cur.close()
        ma = tao_ma_xac_thuc(con, ma_nd, "XacThucEmail", 24 * 60)
    nen.add_task(gui_email, "XacThucEmail", email,
                 {"ten": d.hoTen.strip(), "lienKet": f"{ch.WEB_URL}/verify-email?ma={ma}"})
    return {"thongBao": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."}


@app.post("/api/nguoi-dung/dang-nhap")
def dang_nhap(d: DangNhap, req: Request):
    email = d.email.strip().lower()
    khoa = f"{ip_khach(req)}|{email}"
    kiem_tra_gioi_han(khoa)
    with ket_noi() as con:
        nd = lay_mot(con, "SELECT * FROM dbo.NguoiDung WHERE Email = %s AND TrangThai <> 'DaXoa'", email)
        # luôn băm một lần để thời gian phản hồi không lộ email có tồn tại hay không
        dung = security.kiem_tra_mat_khau(d.matKhau, nd["MatKhauBam"] if nd else "$2b$12$" + "a" * 53)
        if not nd or not dung:
            ghi_that_bai(khoa)
            raise loi(401, "Email hoặc mật khẩu không đúng.")
        if nd["TrangThai"] == "Khoa":
            raise loi(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ cửa hàng.")
        _that_bai.pop(khoa, None)
        thuc_thi(con, "UPDATE dbo.NguoiDung SET LanDangNhapCuoi = %s WHERE MaNguoiDung = %s",
                 utc_bay_gio(), nd["MaNguoiDung"])
        return phat_phien(con, nd, req)


@app.post("/api/nguoi-dung/lam-moi")
def lam_moi(d: LamMoi, req: Request):
    bam = security.sha256_hex(d.maLamMoi)
    with ket_noi() as con:
        phien = lay_mot(con, "SELECT * FROM dbo.PhienDangNhap WHERE MaLamMoiBam = %s", bam)
        if not phien:
            raise loi(401, "Phiên đăng nhập không hợp lệ.")
        if phien["DaThuHoi"]:
            # mã đã dùng bị dùng lại: có thể bị đánh cắp -> thu hồi mọi phiên của người này
            thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                          "WHERE MaNguoiDung = %s AND DaThuHoi = 0", utc_bay_gio(), phien["MaNguoiDung"])
            con.commit()
            raise loi(401, "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.")
        if phien["HetHanLuc"] < utc_bay_gio():
            raise loi(401, "Phiên đăng nhập đã hết hạn.")
        da_doi = thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                               "WHERE MaPhien = %s AND DaThuHoi = 0", utc_bay_gio(), phien["MaPhien"])
        if da_doi != 1:
            raise loi(401, "Phiên đăng nhập không hợp lệ.")
        nd = lay_mot(con, "SELECT * FROM dbo.NguoiDung WHERE MaNguoiDung = %s AND TrangThai = 'HoatDong'",
                     phien["MaNguoiDung"])
        if not nd:
            raise loi(401, "Tài khoản không khả dụng.")
        return phat_phien(con, nd, req)


@app.post("/api/nguoi-dung/dang-xuat")
def dang_xuat(d: LamMoi):
    with ket_noi() as con:
        thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                      "WHERE MaLamMoiBam = %s AND DaThuHoi = 0", utc_bay_gio(), security.sha256_hex(d.maLamMoi))
    return {"thongBao": "Đã đăng xuất."}


@app.post("/api/nguoi-dung/xac-thuc-email")
def xac_thuc_email(d: MaXacThucVao):
    with ket_noi() as con:
        dong = dung_ma(con, d.ma, "XacThucEmail")
        thuc_thi(con, "UPDATE dbo.NguoiDung SET EmailDaXacThuc = 1, NgayCapNhat = %s WHERE MaNguoiDung = %s",
                 utc_bay_gio(), dong["MaNguoiDung"])
    return {"thongBao": "Email đã được xác thực."}


@app.post("/api/nguoi-dung/gui-lai-xac-thuc")
def gui_lai_xac_thuc(nen: BackgroundTasks, tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        nd = lay_nd_hoat_dong(con, int(tk["sub"]))
        if nd["EmailDaXacThuc"]:
            return {"thongBao": "Email đã được xác thực."}
        gan_nhat = lay_mot(con, "SELECT TOP 1 NgayTao FROM dbo.MaXacThuc WHERE MaNguoiDung = %s AND Loai = 'XacThucEmail' "
                                "ORDER BY NgayTao DESC", nd["MaNguoiDung"])
        if gan_nhat and (utc_bay_gio() - gan_nhat["NgayTao"]).total_seconds() < 60:
            raise loi(429, "Vui lòng đợi 1 phút trước khi gửi lại.")
        ma = tao_ma_xac_thuc(con, nd["MaNguoiDung"], "XacThucEmail", 24 * 60)
    nen.add_task(gui_email, "XacThucEmail", nd["Email"],
                 {"ten": nd["HoTen"], "lienKet": f"{ch.WEB_URL}/verify-email?ma={ma}"})
    return {"thongBao": "Đã gửi lại email xác thực."}


@app.post("/api/nguoi-dung/quen-mat-khau")
def quen_mat_khau(d: EmailVao, nen: BackgroundTasks, req: Request):
    email = d.email.strip().lower()
    khoa = f"quen|{ip_khach(req)}"
    kiem_tra_gioi_han(khoa)
    ghi_that_bai(khoa)  # mỗi lần yêu cầu tính 1 lượt: tối đa 5 lần / 5 phút / IP
    with ket_noi() as con:
        nd = lay_mot(con, "SELECT * FROM dbo.NguoiDung WHERE Email = %s AND TrangThai = 'HoatDong'", email)
        if nd:
            ma = tao_ma_xac_thuc(con, nd["MaNguoiDung"], "DatLaiMatKhau", 30)
            nen.add_task(gui_email, "DatLaiMatKhau", nd["Email"],
                         {"ten": nd["HoTen"], "lienKet": f"{ch.WEB_URL}/reset-password?ma={ma}"})
    # luôn trả lời giống nhau để không lộ email nào đã đăng ký
    return {"thongBao": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."}


@app.post("/api/nguoi-dung/dat-lai-mat-khau")
def dat_lai_mat_khau(d: DatLai):
    with ket_noi() as con:
        dong = dung_ma(con, d.ma, "DatLaiMatKhau")
        thuc_thi(con, "UPDATE dbo.NguoiDung SET MatKhauBam = %s, NgayCapNhat = %s WHERE MaNguoiDung = %s",
                 security.bam_mat_khau(d.matKhauMoi), utc_bay_gio(), dong["MaNguoiDung"])
        thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                      "WHERE MaNguoiDung = %s AND DaThuHoi = 0", utc_bay_gio(), dong["MaNguoiDung"])
    return {"thongBao": "Đã đặt lại mật khẩu. Vui lòng đăng nhập lại."}


# ---------------------------------------------------------------- hồ sơ của tôi
@app.get("/api/nguoi-dung/toi")
def lay_toi(tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        return ho_so(lay_nd_hoat_dong(con, int(tk["sub"])))


@app.put("/api/nguoi-dung/toi")
def sua_toi(d: CapNhatHoSo, tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        thuc_thi(con, "UPDATE dbo.NguoiDung SET HoTen = %s, SoDienThoai = %s, NgayCapNhat = %s "
                      "WHERE MaNguoiDung = %s AND TrangThai <> 'DaXoa'",
                 d.hoTen.strip(), d.soDienThoai, utc_bay_gio(), int(tk["sub"]))
        return ho_so(lay_nd_hoat_dong(con, int(tk["sub"])))


@app.put("/api/nguoi-dung/toi/mat-khau")
def doi_mat_khau(d: DoiMatKhau, tk: dict = Depends(nguoi_dung_hien_tai)):
    khoa = f"doimk|{tk['sub']}"
    kiem_tra_gioi_han(khoa)
    with ket_noi() as con:
        nd = lay_nd_hoat_dong(con, int(tk["sub"]))
        if not security.kiem_tra_mat_khau(d.matKhauCu, nd["MatKhauBam"]):
            ghi_that_bai(khoa)
            raise loi(400, "Mật khẩu hiện tại không đúng.")
        thuc_thi(con, "UPDATE dbo.NguoiDung SET MatKhauBam = %s, NgayCapNhat = %s WHERE MaNguoiDung = %s",
                 security.bam_mat_khau(d.matKhauMoi), utc_bay_gio(), nd["MaNguoiDung"])
        thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                      "WHERE MaNguoiDung = %s AND DaThuHoi = 0", utc_bay_gio(), nd["MaNguoiDung"])
    return {"thongBao": "Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại."}


# ---------------------------------------------------------------- địa chỉ
@app.get("/api/nguoi-dung/toi/dia-chi")
def ds_dia_chi(tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        return [camel(r) for r in lay_nhieu(
            con, "SELECT * FROM dbo.DiaChi WHERE MaNguoiDung = %s ORDER BY MacDinh DESC, MaDiaChi DESC", int(tk["sub"]))]


def _ghi_dia_chi(con, ma_nd: int, d: DiaChiVao, ma_dia_chi: int | None) -> int:
    dem = lay_mot(con, "SELECT COUNT(*) AS n FROM dbo.DiaChi WHERE MaNguoiDung = %s", ma_nd)["n"]
    mac_dinh = d.macDinh or (dem == 0 and ma_dia_chi is None)
    if mac_dinh:
        thuc_thi(con, "UPDATE dbo.DiaChi SET MacDinh = 0 WHERE MaNguoiDung = %s AND MacDinh = 1", ma_nd)
    tham_so = (d.tenNguoiNhan.strip(), d.soDienThoai, d.diaChiCuThe.strip(), d.maPhuongXa, d.phuongXa.strip(),
               d.maTinhThanh, d.tinhThanh.strip(), 1 if mac_dinh else 0)
    if ma_dia_chi is None:
        if dem >= 20:
            raise loi(400, "Bạn chỉ có thể lưu tối đa 20 địa chỉ.")
        cur = con.cursor()
        cur.execute("INSERT INTO dbo.DiaChi (TenNguoiNhan, SoDienThoai, DiaChiCuThe, MaPhuongXa, PhuongXa, "
                    "MaTinhThanh, TinhThanh, MacDinh, MaNguoiDung) OUTPUT inserted.MaDiaChi "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", tham_so + (ma_nd,))
        ma = cur.fetchone()["MaDiaChi"]
        cur.close()
        return ma
    n = thuc_thi(con, "UPDATE dbo.DiaChi SET TenNguoiNhan=%s, SoDienThoai=%s, DiaChiCuThe=%s, MaPhuongXa=%s, "
                      "PhuongXa=%s, MaTinhThanh=%s, TinhThanh=%s, MacDinh=%s WHERE MaDiaChi=%s AND MaNguoiDung=%s",
                 *tham_so, ma_dia_chi, ma_nd)
    if n == 0:
        raise loi(404, "Không tìm thấy địa chỉ.")
    return ma_dia_chi


@app.post("/api/nguoi-dung/toi/dia-chi", status_code=201)
def them_dia_chi(d: DiaChiVao, tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        ma = _ghi_dia_chi(con, int(tk["sub"]), d, None)
        return camel(lay_mot(con, "SELECT * FROM dbo.DiaChi WHERE MaDiaChi = %s", ma))


@app.put("/api/nguoi-dung/toi/dia-chi/{ma}")
def sua_dia_chi(ma: int, d: DiaChiVao, tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        _ghi_dia_chi(con, int(tk["sub"]), d, ma)
        return camel(lay_mot(con, "SELECT * FROM dbo.DiaChi WHERE MaDiaChi = %s", ma))


@app.delete("/api/nguoi-dung/toi/dia-chi/{ma}")
def xoa_dia_chi(ma: int, tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        if thuc_thi(con, "DELETE FROM dbo.DiaChi WHERE MaDiaChi = %s AND MaNguoiDung = %s", ma, int(tk["sub"])) == 0:
            raise loi(404, "Không tìm thấy địa chỉ.")
    return {"thongBao": "Đã xóa địa chỉ."}


# ---------------------------------------------------------------- thông số cơ thể & gợi ý size
def _gan_nhat(gia_tri: float, cac_muc: list[float]) -> float:
    return min(cac_muc, key=lambda m: abs(m - gia_tri))


def goi_y_size(ts: dict) -> dict:
    """Ước lượng cỡ Áo/Quần/Giày từ thông số cơ thể, dựa trên các cỡ hiện có trong cửa hàng.
    Đây chỉ là gợi ý gần đúng, không thay thế bảng size của từng sản phẩm."""
    goi_y: dict[str, str] = {}
    vong_nguc = ts.get("VongNguc")
    if vong_nguc is None and ts.get("CanNang"):
        vong_nguc = ts["CanNang"] * 0.65 + 52  # ước lượng thô từ cân nặng
    if vong_nguc is not None:
        goi_y["kichCoAo"] = (
            "S" if vong_nguc <= 87 else "M" if vong_nguc <= 93 else "L" if vong_nguc <= 99 else "XL"
        )
    vong_eo = ts.get("VongEo")
    if vong_eo is None and ts.get("CanNang"):
        vong_eo = ts["CanNang"] * 0.5 + 48  # ước lượng thô từ cân nặng
    if vong_eo is not None:
        eo_inch = vong_eo / 2.54
        goi_y["kichCoQuan"] = str(int(_gan_nhat(eo_inch, [28, 30, 32, 34])))
    co_giay = ts.get("CoGiay")
    if co_giay is not None:
        goi_y["kichCoGiay"] = str(int(_gan_nhat(float(co_giay), [38, 39, 40, 41, 42, 43])))
    return goi_y


@app.get("/api/nguoi-dung/toi/thong-so")
def lay_thong_so(tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        ts = lay_mot(con, "SELECT * FROM dbo.ThongSoCoThe WHERE MaNguoiDung = %s", int(tk["sub"])) or {}
    ts.pop("MaNguoiDung", None)
    return {"thongSo": camel(ts), "goiY": goi_y_size(ts)}


@app.put("/api/nguoi-dung/toi/thong-so")
def luu_thong_so(d: ThongSoVao, tk: dict = Depends(nguoi_dung_hien_tai)):
    ma_nd = int(tk["sub"])
    with ket_noi() as con:
        if lay_mot(con, "SELECT 1 AS x FROM dbo.ThongSoCoThe WHERE MaNguoiDung = %s", ma_nd):
            thuc_thi(con, "UPDATE dbo.ThongSoCoThe SET ChieuCao=%s, CanNang=%s, VongNguc=%s, VongEo=%s, "
                          "CoGiay=%s, NgayCapNhat=%s WHERE MaNguoiDung=%s",
                     d.chieuCao, d.canNang, d.vongNguc, d.vongEo, d.coGiay, utc_bay_gio(), ma_nd)
        else:
            thuc_thi(con, "INSERT INTO dbo.ThongSoCoThe (MaNguoiDung, ChieuCao, CanNang, VongNguc, VongEo, CoGiay) "
                          "VALUES (%s, %s, %s, %s, %s, %s)",
                     ma_nd, d.chieuCao, d.canNang, d.vongNguc, d.vongEo, d.coGiay)
        ts = lay_mot(con, "SELECT * FROM dbo.ThongSoCoThe WHERE MaNguoiDung = %s", ma_nd) or {}
    ts.pop("MaNguoiDung", None)
    return {"thongSo": camel(ts), "goiY": goi_y_size(ts)}


# ---------------------------------------------------------------- quyền về dữ liệu cá nhân
@app.get("/api/nguoi-dung/toi/xuat-du-lieu")
def xuat_du_lieu(tk: dict = Depends(nguoi_dung_hien_tai)):
    with ket_noi() as con:
        nd = lay_nd_hoat_dong(con, int(tk["sub"]))
        dia_chi = lay_nhieu(con, "SELECT * FROM dbo.DiaChi WHERE MaNguoiDung = %s", nd["MaNguoiDung"])
        phien = lay_nhieu(con, "SELECT ThietBi, DiaChiIP, NgayTao, HetHanLuc, DaThuHoi FROM dbo.PhienDangNhap "
                               "WHERE MaNguoiDung = %s ORDER BY NgayTao DESC", nd["MaNguoiDung"])
        thong_so = lay_mot(con, "SELECT ChieuCao, CanNang, VongNguc, VongEo, CoGiay FROM dbo.ThongSoCoThe "
                                "WHERE MaNguoiDung = %s", nd["MaNguoiDung"])
    nd = {k: v for k, v in nd.items() if k != "MatKhauBam"}
    return {"taiKhoan": camel(nd), "diaChi": [camel(r) for r in dia_chi], "phienDangNhap": [camel(r) for r in phien],
            "thongSoCoThe": camel(thong_so) if thong_so else None,
            "ghiChu": "Đơn hàng được lưu ở dịch vụ đơn hàng; xem mục Đơn hàng của tôi."}


@app.delete("/api/nguoi-dung/toi")
def xoa_tai_khoan(d: XoaTaiKhoan, tk: dict = Depends(nguoi_dung_hien_tai)):
    """Ẩn danh hóa: xóa thông tin định danh, giữ khóa chính để đơn hàng cũ (lưu theo luật kế toán) không bị mồ côi."""
    with ket_noi() as con:
        nd = lay_nd_hoat_dong(con, int(tk["sub"]))
        if not security.kiem_tra_mat_khau(d.matKhau, nd["MatKhauBam"]):
            raise loi(400, "Mật khẩu không đúng.")
        if nd["VaiTro"] == "QuanTri":
            con_lai = lay_mot(con, "SELECT COUNT(*) AS n FROM dbo.NguoiDung WHERE VaiTro = 'QuanTri' "
                                   "AND TrangThai = 'HoatDong' AND MaNguoiDung <> %s", nd["MaNguoiDung"])["n"]
            if con_lai == 0:
                raise loi(400, "Bạn là quản trị viên duy nhất, không thể xóa tài khoản.")
        ma = nd["MaNguoiDung"]
        thuc_thi(con, "UPDATE dbo.NguoiDung SET HoTen = N'Người dùng đã xóa', Email = %s, SoDienThoai = NULL, "
                      "MatKhauBam = %s, TrangThai = 'DaXoa', EmailDaXacThuc = 0, VaiTro = 'KhachHang', "
                      "NgayCapNhat = %s WHERE MaNguoiDung = %s",
                 f"daxoa+{ma}@xoa.invalid", security.bam_mat_khau(security.ma_ngau_nhien()), utc_bay_gio(), ma)
        thuc_thi(con, "DELETE FROM dbo.DiaChi WHERE MaNguoiDung = %s", ma)
        thuc_thi(con, "DELETE FROM dbo.ThongSoCoThe WHERE MaNguoiDung = %s", ma)
        thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s WHERE MaNguoiDung = %s AND DaThuHoi = 0",
                 utc_bay_gio(), ma)
        thuc_thi(con, "DELETE FROM dbo.MaXacThuc WHERE MaNguoiDung = %s", ma)
    return {"thongBao": "Tài khoản đã được xóa."}


# ---------------------------------------------------------------- quản trị
@app.get("/api/quan-tri/nguoi-dung")
def qt_ds_nguoi_dung(tuKhoa: str = "", trang: int = Query(1, ge=1), kichThuoc: int = Query(20, ge=1, le=100),
                     _: dict = Depends(chi_quan_tri)):
    mau = f"%{tuKhoa.strip()}%"
    with ket_noi() as con:
        tong = lay_mot(con, "SELECT COUNT(*) AS n FROM dbo.NguoiDung WHERE TrangThai <> 'DaXoa' "
                            "AND (Email LIKE %s OR HoTen LIKE %s OR SoDienThoai LIKE %s)", mau, mau, mau)["n"]
        ds = lay_nhieu(con, "SELECT MaNguoiDung, HoTen, Email, SoDienThoai, VaiTro, TrangThai, EmailDaXacThuc, "
                            "LanDangNhapCuoi, NgayTao FROM dbo.NguoiDung WHERE TrangThai <> 'DaXoa' "
                            "AND (Email LIKE %s OR HoTen LIKE %s OR SoDienThoai LIKE %s) "
                            "ORDER BY MaNguoiDung DESC OFFSET %s ROWS FETCH NEXT %s ROWS ONLY",
                       mau, mau, mau, (trang - 1) * kichThuoc, kichThuoc)
    return {"tong": tong, "trang": trang, "kichThuoc": kichThuoc, "danhSach": [camel(r) for r in ds]}


@app.patch("/api/quan-tri/nguoi-dung/{ma}")
def qt_sua_nguoi_dung(ma: int, d: QuanTriSua, tk: dict = Depends(chi_quan_tri)):
    if ma == int(tk["sub"]):
        raise loi(400, "Không thể tự thay đổi quyền hoặc trạng thái của chính mình.")
    if d.trangThai is None and d.vaiTro is None:
        raise loi(422, "Không có gì để cập nhật.")
    with ket_noi() as con:
        if d.trangThai:
            thuc_thi(con, "UPDATE dbo.NguoiDung SET TrangThai = %s, NgayCapNhat = %s WHERE MaNguoiDung = %s "
                          "AND TrangThai <> 'DaXoa'", d.trangThai, utc_bay_gio(), ma)
            if d.trangThai == "Khoa":
                thuc_thi(con, "UPDATE dbo.PhienDangNhap SET DaThuHoi = 1, ThuHoiLuc = %s "
                              "WHERE MaNguoiDung = %s AND DaThuHoi = 0", utc_bay_gio(), ma)
        if d.vaiTro:
            thuc_thi(con, "UPDATE dbo.NguoiDung SET VaiTro = %s, NgayCapNhat = %s WHERE MaNguoiDung = %s "
                          "AND TrangThai <> 'DaXoa'", d.vaiTro, utc_bay_gio(), ma)
        nd = lay_mot(con, "SELECT MaNguoiDung, HoTen, Email, VaiTro, TrangThai FROM dbo.NguoiDung WHERE MaNguoiDung = %s", ma)
        if not nd:
            raise loi(404, "Không tìm thấy người dùng.")
    return camel(nd)
