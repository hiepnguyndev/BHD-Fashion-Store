import { NextRequest } from 'next/server';
import { COOKIE, dichVu, json, kiemTraNguon, xoaPhien } from '@/lib/bff';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const chan = kiemTraNguon(req);
  if (chan) return chan;
  const rt = req.cookies.get(COOKIE.rt)?.value;
  if (rt) {
    try {
      await fetch(dichVu.nguoiDung() + '/api/nguoi-dung/dang-xuat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maLamMoi: rt }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
    } catch {
      /* vẫn xóa cookie ở trình duyệt */
    }
  }
  const res = json({ thongBao: 'Đã đăng xuất.' });
  xoaPhien(res);
  return res;
}
