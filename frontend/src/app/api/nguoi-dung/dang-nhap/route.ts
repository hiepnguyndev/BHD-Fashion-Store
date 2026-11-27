import { NextRequest } from 'next/server';
import { COOKIE, datPhien, dichVu, docPhanHoi, json, kiemTraNguon, thongDiepLoi, type Phien } from '@/lib/bff';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const chan = kiemTraNguon(req);
  if (chan) return chan;
  let up: Response;
  try {
    up = await fetch(dichVu.nguoiDung() + '/api/nguoi-dung/dang-nhap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(req.headers.get('x-real-ip') ? { 'x-forwarded-for': req.headers.get('x-real-ip')! } : {}),
      },
      body: await req.text(),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch {
    return json({ loi: 'Dịch vụ tạm thời không phản hồi. Vui lòng thử lại sau.' }, 503);
  }
  const { du } = await docPhanHoi(up);
  if (!up.ok) return json({ loi: thongDiepLoi(du, up.status) }, up.status);
  const p = du as Phien;
  const res = json({ nguoiDung: p.nguoiDung });
  datPhien(res, p);
  // gộp giỏ hàng của khách vào giỏ của tài khoản
  const khach = req.cookies.get(COOKIE.khach)?.value;
  if (khach) {
    try {
      await fetch(dichVu.gioHang() + '/api/gio-hang/gop', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + p.accessToken, 'x-phien-khach': khach },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
    } catch {
      /* không gộp được thì giữ nguyên giỏ khách */
    }
    res.cookies.set(COOKIE.khach, '', { path: '/', maxAge: 0 });
  }
  return res;
}
