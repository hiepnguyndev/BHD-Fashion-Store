// Gọi dịch vụ trực tiếp từ máy chủ Next.js (dùng cho trang hiển thị sản phẩm, không cần đăng nhập).
import { dichVu } from './bff';

export async function layDuLieu<T = any>(ten: keyof typeof dichVu, duongDan: string): Promise<T | null> {
  try {
    const r = await fetch(dichVu[ten]() + duongDan, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
