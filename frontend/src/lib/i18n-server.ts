// Dùng trong các trang/ layout chạy ở máy chủ: đọc ngôn ngữ từ cookie.
import { cookies } from 'next/headers';
import { COOKIE_NGON_NGU, chuanHoaNgonNgu, dich, type HamDich, type NgonNgu } from './i18n';

export async function layNgonNgu(): Promise<NgonNgu> {
  return chuanHoaNgonNgu((await cookies()).get(COOKIE_NGON_NGU)?.value);
}

export async function layT(): Promise<{ t: HamDich; lang: NgonNgu }> {
  const lang = await layNgonNgu();
  return { lang, t: (k, p) => dich(lang, k, p) };
}
