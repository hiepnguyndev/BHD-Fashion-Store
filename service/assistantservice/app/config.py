import os

SAN_PHAM_URL = os.environ.get("SAN_PHAM_URL", "http://sanpham:8080").rstrip("/")
NGUOI_DUNG_URL = os.environ.get("NGUOI_DUNG_URL", "http://nguoidung:8000").rstrip("/")
DON_HANG_URL = os.environ.get("DON_HANG_URL", "http://donhang:8080").rstrip("/")
TEN_CUA_HANG = os.environ.get("TEN_CUA_HANG", "BHD Fashion Store")

# Gói miễn phí của Google AI Studio. Để trống = chạy chế độ không LLM (luật + tìm kiếm SQL).
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Giới hạn để không vượt hạn mức miễn phí và chống lạm dụng
TIN_NHAN_TOI_DA = 600            # ký tự mỗi tin nhắn
LICH_SU_TOI_DA = 10              # số tin gần nhất được gửi lên
VONG_CONG_CU_TOI_DA = 4
LUOT_MOI_PHUT = int(os.environ.get("TRO_LY_LUOT_MOI_PHUT", "12"))
LUOT_LLM_MOI_NGAY = int(os.environ.get("TRO_LY_LUOT_LLM_MOI_NGAY", "40"))   # mỗi IP; hết thì tự chuyển về chế độ không LLM
