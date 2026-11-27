'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { goi, tenCuaHang } from '@/lib/api';
import { ngayGio } from '@/lib/format';
import { useAuth, useGio } from './Providers';
import Logo from './Logo';

export default function Header({ danhMuc }: { danhMuc: { maDanhMuc: number; maDanhMucCha: number | null; tenDanhMuc: string; duongDan: string }[] }) {
  const { nguoiDung, dangXuat } = useAuth();
  const { gio } = useGio();
  const router = useRouter();
  const duongDan = usePathname();
  const [cuon, setCuon] = useState(false);
  const [nay, setNay] = useState(false);
  const gioTruoc = useRef(0);
  const [moMenu, setMoMenu] = useState(false);
  const [moTK, setMoTK] = useState(false);
  const [moTB, setMoTB] = useState(false);
  const [tb, setTb] = useState<{ chuaDoc: number; danhSach: any[] }>({ chuaDoc: 0, danhSach: [] });
  const refTK = useRef<HTMLDivElement>(null);
  const refTB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nguoiDung) { setTb({ chuaDoc: 0, danhSach: [] }); return; }
    let con = true;
    const tai = () => goi('/api/thong-bao').then((d) => con && setTb(d)).catch(() => {});
    tai();
    const t = setInterval(tai, 60000);
    return () => { con = false; clearInterval(t); };
  }, [nguoiDung]);

  useEffect(() => {
    const dong = (e: MouseEvent) => {
      if (refTK.current && !refTK.current.contains(e.target as Node)) setMoTK(false);
      if (refTB.current && !refTB.current.contains(e.target as Node)) setMoTB(false);
    };
    document.addEventListener('mousedown', dong);
    return () => document.removeEventListener('mousedown', dong);
  }, []);

  useEffect(() => {
    const k = () => setCuon(window.scrollY > 12);
    k();
    window.addEventListener('scroll', k, { passive: true });
    return () => window.removeEventListener('scroll', k);
  }, []);
  useEffect(() => {
    if (gio.tongSoLuong > gioTruoc.current) { setNay(true); const t = setTimeout(() => setNay(false), 500); gioTruoc.current = gio.tongSoLuong; return () => clearTimeout(t); }
    gioTruoc.current = gio.tongSoLuong;
  }, [gio.tongSoLuong]);

  const goc = danhMuc.filter((d) => !d.maDanhMucCha);
  async function docTatCa() {
    await goi('/api/thong-bao/da-doc-tat-ca', { method: 'POST', body: {} }).catch(() => {});
    setTb((t) => ({ chuaDoc: 0, danhSach: t.danhSach.map((x) => ({ ...x, daDoc: true })) }));
  }

  return (
    <header className={'dau-trang' + (cuon ? ' cuon' : '')}>
      <div className="khung">
        <button className="nut-icon cuon-menu" aria-label="Mở menu" onClick={() => setMoMenu((v) => !v)}>☰</button>
        <Link href="/" className="logo" aria-label={tenCuaHang}><Logo /></Link>
        <nav className={'menu-chinh' + (moMenu ? ' mo' : '')} onClick={() => setMoMenu(false)}>
          <Link href="/" className={duongDan === '/' ? 'dang' : ''}>Trang chủ</Link>
          <div className="nhom">
            <Link href="/san-pham" className={duongDan.startsWith('/san-pham') ? 'dang' : ''}>Danh mục ▾</Link>
            <div className="hop">
              <Link href="/san-pham">Tất cả sản phẩm</Link>
              {goc.map((d) => <Link key={d.maDanhMuc} href={'/san-pham?danhMuc=' + d.duongDan}>{d.tenDanhMuc}</Link>)}
            </div>
          </div>
          <Link href="/uu-dai" className={duongDan.startsWith('/uu-dai') ? 'dang' : ''}>Ưu đãi</Link>
          <Link href="/lien-he" className={duongDan.startsWith('/lien-he') ? 'dang' : ''}>Liên hệ</Link>
        </nav>
        <form className="o-tim" role="search" onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') || '').trim(); router.push('/san-pham' + (q ? '?tuKhoa=' + encodeURIComponent(q) : '')); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input name="q" placeholder="Tìm sản phẩm…" aria-label="Tìm sản phẩm" maxLength={80} />
        </form>
        <div className="cum-nut">
          {nguoiDung && (
            <div className={'tha-xuong' + (moTB ? ' mo' : '')} ref={refTB}>
              <button className="nut-icon" aria-label="Thông báo" onClick={() => setMoTB((v) => !v)}>
                🔔{tb.chuaDoc > 0 && <span className="huy-hieu">{tb.chuaDoc}</span>}
              </button>
              <div className="hop rong">
                <div className="hang giua-hang" style={{ padding: '6px 12px' }}><b>Thông báo</b>{tb.chuaDoc > 0 && <button className="nut-chu nho" style={{ width: 'auto', padding: 0 }} onClick={docTatCa}>Đánh dấu đã đọc</button>}</div>
                {tb.danhSach.length === 0 && <div className="mo nho" style={{ padding: 14 }}>Chưa có thông báo.</div>}
                {tb.danhSach.map((t) => (
                  <Link key={t.maThongBao} href={t.lienKet || '/tai-khoan/don-hang'} className={'tb-muc' + (t.daDoc ? '' : ' chua-doc')}
                    onClick={() => { setMoTB(false); if (!t.daDoc) goi(`/api/thong-bao/${t.maThongBao}/da-doc`, { method: 'POST', body: {} }).catch(() => {}); }}>
                    <b className="nho">{t.tieuDe}</b>
                    {t.noiDung && <div className="nho mo">{t.noiDung}</div>}
                    <div className="nho mo">{ngayGio(t.ngayTao)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Link href="/gio-hang" className="nut-icon" aria-label="Giỏ hàng">
            🛍{gio.tongSoLuong > 0 && <span className={'huy-hieu' + (nay ? ' nay' : '')}>{gio.tongSoLuong}</span>}
          </Link>
          <div className={'tha-xuong' + (moTK ? ' mo' : '')} ref={refTK}>
            <button className="nut-icon" aria-label="Tài khoản" onClick={() => setMoTK((v) => !v)}>👤</button>
            <div className="hop" onClick={() => setMoTK(false)}>
              {nguoiDung ? (
                <>
                  <div style={{ padding: '8px 12px' }}><b>{nguoiDung.hoTen}</b><div className="nho mo">{nguoiDung.email}</div></div>
                  <Link href="/tai-khoan">Tài khoản của tôi</Link>
                  <Link href="/tai-khoan/don-hang">Đơn hàng của tôi</Link>
                  <Link href="/tai-khoan/yeu-thich">Sản phẩm yêu thích</Link>
                  {nguoiDung.vaiTro === 'QuanTri' && <Link href="/quan-tri">Trang quản trị</Link>}
                  <button onClick={async () => { await dangXuat(); router.push('/'); router.refresh(); }}>Đăng xuất</button>
                </>
              ) : (
                <>
                  <Link href="/dang-nhap">Đăng nhập</Link>
                  <Link href="/dang-ky">Tạo tài khoản</Link>
                  <Link href="/tra-cuu-don-hang">Tra cứu đơn hàng</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
