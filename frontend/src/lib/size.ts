// Ước lượng cỡ (size) Áo/Quần/Giày từ thông số cơ thể, dùng khi khách chưa đăng nhập
// (khi đã đăng nhập, cùng công thức này chạy ở máy chủ UserService và được lưu lại).
export type ThongSoCoThe = { chieuCao?: number; canNang?: number; vongNguc?: number; vongEo?: number; coGiay?: number };
export type GoiYSize = { kichCoAo?: string; kichCoQuan?: string; kichCoGiay?: string };

const ganNhat = (giaTri: number, cacMuc: number[]) => cacMuc.reduce((a, b) => (Math.abs(b - giaTri) < Math.abs(a - giaTri) ? b : a));

export function tinhGoiYSize(ts: ThongSoCoThe): GoiYSize {
  const goiY: GoiYSize = {};
  let vongNguc = ts.vongNguc;
  if (vongNguc == null && ts.canNang) vongNguc = ts.canNang * 0.65 + 52;
  if (vongNguc != null) goiY.kichCoAo = vongNguc <= 87 ? 'S' : vongNguc <= 93 ? 'M' : vongNguc <= 99 ? 'L' : 'XL';

  let vongEo = ts.vongEo;
  if (vongEo == null && ts.canNang) vongEo = ts.canNang * 0.5 + 48;
  if (vongEo != null) goiY.kichCoQuan = String(ganNhat(vongEo / 2.54, [28, 30, 32, 34]));

  if (ts.coGiay != null) goiY.kichCoGiay = String(ganNhat(ts.coGiay, [38, 39, 40, 41, 42, 43]));

  return goiY;
}
