import os

NGUOI_DUNG_URL = os.environ.get("NGUOI_DUNG_URL", "http://nguoidung:8000").rstrip("/")
SAN_PHAM_URL = os.environ.get("SAN_PHAM_URL", "http://sanpham:8080").rstrip("/")
GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://gateway").rstrip("/")   # để tải ảnh sản phẩm dạng /anh/...

# Các Space công khai trên Hugging Face, thử lần lượt (cùng giao diện IDM-VTON). Chỉ dùng được cho mục đích phi thương mại.
SPACES = [s.strip() for s in os.environ.get("THU_DO_SPACES", "yisol/IDM-VTON,Nymbo/Virtual-Try-On").split(",") if s.strip()]
# Token Hugging Face miễn phí (tùy chọn): có token thì hạn mức GPU mỗi ngày cao hơn khách vô danh
HF_TOKEN = os.environ.get("HF_TOKEN", "").strip() or None

DANH_MUC_HO_TRO = {"ao-nam", "ao-nu"}        # IDM-VTON làm tốt nhất với áo (thân trên)
LUOT_MOI_NGAY = int(os.environ.get("THU_DO_LUOT_MOI_NGAY", "5"))
GIU_KET_QUA_PHUT = int(os.environ.get("THU_DO_GIU_KET_QUA_PHUT", "30"))   # xóa ảnh kết quả sau chừng này phút
HANG_DOI_TOI_DA = 8
CHO_TOI_DA_GIAY = 240                         # một lần gọi Space tối đa bao lâu
ANH_TOI_DA_BYTE = 10 * 1024 * 1024
THU_MUC = os.environ.get("THU_MUC_TAM", "/du-lieu")
