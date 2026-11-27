"""Băm mật khẩu (bcrypt), sinh khóa RSA lần đầu, phát và kiểm tra JWT RS256."""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from . import cau_hinh as ch

_khoa_rieng: bytes | None = None
_khoa_cong: bytes | None = None


def bam_mat_khau(mat_khau: str) -> str:
    return bcrypt.hashpw(mat_khau.encode(), bcrypt.gensalt(12)).decode()


def kiem_tra_mat_khau(mat_khau: str, bam: str) -> bool:
    try:
        return bcrypt.checkpw(mat_khau.encode(), bam.encode())
    except ValueError:
        return False


def sha256_hex(chuoi: str) -> str:
    return hashlib.sha256(chuoi.encode()).hexdigest()


def ma_ngau_nhien() -> str:
    return secrets.token_urlsafe(48)


def khoi_tao_khoa() -> None:
    """Tạo cặp khóa RSA vào volume dùng chung nếu chưa có. Các dịch vụ khác chỉ đọc public.pem."""
    global _khoa_rieng, _khoa_cong
    thu_muc = Path(ch.THU_MUC_KHOA)
    thu_muc.mkdir(parents=True, exist_ok=True)
    rieng, cong = thu_muc / "private.pem", thu_muc / "public.pem"
    if not (rieng.exists() and cong.exists()):
        khoa = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        rieng.write_bytes(khoa.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        os.chmod(rieng, 0o600)
        cong.write_bytes(khoa.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
        os.chmod(cong, 0o644)
    _khoa_rieng = rieng.read_bytes()
    _khoa_cong = cong.read_bytes()


def khoa_san_sang() -> bool:
    return _khoa_rieng is not None and _khoa_cong is not None


def tao_access_token(nguoi_dung: dict) -> str:
    bay_gio = datetime.now(timezone.utc)
    noi_dung = {
        "iss": ch.ISSUER,
        "sub": str(nguoi_dung["MaNguoiDung"]),
        "vai_tro": nguoi_dung["VaiTro"],
        "email": nguoi_dung["Email"],
        "ten": nguoi_dung["HoTen"],
        "iat": bay_gio,
        "exp": bay_gio + timedelta(minutes=ch.ACCESS_PHUT),
    }
    return jwt.encode(noi_dung, _khoa_rieng, algorithm="RS256")


def giai_ma_access_token(token: str) -> dict:
    return jwt.decode(token, _khoa_cong, algorithms=["RS256"], issuer=ch.ISSUER,
                      options={"require": ["exp", "sub"]})
