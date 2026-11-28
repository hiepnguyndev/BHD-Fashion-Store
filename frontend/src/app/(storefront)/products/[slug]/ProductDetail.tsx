'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Anh, Sao } from '@/components/Common';
import { useAuth, useGio, useT, useToast } from '@/components/Providers';
import ThuDo from '@/components/ThuDo';
import { goi, LoiApi } from '@/lib/api';
import { ngay, vnd } from '@/lib/format';

export default function ProductDetail({ sanPham, hinhAnh, bienThe, choThuDo = false }: { sanPham: any; hinhAnh: any[]; bienThe: any[]; choThuDo?: boolean }) {
  const router = useRouter();
  const { nguoiDung } = useAuth();
  const { them } = useGio();
  const toast = useToast();
  const t = useT();

  const mauList = useMemo(() => {
    const m = new Map<string, string | null>();
    bienThe.forEach((b) => { if (!m.has(b.mauSac)) m.set(b.mauSac, b.maMau); });
    return [...m.entries()].map(([mauSac, maMau]) => ({ mauSac, maMau }));
  }, [bienThe]);
  const [mau, setMau] = useState<string>(() => (bienThe.find((b) => b.conLai > 0) ?? bienThe[0])?.mauSac ?? '');
  const [kichCo, setKichCo] = useState<string>('');
  const [soLuong, setSoLuong] = useState(1);
  const [dangThem, setDangThem] = useState(false);
  const [anhDang, setAnhDang] = useState(0);
  const [yeuThich, setYeuThich] = useState(false);

  const theoMau = bienThe.filter((b) => b.mauSac === mau);
  const bt = theoMau.find((b) => b.kichCo === kichCo) ?? null;
  const gia = bt ? Number(bt.gia) : Number(sanPham.giaBan);
  const anhTheoMau = hinhAnh.filter((h) => h.mauSac === mau);
  const dsAnh = anhTheoMau.length > 0 ? anhTheoMau.concat(hinhAnh.filter((h) => h.mauSac !== mau)) : hinhAnh;
  useEffect(() => { setAnhDang(0); }, [mau]);
  useEffect(() => { setKichCo(''); setSoLuong(1); }, [mau]);

  useEffect(() => {
    if (!nguoiDung) { setYeuThich(false); return; }
    goi<any[]>('/api/yeu-thich').then((ds) => setYeuThich(ds.some((x) => x.maSanPham === sanPham.maSanPham))).catch(() => {});
  }, [nguoiDung, sanPham.maSanPham]);

  async function themVaoGio(muaNgay: boolean) {
    if (!bt) { toast(t('Vui lòng chọn kích cỡ.'), 'loi'); return; }
    setDangThem(true);
    try {
      await them(bt.maBienThe, soLuong);
      if (muaNgay) router.push('/cart'); else toast(t('Đã thêm vào giỏ hàng.'), 'ok');
    } catch (e) {
      toast(e instanceof LoiApi ? e.message : t('Không thêm được vào giỏ.'), 'loi');
    } finally { setDangThem(false); }
  }
  async function doiYeuThich() {
    if (!nguoiDung) { router.push('/login?tiep=' + encodeURIComponent('/products/' + sanPham.duongDan)); return; }
    try {
      await goi('/api/yeu-thich/' + sanPham.maSanPham, { method: yeuThich ? 'DELETE' : 'PUT', body: yeuThich ? undefined : {} });
      setYeuThich(!yeuThich);
    } catch (e) { toast(e instanceof LoiApi ? e.message : t('Có lỗi xảy ra.'), 'loi'); }
  }

  const giam = sanPham.giaGoc > sanPham.giaBan ? Math.round(((sanPham.giaGoc - sanPham.giaBan) / sanPham.giaGoc) * 100) : 0;

  return (
    <>
      <div className="chi-tiet-sp">
        <div className="thu-vien">
          <div className="lon"><Anh src={dsAnh[anhDang]?.duongDanAnh} alt={sanPham.tenSanPham} /></div>
          {dsAnh.length > 1 && (
            <div className="nho-hang">
              {dsAnh.map((h, i) => <button key={h.maHinhAnh} className={i === anhDang ? 'dang' : ''} onClick={() => setAnhDang(i)} aria-label={t('Ảnh {n}', { n: i + 1 })}><Anh src={h.duongDanAnh} alt="" /></button>)}
            </div>
          )}
        </div>

        <div>
          {sanPham.thuongHieu && <div className="nho mo" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>{sanPham.thuongHieu}</div>}
          <h1>{sanPham.tenSanPham}</h1>
          <div className="hang"><Sao diem={sanPham.diemDanhGiaTB} soLuot={sanPham.soLuotDanhGia} /><span className="nho mo">{t('Đã bán {n}', { n: sanPham.soLuongDaBan })}</span></div>
          <div className="gia-lon cach">{vnd(gia)}{giam > 0 && !bt && <s>{vnd(sanPham.giaGoc)}</s>}{giam > 0 && <span className="nhan-tt do" style={{ marginLeft: 10, verticalAlign: 'middle' }}>-{giam}%</span>}</div>
          {sanPham.moTaNgan && <p className="mo cach">{sanPham.moTaNgan}</p>}

          {mauList.length > 0 && (
            <div className="cach">
              <div className="nhan">{t('Màu sắc')}: <span className="mo" style={{ fontWeight: 400 }}>{mau}</span></div>
              <div className="hang" style={{ marginTop: 8 }}>
                {mauList.map((m) => <button key={m.mauSac} type="button" title={m.mauSac} aria-label={m.mauSac} aria-pressed={m.mauSac === mau} className={'o-mau' + (m.mauSac === mau ? ' dang' : '')} style={{ background: m.maMau || '#ddd' }} onClick={() => setMau(m.mauSac)} />)}
              </div>
            </div>
          )}
          <div className="cach">
            <div className="nhan">{t('Kích cỡ')}</div>
            <div className="hang" style={{ marginTop: 8, gap: 8 }}>
              {theoMau.map((b) => (
                <button key={b.maBienThe} type="button" disabled={b.conLai <= 0} className={'chip' + (b.kichCo === kichCo ? ' dang' : '') + (b.conLai <= 0 ? ' het' : '')} onClick={() => { setKichCo(b.kichCo); setSoLuong(1); }}>{b.kichCo}</button>
              ))}
            </div>
            {bt && bt.conLai > 0 && bt.conLai <= 5 && <p className="nho" style={{ color: 'var(--dat)', marginTop: 8 }}>{t('Chỉ còn {n} sản phẩm.', { n: bt.conLai })}</p>}
          </div>

          <div className="hang cach">
            <div className="chon-so-luong">
              <button type="button" aria-label={t('Giảm')} onClick={() => setSoLuong((v) => Math.max(1, v - 1))}>−</button>
              <span>{soLuong}</span>
              <button type="button" aria-label={t('Tăng')} onClick={() => setSoLuong((v) => Math.min(bt?.conLai ?? 10, Math.min(10, v + 1)))}>+</button>
            </div>
            <button className="nut lon co-dan" disabled={dangThem || (!!bt && bt.conLai <= 0)} onClick={() => themVaoGio(false)}>{dangThem ? t('Đang thêm…') : t('Thêm vào giỏ')}</button>
            <button className="nut vien tron" aria-label={yeuThich ? t('Bỏ yêu thích') : t('Yêu thích')} aria-pressed={yeuThich} onClick={doiYeuThich} style={{ width: 48, height: 48 }}>{yeuThich ? '♥' : '♡'}</button>
          </div>
          <button className="nut dat rong cach" style={{ marginTop: 10 }} disabled={dangThem} onClick={() => themVaoGio(true)}>{t('Mua ngay')}</button>
          {choThuDo && <ThuDo slug={sanPham.duongDan} mau={mau} ten={sanPham.tenSanPham} />}

          <div className="cach mo nho">
            {sanPham.chatLieu && <div><b>{t('Chất liệu:')}</b> {sanPham.chatLieu}</div>}
            {bt?.maHang && <div><b>{t('Mã hàng:')}</b> {bt.maHang}</div>}
          </div>
          {sanPham.moTa && <div className="cach"><h3>{t('Mô tả')}</h3><div style={{ whiteSpace: 'pre-line' }} className="mo">{sanPham.moTa}</div></div>}
        </div>
      </div>
      <DanhGia maSanPham={sanPham.maSanPham} duongDan={sanPham.duongDan} />
    </>
  );
}

function DanhGia({ maSanPham, duongDan }: { maSanPham: number; duongDan: string }) {
  const { nguoiDung } = useAuth();
  const toast = useToast();
  const t = useT();
  const [d, setD] = useState<any>(null);
  const [sao, setSao] = useState(5);
  const [noiDung, setNoiDung] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [daGui, setDaGui] = useState<string | null>(null);
  useEffect(() => { goi('/api/danh-gia?maSanPham=' + maSanPham).then(setD).catch(() => setD({ danhSach: [], phanBo: [] })); }, [maSanPham]);

  const tong = (d?.phanBo ?? []).reduce((s: number, x: any) => s + x.soLuong, 0);
  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDangGui(true);
    try {
      const r = await goi<any>('/api/danh-gia', { method: 'POST', body: { maSanPham, soSao: sao, noiDung: noiDung.trim() || null } });
      setDaGui(r.thongBao); setNoiDung('');
    } catch (err) { toast(err instanceof LoiApi ? err.message : t('Không gửi được đánh giá.'), 'loi'); }
    finally { setDangGui(false); }
  }
  return (
    <section className="cach-lon" id="danh-gia">
      <h2>{t('Đánh giá từ khách hàng')}</h2>
      {!d ? <div className="mo">{t('Đang tải…')}</div> : (
        <div className="luoi" style={{ gridTemplateColumns: 'minmax(220px, 300px) 1fr', alignItems: 'start' }}>
          <div className="the mong">
            {[5, 4, 3, 2, 1].map((s) => {
              const n = d.phanBo.find((x: any) => x.soSao === s)?.soLuong ?? 0;
              return <div key={s} className="thanh-sao"><span>{s} ★</span><div><div style={{ width: (tong ? (n / tong) * 100 : 0) + '%' }} /></div><span className="mo">{n}</span></div>;
            })}
            <div className="nho mo" style={{ marginTop: 10 }}>{t('{n} đánh giá', { n: tong })}</div>
          </div>
          <div>
            {d.danhSach.length === 0 && <p className="mo">{t('Chưa có đánh giá nào.')}</p>}
            {d.danhSach.map((x: any, i: number) => (
              <div className="danh-gia-muc" key={i}>
                <div className="hang"><b>{x.tenNguoiDanhGia}</b><Sao diem={x.soSao} />{x.daMuaHang && <span className="nhan-tt luc">{t('Đã mua hàng')}</span>}<span className="nho mo">{ngay(x.ngayTao)}</span></div>
                {x.noiDung && <p style={{ margin: '6px 0 0' }}>{x.noiDung}</p>}
              </div>
            ))}
            <div className="the cach">
              <h3>{t('Viết đánh giá')}</h3>
              {!nguoiDung ? <p className="mo nho"><Link className="nut-chu" href={'/login?tiep=' + encodeURIComponent('/products/' + duongDan)}>{t('Đăng nhập')}</Link> {t('để đánh giá. Chỉ khách đã nhận hàng mới có thể đánh giá.')}</p>
                : daGui ? <div className="thong-bao-ok">{daGui}</div> : (
                  <form onSubmit={gui}>
                    <div className="truong"><label>{t('Số sao')}</label><div className="hang">{[1, 2, 3, 4, 5].map((s) => <button type="button" key={s} className="nut-icon" aria-label={t('{n} sao', { n: s })} style={{ fontSize: '1.5rem', color: s <= sao ? '#e0a526' : '#d9d3c4' }} onClick={() => setSao(s)}>★</button>)}</div></div>
                    <div className="truong"><label htmlFor="nd-dg">{t('Nội dung')}</label><textarea id="nd-dg" maxLength={1000} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder={t('Chia sẻ trải nghiệm của bạn…')} /></div>
                    <button className="nut" disabled={dangGui}>{dangGui ? t('Đang gửi…') : t('Gửi đánh giá')}</button>
                  </form>
                )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
