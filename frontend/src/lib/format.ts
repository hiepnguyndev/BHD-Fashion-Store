export const vnd = (n: any) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' ₫';

export function ngayGio(s?: string | null) {
  if (!s) return '';
  const d = new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function ngay(s?: string | null) {
  if (!s) return '';
  const d = new Date(s.endsWith('Z') || /[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export const TRANG_THAI_DON: Record<string, string> = {
  ChoThanhToan: 'Chờ thanh toán', ChoXacNhan: 'Chờ xác nhận', DaXacNhan: 'Đã xác nhận',
  DangGiao: 'Đang giao hàng', DaGiao: 'Đã giao thành công', DaHuy: 'Đã hủy',
};
export const CHUYEN_DON: Record<string, string[]> = {
  ChoThanhToan: ['ChoXacNhan', 'DaHuy'], ChoXacNhan: ['DaXacNhan', 'DaHuy'], DaXacNhan: ['DangGiao', 'DaHuy'],
  DangGiao: ['DaGiao', 'DaHuy'], DaGiao: [], DaHuy: [],
};
export const MAU_TRANG_THAI: Record<string, string> = {
  ChoThanhToan: 'vang', ChoXacNhan: 'vang', DaXacNhan: 'xanh', DangGiao: 'xanh', DaGiao: 'luc', DaHuy: 'do',
  DaThanhToan: 'luc', HetHan: 'do', CanXuLy: 'do', DaHoan: 'xam', ChoXuLy: 'vang',
  ChoDuyet: 'vang', DaDuyet: 'xanh', TuChoi: 'do', DaNhanHang: 'xanh', DaHoanTat: 'luc',
  HoatDong: 'luc', Khoa: 'do', DangBan: 'luc', An: 'xam', NgungBan: 'do', HienThi: 'luc', An_: 'xam',
};
export const TEN_PHUONG_THUC: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)', VietQR: 'Chuyển khoản', SePayGateway: 'Thẻ / ví / QR qua cổng SePay',
};
export const TEN_TT_THANH_TOAN: Record<string, string> = {
  ChoThanhToan: 'Chờ thanh toán', DaThanhToan: 'Đã thanh toán', HetHan: 'Hết hạn', CanXuLy: 'Cần xử lý', DaHoan: 'Đã hoàn tiền',
};
export const TEN_DOI_TRA: Record<string, string> = {
  ChoDuyet: 'Chờ duyệt', DaDuyet: 'Đã duyệt', TuChoi: 'Từ chối', DaNhanHang: 'Đã nhận lại hàng', DaHoanTat: 'Hoàn tất',
};

export const TINH_THANH_PHO = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế', 'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng',
  'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
];


// Chỉ cho phép chuyển hướng sau đăng nhập tới đường dẫn nội bộ (chống open redirect)
export const diaChiTiepHopLe = (s: string | null) => (s && s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : null);

// datetime-local (giờ máy người dùng) <-> chuỗi UTC không kèm múi giờ như CSDL dùng
export function sangUtc(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19);
}
export function sangDatetimeLocal(utc?: string | null): string {
  if (!utc) return '';
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(utc) ? utc : utc + 'Z');
  if (isNaN(d.getTime())) return '';
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}T${hai(d.getHours())}:${hai(d.getMinutes())}`;
}
