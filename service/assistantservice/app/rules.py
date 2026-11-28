"""Chế độ không LLM: hiểu câu hỏi bằng luật + tìm kiếm SQL. Chạy được khi chưa có khóa API hoặc khi hết hạn mức."""
import re
import unicodedata

from . import catalog, config
from .policies import CHINH_SACH, LIEN_KET
from .sizing import goi_y_size


def bo_dau(s: str) -> str:
    s = unicodedata.normalize("NFD", s.replace("đ", "d").replace("Đ", "D"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


LOAI_SP = [  # (cụm đã bỏ dấu trong câu hỏi, từ khóa tìm kiếm); cụm cụ thể đứng trước cụm chung
    ("ao thun", "ao thun"), ("polo", "polo"), ("so mi", "so mi"), ("hoodie", "hoodie"), ("ao ni", "ni"),
    ("ao khoac", "ao khoac"), ("ao gio", "ao gio"), ("ao phao", "ao phao"), ("ao len", "ao len"),
    ("vest", "vest"), ("chong nang", "chong nang"), ("giu nhiet", "giu nhiet"),
    ("jean", "jeans"), ("kaki", "kaki"), ("short", "short"), ("quan au", "quan au"), ("quan tay", "quan au"),
    ("chan vay", "chan vay"), ("vay", "vay"), ("dam", "dam"), ("quan", "quan"), ("ao", "ao"),
]
MAU = {"den": "Đen", "trang": "Trắng", "xam": "Xám", "hong": "Hồng", "nau": "Nâu", "kem": "Kem", "tim": "Tím",
       "vang": "Vàng", "xanh": "Xanh", "be": "Be", "cam": "Cam"}
RO_MAU = ("den", "trang", "xam", "hong", "nau", "kem", "tim")   # không dễ nhầm với từ thường
DON_VI = r"(k|nghin|tr|trieu|m)"


def _so_tien(so: str, don_vi: str | None) -> int:
    v = float(so.replace(",", "."))
    if don_vi in ("k", "nghin"):
        return int(v * 1000)
    if don_vi in ("tr", "trieu", "m"):
        return int(v * 1_000_000)
    return int(v * 1000) if v < 10000 else int(v)   # "dưới 400" hiểu là 400k


def trich_bo_loc(cau: str) -> dict:
    t = bo_dau(cau)
    f: dict = {}
    m = re.search(rf"(?:duoi|toi da|khong qua|<)\s*(\d+(?:[.,]\d+)?)\s*{DON_VI}?\b", t)
    if m:
        f["gia_den"] = _so_tien(m.group(1), m.group(2))
    m = re.search(rf"(?:tren|tu|>)\s*(\d+(?:[.,]\d+)?)\s*{DON_VI}\b", t)
    if m:
        f["gia_tu"] = _so_tien(m.group(1), m.group(2))
    m = re.search(r"\bsize\s*(xxl|xl|l|m|s|\d{2})\b", t)
    if m:
        f["kich_co"] = m.group(1).upper()
    m = re.search(r"\bmau\s+(\w+)", t)
    if m and m.group(1) in MAU:
        f["mau_sac"] = MAU[m.group(1)]
    else:
        for k in RO_MAU:
            if re.search(rf"\b{k}\b", t):
                f["mau_sac"] = MAU[k]
                break
    if re.search(r"giam gia|khuyen mai|\bsale\b|uu dai", t):
        f["giam_gia"] = True
    if re.search(r"\bnu\b|phu nu|con gai|\bem gai\b", t):
        f["gioi_tinh"] = "nu"
    elif re.search(r"\bnam\b|dan ong|con trai|ban trai", t):
        f["gioi_tinh"] = "nam"
    for cum, tk in LOAI_SP:
        if re.search(rf"\b{cum}", t):
            f["loai"] = tk
            break
    if re.search(r"re nhat|gia thap", t):
        f["sap_xep"] = "giaTang"
    elif re.search(r"ban chay|\bhot\b|pho bien", t):
        f["sap_xep"] = "banChay"
    return f


def trich_so_do(cau: str) -> dict:
    t = bo_dau(cau)
    kq: dict = {}
    m = re.search(r"\b(\d)\s*m\s*(\d{1,2})\b", t)           # 1m70, 1m7, 1 m 65
    if m:
        so = m.group(2)
        kq["chieu_cao"] = int(m.group(1)) * 100 + (int(so) if len(so) == 2 else int(so) * 10)
    else:
        m = re.search(r"(?:cao|chieu cao)\D{0,6}(\d{3})\b", t) or re.search(r"\b(1\d{2})\s*cm\b", t)
        if m:
            kq["chieu_cao"] = int(m.group(1))
    m = re.search(r"(?:nang|can nang)\D{0,6}(\d{2,3})\b", t) or re.search(r"\b(\d{2,3})\s*(?:kg|ky)\b", t)
    if m:
        kq["can_nang"] = int(m.group(1))
    return kq


def tra_chinh_sach(t: str) -> str | None:
    if re.search(r"doi tra|doi hang|tra hang|hoan tien|hoan hang|bao hanh", t):
        return "doi-tra"
    if re.search(r"van chuyen|giao hang|\bship\b|phi giao|bao lau", t):
        return "van-chuyen"
    if re.search(r"thanh toan|\bcod\b|chuyen khoan|vietqr|sepay", t):
        return "thanh-toan"
    if re.search(r"bao mat|du lieu ca nhan|thong tin ca nhan", t):
        return "bao-mat"
    return None


GOI_Y = ["Áo thun nam dưới 300k", "Váy nữ đang giảm giá", "Mình cao 1m70 nặng 65kg mặc size nào?", "Chính sách đổi trả"]


NHAN_LOC = {"mau_sac": "màu", "kich_co": "size", "gia_den": "mức giá", "gia_tu": "mức giá", "giam_gia": "giảm giá"}


async def tim_theo_bo_loc(f: dict, gioi_han: int = 4) -> tuple[list[dict], list[str]]:
    """Thử từ chặt đến lỏng để không trả về rỗng oan; trả kèm danh sách điều kiện đã phải bỏ để nói thật với khách."""
    tu = " ".join(x for x in (f.get("loai"), f.get("gioi_tinh")) if x) or None
    bo = dict(f)
    da_bo: list[str] = []
    for bo_di in (None, "mau_sac", "kich_co", "gia_den", "gia_tu", "giam_gia"):
        if bo_di and bo_di in bo:
            bo.pop(bo_di)
            da_bo.append(NHAN_LOC[bo_di])
        ds = await catalog.tim_san_pham(tu, bo.get("gia_tu"), bo.get("gia_den"), bo.get("kich_co"), bo.get("mau_sac"),
                                         bo.get("giam_gia"), bo.get("sap_xep"), gioi_han)
        if ds:
            return ds, list(dict.fromkeys(da_bo))
    return [], da_bo


def _kq(reply: str, **them) -> dict:
    return {"reply": reply, "products": [], "links": [], "suggestions": GOI_Y, **them}


CA_NHAN = r"(cua|cho|hop voi|vua voi|dung voi) (minh|toi|em)\b|theo so do|so do cua"
LOAI_QUAN = ("jeans", "kaki", "short", "quan", "quan au")


async def _theo_so_do_da_luu(cau: str, t: str, ho_so: dict) -> dict:
    """Tư vấn theo số đo đã lưu trong hồ sơ: size + sản phẩm còn hàng đúng cỡ."""
    g = ho_so["goiY"]
    f = trich_bo_loc(cau)
    gt = {"Nam": "nam", "Nu": "nu"}.get(ho_so.get("gioiTinh") or "") or f.get("gioi_tinh")
    tom_tat = ", ".join(f"{ten} {g[k]}" for k, ten in (("kichCoAo", "áo"), ("kichCoQuan", "quần"), ("kichCoGiay", "giày")) if g.get(k))
    lk = [{"ten": "Số đo & gợi ý size", "url": "/account/size"}]
    if not gt:
        return _kq(f"Theo số đo bạn đã lưu, size gợi ý của bạn: {tom_tat}. Bạn mua đồ nam hay nữ để mình chọn sản phẩm đúng giới tính nhé? "
                   "(Bạn cũng có thể chọn giới tính trong hồ sơ.)", links=lk)
    loai = f.get("loai")
    nhom = []   # (từ khóa, size)
    if loai:
        la_quan = loai in LOAI_QUAN
        co = g.get("kichCoQuan" if la_quan else "kichCoAo")
        if co:
            nhom.append((" ".join([loai, gt]), co))
    else:
        if g.get("kichCoAo"):
            nhom.append(("ao " + gt, g["kichCoAo"]))
        if g.get("kichCoQuan"):
            nhom.append(("quan " + gt, g["kichCoQuan"]))
    ds: list = []
    for tu, co in nhom:
        ds += await catalog.tim_san_pham(tu, f.get("gia_tu"), f.get("gia_den"), co, f.get("mau_sac"), f.get("giam_gia"),
                                          f.get("sap_xep") or "banChay", 2 if len(nhom) > 1 else 4)
    if ds:
        return _kq(f"Theo số đo bạn đã lưu, size gợi ý của bạn: {tom_tat}. Mình chọn vài sản phẩm còn hàng đúng cỡ này:", products=ds, links=lk)
    return _kq(f"Theo số đo bạn đã lưu, size gợi ý của bạn: {tom_tat}. Hiện mình chưa tìm thấy sản phẩm còn hàng khớp yêu cầu ở cỡ này.", links=lk)


async def tra_loi(cau: str, ho_so: dict | None = None) -> dict:
    t = bo_dau(cau)

    if re.fullmatch(r"\W*(xin chao|chao|hello|hi|alo|hey)( ban| shop| bot)?\W*", t):
        return _kq(f"Chào bạn, mình là trợ lý của {config.TEN_CUA_HANG}. Mình có thể gợi ý sản phẩm, tư vấn size, "
                   "hỏi đáp về đổi trả và vận chuyển. Bạn đang tìm gì ạ?")

    cs = tra_chinh_sach(t)
    if cs:
        return _kq(CHINH_SACH[cs], links=[{"ten": "Xem chính sách đầy đủ", "url": LIEN_KET[cs]}])

    if re.search(r"ma giam gia|voucher|coupon|\bcode\b", t):
        ds = await catalog.ma_giam_gia()
        if ds:
            dong = []
            for p in ds[:5]:
                ma = p.get("maCode") or p.get("MaCode")
                mo_ta = p.get("moTa") or p.get("MoTa") or ""
                dong.append(f"• {ma}" + (f": {mo_ta}" if mo_ta else ""))
            rep = "Các mã giảm giá đang có:\n" + "\n".join(dong)
        else:
            rep = "Hiện chưa có mã giảm giá công khai nào. Bạn xem thêm mục Ưu đãi nhé."
        return _kq(rep, links=[{"ten": "Xem Ưu đãi", "url": "/deals"}])

    if re.search(r"don hang|tra cuu don|ma don|dang giao|van don|toi da dat", t):
        return _kq("Mình chưa xem được đơn hàng trong khung chat này. Bạn tra cứu bằng mã đơn ở trang Tra cứu đơn hàng, "
                   "hoặc đăng nhập để xem trong \"Đơn hàng của tôi\".",
                   links=[{"ten": "Tra cứu đơn hàng", "url": "/track-order"}, {"ten": "Đơn hàng của tôi", "url": "/account/orders"}])

    if re.search(r"nhan vien|tu van vien|hotline|khieu nai|lien he|gap nguoi", t):
        return _kq("Bạn có thể gửi tin nhắn cho nhân viên ở trang Liên hệ, bên mình sẽ phản hồi sớm nhất.",
                   links=[{"ten": "Liên hệ cửa hàng", "url": "/contact"}])

    so = trich_so_do(cau)
    if (so.get("chieu_cao") or so.get("can_nang")) and re.search(r"size|co nao|mac|vua|chon", t):
        g = goi_y_size(chieu_cao=so.get("chieu_cao"), can_nang=so.get("can_nang"))
        if g:
            ph = []
            if g.get("kichCoAo"):
                ph.append(f"áo size {g['kichCoAo']}")
            if g.get("kichCoQuan"):
                ph.append(f"quần size {g['kichCoQuan']}")
            return _kq("Theo số đo bạn cung cấp, mình ước tính bạn hợp " + " và ".join(ph) +
                       ". Đây là gợi ý tham khảo; nếu thích mặc rộng hãy chọn lên một size, hoặc đối chiếu với bảng size.",
                       links=[{"ten": "Số đo & gợi ý size", "url": "/account/size"}])

    if re.search(CA_NHAN, t) and re.search(r"size|co nao|goi y|tu van|nen mua|mac|vua|hop|\bao\b|quan|vay|dam", t):
        if ho_so:
            return await _theo_so_do_da_luu(cau, t, ho_so)
        return _kq("Để tư vấn đúng size cho bạn, hãy điền số đo trong hồ sơ (cần đăng nhập). Sau đó mình sẽ gợi ý size và sản phẩm còn hàng phù hợp. "
                   "Hoặc bạn cứ nhắn chiều cao và cân nặng ngay trong chat nhé.", links=[{"ten": "Điền số đo trong hồ sơ", "url": "/account/size"}])

    f = trich_bo_loc(cau)
    if any(f.get(k) for k in ("loai", "giam_gia", "gia_den", "gia_tu", "mau_sac", "kich_co")):
        ds, da_bo = await tim_theo_bo_loc(f)
        if ds:
            if da_bo:
                return _kq("Chưa có sản phẩm khớp đúng yêu cầu về " + ", ".join(da_bo) + ". Mình gửi bạn vài sản phẩm gần nhất, bạn xem thử nhé:", products=ds)
            return _kq("Mình tìm được vài sản phẩm phù hợp với bạn:", products=ds)
        return _kq("Mình chưa tìm thấy sản phẩm khớp yêu cầu. Bạn thử bỏ bớt điều kiện (màu, mức giá) hoặc đổi từ khóa nhé.")

    return _kq("Mình chưa hiểu rõ ý bạn. Bạn có thể hỏi kiểu: \"áo polo nam dưới 400k\", \"váy đang giảm giá\", "
               "\"cao 1m65 nặng 55kg mặc size nào\" hoặc \"chính sách đổi trả\".")
