'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DangTai } from '@/components/Chung';
import { useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';

/** Tải dữ liệu từ BFF và cho phép tải lại. */
export function useTai<T = any>(url: string | null) {
  const [du, setDu] = useState<T | null>(null);
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(true);
  const tai = useCallback(async () => {
    if (!url) return;
    setDang(true);
    try { setDu(await goi<T>(url)); setLoi(''); }
    catch (e) { setLoi(e instanceof LoiApi ? e.message : 'Không tải được dữ liệu.'); }
    finally { setDang(false); }
  }, [url]);
  useEffect(() => { tai(); }, [tai]);
  return { du, loi, dang, tai, datDu: setDu };
}

/** Chạy một thao tác ghi, báo kết quả bằng toast. Trả về true nếu thành công. */
export function useThucHien() {
  const toast = useToast();
  return useCallback(async (viec: () => Promise<any>, thanhCong = 'Đã lưu.') => {
    try { const r = await viec(); if (thanhCong) toast(r?.thongBao && thanhCong === 'Đã lưu.' ? r.thongBao : thanhCong, 'ok'); return true; }
    catch (e) { toast(e instanceof LoiApi ? e.message : 'Có lỗi xảy ra.', 'loi'); return false; }
  }, [toast]);
}

export function TrangQuanTri({ tieuDe, hanhDong, children }: { tieuDe: string; hanhDong?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="hang giua-hang" style={{ marginBottom: 18 }}><h1 style={{ margin: 0 }}>{tieuDe}</h1><div className="hang">{hanhDong}</div></div>
      {children}
    </>
  );
}

export function TrangThaiTai({ dang, loi, coDuLieu, children }: { dang: boolean; loi: string; coDuLieu: boolean; children: ReactNode }) {
  if (loi && !coDuLieu) return <div className="thong-bao-loi">{loi}</div>;
  if (dang && !coDuLieu) return <DangTai />;
  return <>{children}</>;
}

export function Truong({ nhan, children, goiY }: { nhan: string; children: ReactNode; goiY?: string }) {
  return <div className="truong"><label>{nhan}</label>{children}{goiY && <span className="goi-y">{goiY}</span>}</div>;
}

export function PhanTrangQT({ trang, tong, kichThuoc, doi }: { trang: number; tong: number; kichThuoc: number; doi: (t: number) => void }) {
  const n = Math.max(1, Math.ceil(tong / kichThuoc));
  if (n <= 1) return null;
  return (
    <div className="phan-trang">
      <button className="chip" disabled={trang <= 1} onClick={() => doi(trang - 1)}>‹</button>
      <span style={{ border: 0, background: 'none' }}>Trang {trang}/{n}</span>
      <button className="chip" disabled={trang >= n} onClick={() => doi(trang + 1)}>›</button>
    </div>
  );
}

/** Ô nhập đường dẫn ảnh kèm nút tải ảnh lên (qua /api/quan-tri/upload-anh). */
export function AnhNhap({ gia, doi }: { gia: string; doi: (v: string) => void }) {
  const toast = useToast();
  const [dang, setDang] = useState(false);
  async function chon(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setDang(true);
    try { const fd = new FormData(); fd.append('tep', f); const r = await goi<any>('/api/quan-tri/upload-anh', { method: 'POST', form: fd }); doi(r.duongDan); }
    catch (er) { toast(er instanceof LoiApi ? er.message : 'Không tải được ảnh.', 'loi'); }
    finally { setDang(false); e.target.value = ''; }
  }
  return (
    <div className="hang" style={{ flexWrap: 'nowrap' }}>
      <input className="o" value={gia} onChange={(e) => doi(e.target.value)} placeholder="/anh/… hoặc https://…" />
      <label className="nut vien nho" style={{ whiteSpace: 'nowrap' }}>{dang ? 'Đang tải…' : 'Tải ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={chon} /></label>
      {gia && /^(\/anh\/|https:\/\/)/.test(gia) && <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 8, overflow: 'hidden', background: 'var(--giay)' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={gia} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
    </div>
  );
}
