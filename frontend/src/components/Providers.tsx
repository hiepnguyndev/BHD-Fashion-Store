'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { goi } from '@/lib/api';

// ---------------------------------------------------------------- thông báo nổi
type Toast = { id: number; noiDung: string; kieu: 'ok' | 'loi' | 'tin' };
const ToastCtx = createContext<(noiDung: string, kieu?: Toast['kieu']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- đăng nhập
export type NguoiDung = { maNguoiDung: number; hoTen: string; email: string; soDienThoai?: string | null; vaiTro: string; emailDaXacThuc: boolean };
type AuthCtx = {
  nguoiDung: NguoiDung | null;
  dangTai: boolean;
  dangNhap: (email: string, matKhau: string) => Promise<NguoiDung>;
  dangXuat: () => Promise<void>;
  taiLai: () => Promise<void>;
};
const Auth = createContext<AuthCtx>({ nguoiDung: null, dangTai: true, dangNhap: async () => { throw new Error('x'); }, dangXuat: async () => {}, taiLai: async () => {} });
export const useAuth = () => useContext(Auth);

// ---------------------------------------------------------------- giỏ hàng
export type DongGio = {
  maChiTiet: number; maBienThe: number; soLuong: number; maSanPham: number | null; tenSanPham: string; duongDan: string | null;
  kichCo: string | null; mauSac: string | null; duongDanAnh: string | null; gia: number; conLai: number; thanhTien: number;
  khaDung: boolean; coTheMua: boolean; canhBao: string | null;
};
export type GioHang = { dong: DongGio[]; tongSoLuong: number; tamTinh: number };
const GIO_RONG: GioHang = { dong: [], tongSoLuong: 0, tamTinh: 0 };
type CartCtx = {
  gio: GioHang;
  dangTai: boolean;
  taiLai: () => Promise<void>;
  them: (maBienThe: number, soLuong?: number) => Promise<void>;
  doiSoLuong: (maChiTiet: number, soLuong: number) => Promise<void>;
  xoa: (maChiTiet: number) => Promise<void>;
};
const Cart = createContext<CartCtx>({ gio: GIO_RONG, dangTai: false, taiLai: async () => {}, them: async () => {}, doiSoLuong: async () => {}, xoa: async () => {} });
export const useGio = () => useContext(Cart);

export default function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dem = useRef(0);
  const thongBao = useCallback((noiDung: string, kieu: Toast['kieu'] = 'tin') => {
    const id = ++dem.current;
    setToasts((t) => [...t, { id, noiDung, kieu }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null);
  const [dangTaiAuth, setDangTaiAuth] = useState(true);
  const taiLaiAuth = useCallback(async () => {
    try {
      setNguoiDung(await goi<NguoiDung>('/api/nguoi-dung/toi'));
    } catch {
      setNguoiDung(null);
    } finally {
      setDangTaiAuth(false);
    }
  }, []);
  useEffect(() => { taiLaiAuth(); }, [taiLaiAuth]);

  const [gio, setGio] = useState<GioHang>(GIO_RONG);
  const [dangTaiGio, setDangTaiGio] = useState(false);
  const taiLaiGio = useCallback(async () => {
    try {
      setGio(await goi<GioHang>('/api/gio-hang'));
    } catch {
      /* giữ nguyên */
    }
  }, []);
  useEffect(() => { if (!dangTaiAuth) taiLaiGio(); }, [dangTaiAuth, nguoiDung?.maNguoiDung, taiLaiGio]);

  const auth = useMemo<AuthCtx>(() => ({
    nguoiDung,
    dangTai: dangTaiAuth,
    taiLai: taiLaiAuth,
    dangNhap: async (email, matKhau) => {
      const r = await goi<{ nguoiDung: NguoiDung }>('/api/nguoi-dung/dang-nhap', { method: 'POST', body: { email, matKhau } });
      setNguoiDung(r.nguoiDung);
      return r.nguoiDung;
    },
    dangXuat: async () => {
      try { await goi('/api/nguoi-dung/dang-xuat', { method: 'POST', body: {} }); } catch { /* bỏ qua */ }
      setNguoiDung(null);
      setGio(GIO_RONG);
    },
  }), [nguoiDung, dangTaiAuth, taiLaiAuth]);

  const gioCtx = useMemo<CartCtx>(() => ({
    gio,
    dangTai: dangTaiGio,
    taiLai: taiLaiGio,
    them: async (maBienThe, soLuong = 1) => { setDangTaiGio(true); try { setGio(await goi<GioHang>('/api/gio-hang/them', { method: 'POST', body: { maBienThe, soLuong } })); } finally { setDangTaiGio(false); } },
    doiSoLuong: async (maChiTiet, soLuong) => { setDangTaiGio(true); try { setGio(await goi<GioHang>('/api/gio-hang/chi-tiet/' + maChiTiet, { method: 'PUT', body: { soLuong } })); } finally { setDangTaiGio(false); } },
    xoa: async (maChiTiet) => { setDangTaiGio(true); try { setGio(await goi<GioHang>('/api/gio-hang/chi-tiet/' + maChiTiet, { method: 'DELETE' })); } finally { setDangTaiGio(false); } },
  }), [gio, dangTaiGio, taiLaiGio]);

  return (
    <ToastCtx.Provider value={thongBao}>
      <Auth.Provider value={auth}>
        <Cart.Provider value={gioCtx}>
          {children}
          <div className="thong-bao-noi" role="status" aria-live="polite">
            {toasts.map((t) => <div key={t.id} className={'toast ' + (t.kieu === 'tin' ? '' : t.kieu)}>{t.noiDung}</div>)}
          </div>
        </Cart.Provider>
      </Auth.Provider>
    </ToastCtx.Provider>
  );
}
