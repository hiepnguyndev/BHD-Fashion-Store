// BFF: trình duyệt chỉ nói chuyện với Next.js. Token nằm trong cookie httpOnly, không bao giờ lộ ra JavaScript.
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export const COOKIE = { at: 'tt_at', rt: 'tt_rt', khach: 'tt_khach' };

const CHU_DE = (ten: string, mac: string) => process.env[ten] || mac;
export const dichVu = {
  nguoiDung: () => CHU_DE('NGUOI_DUNG_URL', 'http://localhost:8000'),
  sanPham: () => CHU_DE('SAN_PHAM_URL', 'http://localhost:8081'),
  gioHang: () => CHU_DE('GIO_HANG_URL', 'http://localhost:3001'),
  donHang: () => CHU_DE('DON_HANG_URL', 'http://localhost:8082'),
  thanhToan: () => CHU_DE('THANH_TOAN_URL', 'http://localhost:8083'),
  thongBao: () => CHU_DE('THONG_BAO_URL', 'http://localhost:8084'),
  troLy: () => CHU_DE('TRO_LY_URL', 'http://localhost:8085'),
  thuDo: () => CHU_DE('THU_DO_URL', 'http://localhost:8086'),
};
type Ten = keyof typeof dichVu;

const BANG: [RegExp, Ten][] = [
  [/^\/api\/nguoi-dung(\/|$)/, 'nguoiDung'],
  [/^\/api\/quan-tri\/nguoi-dung(\/|$)/, 'nguoiDung'],
  [/^\/api\/(danh-muc|bo-loc|san-pham|tin-tuc|bo-suu-tap|banner|danh-gia|yeu-thich)(\/|$)/, 'sanPham'],
  [/^\/api\/quan-tri\/(san-pham|bien-the|upload-anh|hinh-anh|kho|danh-muc|bo-suu-tap|danh-gia|banner|tin-tuc)(\/|$)/, 'sanPham'],
  [/^\/api\/gio-hang(\/|$)/, 'gioHang'],
  [/^\/api\/(don-hang|phieu-giam-gia)(\/|$)/, 'donHang'],
  [/^\/api\/quan-tri\/(don-hang|thong-ke|phieu-giam-gia|doi-tra)(\/|$)/, 'donHang'],
  [/^\/api\/thanh-toan(\/|$)/, 'thanhToan'],
  [/^\/api\/quan-tri\/(thanh-toan|hoan-tien|giao-dich-cong)(\/|$)/, 'thanhToan'],
  [/^\/api\/thong-bao(\/|$)/, 'thongBao'],
  [/^\/api\/tro-ly(\/|$)/, 'troLy'],
  [/^\/api\/thu-do(\/|$)/, 'thuDo'],
  [/^\/api\/quan-tri\/nhat-ky-gui(\/|$)/, 'thongBao'],
];
// Các đường dẫn do BFF tự xử lý, không cho gọi thẳng xuống dịch vụ
const CHAN = [/^\/api\/nguoi-dung\/lam-moi$/, /^\/api\/nguoi-dung\/dang-nhap$/, /^\/api\/nguoi-dung\/dang-xuat$/];

export function chonDichVu(duongDan: string): Ten | null {
  if (CHAN.some((r) => r.test(duongDan))) return null;
  for (const [re, ten] of BANG) if (re.test(duongDan)) return ten;
  return null;
}

export const json = (du: unknown, status = 200) =>
  NextResponse.json(du, { status, headers: { 'Cache-Control': 'no-store' } });

// ------------------------------------------------------------------ chống CSRF: yêu cầu ghi phải đến từ chính website
export function kiemTraNguon(req: NextRequest): NextResponse | null {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return null;
  const nguon = req.headers.get('origin');
  if (!nguon) return null;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    if (new URL(nguon).host !== host) return json({ loi: 'Yêu cầu không hợp lệ.' }, 403);
  } catch {
    return json({ loi: 'Yêu cầu không hợp lệ.' }, 403);
  }
  return null;
}

// ------------------------------------------------------------------ cookie
const tuyChon = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge,
});
export type Phien = { accessToken: string; maLamMoi: string; hetHanSau: number; nguoiDung?: any };

export function datPhien(res: NextResponse, p: Phien) {
  res.cookies.set(COOKIE.at, p.accessToken, tuyChon(Math.max(30, p.hetHanSau - 15)));
  res.cookies.set(COOKIE.rt, p.maLamMoi, tuyChon(60 * 60 * 24 * 30));
}
export function xoaPhien(res: NextResponse) {
  res.cookies.set(COOKIE.at, '', { ...tuyChon(0), maxAge: 0 });
  res.cookies.set(COOKIE.rt, '', { ...tuyChon(0), maxAge: 0 });
}

// ------------------------------------------------------------------ làm mới token (một lần cho nhiều yêu cầu song song)
// Mã làm mới chỉ dùng được một lần (xoay vòng). Nhiều yêu cầu song song cùng mang mã cũ sẽ bị coi là bị đánh cắp,
// nên mọi yêu cầu đang chờ dùng chung một kết quả.
const dangLamMoi = new Map<string, { p: Promise<Phien | 'khongHopLe' | null>; het: number }>();

export function lamMoiMotLan(rt: string): Promise<Phien | 'khongHopLe' | null> {
  const bay = Date.now();
  for (const [k, v] of dangLamMoi) if (v.het < bay) dangLamMoi.delete(k);
  const c = dangLamMoi.get(rt);
  if (c) return c.p;
  const p = (async (): Promise<Phien | 'khongHopLe' | null> => {
    try {
      const r = await fetch(dichVu.nguoiDung() + '/api/nguoi-dung/lam-moi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maLamMoi: rt }),
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      if (r.ok) return (await r.json()) as Phien;
      return r.status === 401 || r.status === 403 || r.status === 422 ? 'khongHopLe' : null;
    } catch {
      return null;
    }
  })();
  dangLamMoi.set(rt, { p, het: bay + 30000 });
  return p;
}

// ------------------------------------------------------------------ chuẩn hóa lỗi từ các dịch vụ về { loi }
export function thongDiepLoi(du: any, status: number): string {
  if (du && typeof du === 'object') {
    if (typeof du.loi === 'string') return du.loi;
    if (typeof du.detail === 'string') return du.detail;
    if (Array.isArray(du.detail)) {
      const truong = du.detail.map((d: any) => (Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '')).filter(Boolean);
      return 'Thông tin chưa hợp lệ' + (truong.length ? ` (${[...new Set(truong)].join(', ')})` : '') + '. Vui lòng kiểm tra lại.';
    }
    if (typeof du.title === 'string') return du.title;
    if (typeof du.message === 'string') return du.message;
  }
  if (status === 401) return 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy.';
  if (status === 429) return 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.';
  if (status >= 500) return 'Có lỗi hệ thống. Vui lòng thử lại sau.';
  return 'Yêu cầu không thành công.';
}

export async function docPhanHoi(r: Response): Promise<{ du: any; tho: ArrayBuffer }> {
  const tho = await r.arrayBuffer();
  let du: any = null;
  try {
    du = JSON.parse(new TextDecoder().decode(tho));
  } catch {
    /* không phải JSON */
  }
  return { du, tho };
}

// ------------------------------------------------------------------ chuyển tiếp yêu cầu
const MA_KHACH = /^[A-Za-z0-9_-]{16,64}$/;

export async function chuyenTiep(req: NextRequest, duongDan: string): Promise<NextResponse> {
  const chan = kiemTraNguon(req);
  if (chan) return chan;
  const ten = chonDichVu(duongDan);
  if (!ten) return json({ loi: 'Không tìm thấy.' }, 404);

  const coBody = !['GET', 'HEAD'].includes(req.method);
  const body = coBody ? await req.arrayBuffer() : undefined;
  const loaiNoiDung = req.headers.get('content-type') || undefined;
  const laUpload = /upload-anh/.test(duongDan);

  let at = req.cookies.get(COOKIE.at)?.value;
  const rt = req.cookies.get(COOKIE.rt)?.value;
  let phienMoi: Phien | null = null;
  let hetPhien = false;

  if (!at && rt) {
    const kq = await lamMoiMotLan(rt);
    if (kq && kq !== 'khongHopLe') {
      phienMoi = kq;
      at = kq.accessToken;
    } else if (kq === 'khongHopLe') hetPhien = true;
  }

  let maKhach = req.cookies.get(COOKIE.khach)?.value;
  let khachMoi = false;
  const laGioHang = ten === 'gioHang';
  if (laGioHang && (!maKhach || !MA_KHACH.test(maKhach))) {
    maKhach = randomBytes(24).toString('base64url');
    khachMoi = true;
  }

  const goi = async (token?: string) => {
    const h: Record<string, string> = { accept: 'application/json' };
    if (loaiNoiDung) h['content-type'] = loaiNoiDung;
    if (token) h.authorization = 'Bearer ' + token;
    if (laGioHang && maKhach) h['x-phien-khach'] = maKhach;
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (ip) h['x-forwarded-for'] = ip;
    return fetch(dichVu[ten]() + duongDan + req.nextUrl.search, {
      method: req.method,
      headers: h,
      body: body && body.byteLength ? body : undefined,
      signal: AbortSignal.timeout(laUpload ? 60000 : 20000),
      cache: 'no-store',
    });
  };

  let up: Response;
  try {
    up = await goi(at);
    if (up.status === 401 && rt && !phienMoi && !hetPhien) {
      const kq = await lamMoiMotLan(rt);
      if (kq && kq !== 'khongHopLe') {
        phienMoi = kq;
        up = await goi(kq.accessToken);
      } else if (kq === 'khongHopLe') hetPhien = true;
    }
  } catch {
    return json({ loi: 'Dịch vụ tạm thời không phản hồi. Vui lòng thử lại sau.' }, 503);
  }

  const { du, tho } = await docPhanHoi(up);
  let res: NextResponse;
  if (up.ok) {
    res =
      up.status === 204 || tho.byteLength === 0
        ? new NextResponse(null, { status: up.status, headers: { 'Cache-Control': 'no-store' } })
        : new NextResponse(tho, {
            status: up.status,
            headers: { 'content-type': up.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
          });
    // đặt hàng xong thì dọn giỏ
    if (req.method === 'POST' && /^\/api\/don-hang$/.test(duongDan)) {
      const tokenDung = phienMoi?.accessToken ?? at;
      fetch(dichVu.gioHang() + '/api/gio-hang', {
        method: 'DELETE',
        headers: { ...(tokenDung ? { authorization: 'Bearer ' + tokenDung } : {}), ...(maKhach ? { 'x-phien-khach': maKhach } : {}) },
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }
  } else {
    res = json({ loi: thongDiepLoi(du, up.status), ...(du && typeof du === 'object' && !Array.isArray(du) ? chiGiuTruongPhu(du) : {}) }, up.status);
  }
  if (phienMoi) datPhien(res, phienMoi);
  if (hetPhien && up.status === 401) xoaPhien(res);
  if (khachMoi && maKhach) res.cookies.set(COOKIE.khach, maKhach, tuyChon(60 * 60 * 24 * 60));
  return res;
}

// Một số lỗi kèm dữ liệu bổ sung (ví dụ danh sách dòng hết hàng) nên giữ lại cho giao diện
function chiGiuTruongPhu(du: any) {
  const kq: any = {};
  for (const k of ['dongLoi', 'chiTiet', 'maDonHang', 'maDonHienThi', 'conLai']) if (k in du) kq[k] = du[k];
  return kq;
}
