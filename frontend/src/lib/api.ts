// Gọi BFF từ trình duyệt.
export class LoiApi extends Error {
  status: number;
  du: any;
  constructor(thongDiep: string, status: number, du?: any) {
    super(thongDiep);
    this.status = status;
    this.du = du;
  }
}

export async function goi<T = any>(duongDan: string, tuyChon: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const { method = 'GET', body, form } = tuyChon;
  let r: Response;
  try {
    r = await fetch(duongDan, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: form ? undefined : body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new LoiApi('Không kết nối được máy chủ. Vui lòng kiểm tra mạng.', 0);
  }
  let du: any = null;
  const text = await r.text();
  if (text) {
    try {
      du = JSON.parse(text);
    } catch {
      du = null;
    }
  }
  if (!r.ok) throw new LoiApi(du?.loi || 'Yêu cầu không thành công.', r.status, du);
  return du as T;
}

export const tenCuaHang = process.env.NEXT_PUBLIC_TEN_CUA_HANG || 'BHD Fashion Store';
