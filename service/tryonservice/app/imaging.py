"""Chuẩn hóa ảnh: giải mã an toàn, xoay đúng chiều, xóa EXIF (vị trí GPS...), đưa về khung 3:4 mà mô hình yêu cầu."""
import io

from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 40_000_000   # chặn ảnh "bom" giải nén
RONG, CAO = 768, 1024


class LoiAnh(Exception):
    pass


def mo_anh(du_lieu: bytes) -> Image.Image:
    try:
        im = Image.open(io.BytesIO(du_lieu))
        im.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise LoiAnh("Không đọc được ảnh. Vui lòng dùng ảnh JPG, PNG hoặc WEBP.") from e
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        nen = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        nen.paste(im, mask=im.split()[-1])
        return nen
    return im.convert("RGB")


def ve_khung_3_4(im: Image.Image, cat_neu_rong: bool) -> Image.Image:
    """Đưa về 768x1024 mà không bóp méo.
    Ảnh người: ảnh quá rộng thì cắt hai bên (người thường ở giữa), quá hẹp thì thêm viền hai bên.
    Ảnh áo: giữ nguyên toàn bộ áo, thêm viền trắng cho đủ khung."""
    w, h = im.size
    ti_le = RONG / CAO
    if cat_neu_rong and w / h > ti_le:
        moi_w = int(h * ti_le)
        le = (w - moi_w) // 2
        im = im.crop((le, 0, le + moi_w, h))
    else:
        if w / h > ti_le:
            khung = (w, int(w / ti_le))
        else:
            khung = (int(h * ti_le), h)
        mau = (255, 255, 255) if not cat_neu_rong else tuple(int(x) for x in ImageOps.fit(im, (1, 1)).getpixel((0, 0)))
        nen = Image.new("RGB", khung, mau)
        nen.paste(im, ((khung[0] - w) // 2, (khung[1] - h) // 2))
        im = nen
    return im.resize((RONG, CAO), Image.LANCZOS)


def luu_jpeg(im: Image.Image, duong_dan: str) -> None:
    im.save(duong_dan, "JPEG", quality=92)   # lưu mới hoàn toàn nên không còn metadata gốc
