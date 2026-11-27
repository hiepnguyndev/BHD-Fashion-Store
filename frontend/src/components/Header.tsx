'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { goi, tenCuaHang } from '@/lib/api';
import { ngayGio, vnd } from '@/lib/format';
import { useAuth, useGio, useLang, useT } from './Providers';
import { IconBag, IconBell, IconGlobe, IconMenu, IconMoon, IconSearch, IconSun, IconUser } from './Icons';
import { KHOA_GIAO_DIEN } from '@/lib/i18n';
import Logo from './Logo';

export default function Header({ danhMuc }: { danhMuc: { maDanhMuc: number; maDanhMucCha: number | null; tenDanhMuc: string; duongDan: string }[] }) {
  const { nguoiDung, dangXuat } = useAuth();
  const { gio } = useGio();
  const t = useT();
  const { lang, datNgonNgu } = useLang();
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
  const refTim = useRef<HTMLFormElement>(null);
  const [tu, setTu] = useState('');
  const [goiY, setGoiY] = useState<any[]>([]);
  const [daTim, setDaTim] = useState(false);
  const [moGoiY, setMoGoiY] = useState(false);
  const [chon, setChon] = useState(-1);

  useEffect(() => {
    const q = tu.trim();
    if (q.length < 2) { setGoiY([]); setDaTim(false); return; }
    let con = true;
    const h = setTimeout(() => {
      goi('/api/san-pham?kichThuoc=6&tuKhoa=' + encodeURIComponent(q)).then((d) => { if (con) { setGoiY(d.danhSach ?? []); setDaTim(true); } }).catch(() => { if (con) { setGoiY([]); setDaTim(false); } });
    }, 250);
    return () => { con = false; clearTimeout(h); };
  }, [tu]);

  function timKiem(sp: any | null) {
    setMoGoiY(false);
    const q = tu.trim();
    if (sp) router.push('/products/' + sp.duongDan);
    else router.push('/products' + (q ? '?tuKhoa=' + encodeURIComponent(q) : ''));
  }
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
      if (refTim.current && !refTim.current.contains(e.target as Node)) setMoGoiY(false);
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

  function doiGiaoDien() {
    const hienTai = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const moi = hienTai === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = moi;
    try { localStorage.setItem(KHOA_GIAO_DIEN, moi); } catch { /* bỏ qua */ }
  }

  const goc = danhMuc.filter((d) => !d.maDanhMucCha);
  async function docTatCa() {
    await goi('/api/thong-bao/da-doc-tat-ca', { method: 'POST', body: {} }).catch(() => {});
    setTb((c) => ({ chuaDoc: 0, danhSach: c.danhSach.map((x) => ({ ...x, daDoc: true })) }));
  }

  return (
    <header className={'dau-trang' + (cuon ? ' cuon' : '')}>
      <div className="khung">
        <button className="nut-icon cuon-menu" aria-label={t('Mở menu')} aria-expanded={moMenu} onClick={() => setMoMenu((v) => !v)}><IconMenu /></button>
        <Link href="/" className="logo" aria-label={tenCuaHang}><Logo /></Link>
        <nav className={'menu-chinh' + (moMenu ? ' mo' : '')} onClick={() => setMoMenu(false)}>
          <Link href="/" className={duongDan === '/' ? 'dang' : ''}>{t('Trang chủ')}</Link>
          <div className="nhom">
            <Link href="/products" className={duongDan.startsWith('/products') ? 'dang' : ''}>{t('Danh mục')} ▾</Link>
            <div className="hop">
              <Link href="/products">{t('Tất cả sản phẩm')}</Link>
              {goc.map((d) => (
                <div key={d.maDanhMuc}>
                  <Link href={'/products?danhMuc=' + d.duongDan}><b>{d.tenDanhMuc}</b></Link>
                  {danhMuc.filter((c) => c.maDanhMucCha === d.maDanhMuc).map((c) => <Link key={c.maDanhMuc} href={'/products?danhMuc=' + c.duongDan} style={{ paddingLeft: 24 }}>{c.tenDanhMuc}</Link>)}
                </div>
              ))}
            </div>
          </div>
          <div className="nhom">
            <Link href="/deals" className={duongDan.startsWith('/deals') ? 'dang' : ''}>{t('Ưu đãi')} ▾</Link>
            <div className="hop">
              <Link href="/products?giamGia=true">{t('Sản phẩm đang giảm giá')}</Link>
              <Link href="/deals#ma-giam-gia">{t('Mã giảm giá')}</Link>
            </div>
          </div>
          <Link href="/news" className={duongDan.startsWith('/news') ? 'dang' : ''}>{t('Tin tức')}</Link>
          <Link href="/contact" className={duongDan.startsWith('/contact') ? 'dang' : ''}>{t('Liên hệ')}</Link>
        </nav>
        <form className="o-tim" role="search" ref={refTim} onSubmit={(e) => { e.preventDefault(); timKiem(chon >= 0 && goiY[chon] ? goiY[chon] : null); }}>
          <IconSearch size={18} />
          <input name="q" value={tu} autoComplete="off" placeholder={t('Tìm áo thun, quần jeans, váy…')} aria-label={t('Tìm sản phẩm')} maxLength={80}
            role="combobox" aria-expanded={moGoiY} aria-controls="goi-y-tim-kiem"
            onChange={(e) => { setTu(e.target.value); setMoGoiY(true); setChon(-1); }} onFocus={() => setMoGoiY(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMoGoiY(false);
              else if (e.key === 'ArrowDown' && goiY.length) { e.preventDefault(); setMoGoiY(true); setChon((c) => (c + 1) % goiY.length); }
              else if (e.key === 'ArrowUp' && goiY.length) { e.preventDefault(); setChon((c) => (c <= 0 ? goiY.length - 1 : c - 1)); }
            }} />
          {moGoiY && tu.trim().length >= 2 && (goiY.length > 0 || daTim) && (
            <div className="goi-y" id="goi-y-tim-kiem" role="listbox">
              {goiY.length === 0 ? <div className="mo nho" style={{ padding: 12 }}>{t('Không có sản phẩm phù hợp.')}</div> : (
                <>
                  {goiY.map((s, i) => (
                    <Link key={s.maSanPham} href={'/products/' + s.duongDan} role="option" aria-selected={i === chon} className={i === chon ? 'chon' : ''} onClick={() => setMoGoiY(false)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.anhChinh && <img src={s.anhChinh} alt="" />}
                      <span className="ten">{s.tenSanPham}</span><span className="gia">{vnd(s.giaBan)}</span>
                    </Link>
                  ))}
                  <Link href={'/products?tuKhoa=' + encodeURIComponent(tu.trim())} className="tat-ca" onClick={() => setMoGoiY(false)}>{t('Xem tất cả kết quả')}</Link>
                </>
              )}
            </div>
          )}
        </form>
        <div className="cum-nut">
          {nguoiDung && (
            <div className={'tha-xuong' + (moTB ? ' mo' : '')} ref={refTB}>
              <button className="nut-icon" aria-label={t('Thông báo')} onClick={() => setMoTB((v) => !v)}>
                <IconBell />{tb.chuaDoc > 0 && <span className="huy-hieu">{tb.chuaDoc}</span>}
              </button>
              <div className="hop rong">
                <div className="hang giua-hang" style={{ padding: '6px 12px' }}><b>{t('Thông báo')}</b>{tb.chuaDoc > 0 && <button className="nut-chu nho" style={{ width: 'auto', padding: 0 }} onClick={docTatCa}>{t('Đánh dấu đã đọc')}</button>}</div>
                {tb.danhSach.length === 0 && <div className="mo nho" style={{ padding: 14 }}>{t('Chưa có thông báo.')}</div>}
                {tb.danhSach.map((m) => (
                  <Link key={m.maThongBao} href={m.lienKet || '/account/orders'} className={'tb-muc' + (m.daDoc ? '' : ' chua-doc')}
                    onClick={() => { setMoTB(false); if (!m.daDoc) goi(`/api/thong-bao/${m.maThongBao}/da-doc`, { method: 'POST', body: {} }).catch(() => {}); }}>
                    <b className="nho">{m.tieuDe}</b>
                    {m.noiDung && <div className="nho mo">{m.noiDung}</div>}
                    <div className="nho mo">{ngayGio(m.ngayTao)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <button className="nut-icon nut-giao-dien" aria-label={t('Đổi giao diện sáng / tối')} title={t('Đổi giao diện sáng / tối')} onClick={doiGiaoDien}>
            <span className="bieu-tuong-sang"><IconSun /></span><span className="bieu-tuong-toi"><IconMoon /></span>
          </button>
          <button className="nut-icon nut-ngon-ngu" aria-label={t('Đổi ngôn ngữ')} title={t('Đổi ngôn ngữ')} onClick={() => datNgonNgu(lang === 'vi' ? 'en' : 'vi')}>
            <IconGlobe size={22} /><span className="ma-ngon-ngu">{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
          <Link href="/cart" className="nut-icon" aria-label={t('Giỏ hàng')}>
            <IconBag />{gio.tongSoLuong > 0 && <span className={'huy-hieu' + (nay ? ' nay' : '')}>{gio.tongSoLuong}</span>}
          </Link>
          <div className={'tha-xuong' + (moTK ? ' mo' : '')} ref={refTK}>
            <button className="nut-icon" aria-label={t('Tài khoản')} onClick={() => setMoTK((v) => !v)}><IconUser /></button>
            <div className="hop" onClick={() => setMoTK(false)}>
              {nguoiDung ? (
                <>
                  <div style={{ padding: '8px 12px' }}><b>{nguoiDung.hoTen}</b><div className="nho mo">{nguoiDung.email}</div></div>
                  <Link href="/account">{t('Tài khoản của tôi')}</Link>
                  <Link href="/account/orders">{t('Đơn hàng của tôi')}</Link>
                  <Link href="/account/wishlist">{t('Sản phẩm yêu thích')}</Link>
                  <Link href="/size-guide">{t('Gợi ý size')}</Link>
                  {nguoiDung.vaiTro === 'QuanTri' && <Link href="/admin">{t('Trang quản trị')}</Link>}
                  <button onClick={async () => { await dangXuat(); router.push('/'); router.refresh(); }}>{t('Đăng xuất')}</button>
                </>
              ) : (
                <>
                  <Link href="/login">{t('Đăng nhập')}</Link>
                  <Link href="/register">{t('Tạo tài khoản')}</Link>
                  <Link href="/track-order">{t('Tra cứu đơn hàng')}</Link>
                  <Link href="/size-guide">{t('Gợi ý size')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
