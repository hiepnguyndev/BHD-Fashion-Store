'use client';
import Link from 'next/link';
import { Anh, DangTai, Trong } from '@/components/Common';
import { useGio, useT, useToast } from '@/components/Providers';
import { LoiApi } from '@/lib/api';
import { vnd } from '@/lib/format';

export default function TrangGioHang() {
  const { gio, dangTai, doiSoLuong, xoa } = useGio();
  const toast = useToast();
  const t = useT();
  const bao = (e: unknown) => toast(e instanceof LoiApi ? e.message : t('Có lỗi xảy ra.'), 'loi');
  const muaDuoc = gio.dong.filter((d) => d.coTheMua);

  if (dangTai && gio.dong.length === 0) return <DangTai />;
  if (gio.dong.length === 0) return <Trong tieuDe={t('Giỏ hàng của bạn đang trống')}><Link className="nut" href="/products">{t('Tiếp tục mua sắm')}</Link></Trong>;

  return (
    <>
      <h1>{t('Giỏ hàng')}</h1>
      <div className="bo-cuc-gio">
        <div className="the">
          {gio.dong.map((d) => (
            <div className="dong-gio" key={d.maChiTiet} style={d.coTheMua ? undefined : { opacity: 0.75 }}>
              <div className="anh-nho"><Anh src={d.duongDanAnh} alt={d.tenSanPham} /></div>
              <div>
                {d.duongDan ? <Link href={'/products/' + d.duongDan}><b>{d.tenSanPham}</b></Link> : <b>{d.tenSanPham}</b>}
                <div className="nho mo">{[d.mauSac, d.kichCo].filter(Boolean).join(' · ')}</div>
                {d.khaDung && <div className="nho">{vnd(d.gia)}</div>}
                {d.canhBao && <div className="nho" style={{ color: 'var(--do)' }}>{d.canhBao}</div>}
                <button className="nut-chu nho" onClick={() => xoa(d.maChiTiet).catch(bao)}>{t('Xóa')}</button>
              </div>
              <div className="phai">
                <div className="chon-so-luong">
                  <button aria-label={t('Giảm')} disabled={d.soLuong <= 1 || dangTai} onClick={() => doiSoLuong(d.maChiTiet, d.soLuong - 1).catch(bao)}>−</button>
                  <span>{d.soLuong}</span>
                  <button aria-label={t('Tăng')} disabled={dangTai || d.soLuong >= 10} onClick={() => doiSoLuong(d.maChiTiet, d.soLuong + 1).catch(bao)}>+</button>
                </div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>{vnd(d.thanhTien)}</div>
              </div>
            </div>
          ))}
        </div>
        <aside className="the tom-tat">
          <h3>{t('Tóm tắt đơn hàng')}</h3>
          <div className="dong"><span>{t('Tạm tính ({n} sản phẩm)', { n: gio.tongSoLuong })}</span><b>{vnd(gio.tamTinh)}</b></div>
          <div className="dong mo nho"><span>{t('Phí vận chuyển và giảm giá')}</span><span>{t('tính ở bước sau')}</span></div>
          <div className="dong tong"><span>{t('Tổng')}</span><span>{vnd(gio.tamTinh)}</span></div>
          {muaDuoc.length < gio.dong.length && <p className="nho" style={{ color: 'var(--do)', marginTop: 10 }}>{t('Có sản phẩm không mua được sẽ không được tính vào đơn.')}</p>}
          <Link className={'nut lon rong cach' + (muaDuoc.length ? '' : ' disabled')} href={muaDuoc.length ? '/checkout' : '#'} aria-disabled={!muaDuoc.length} style={muaDuoc.length ? undefined : { opacity: .5, pointerEvents: 'none' }}>{t('Tiến hành đặt hàng')}</Link>
          <Link className="nut-chu nho giua" style={{ display: 'block', marginTop: 14 }} href="/products">{t('← Tiếp tục mua sắm')}</Link>
        </aside>
      </div>
    </>
  );
}
