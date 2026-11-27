'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Anh, HopThoai } from '@/components/Common';
import { TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { ngayGio } from '@/lib/format';

const SP_RONG = { maDanhMuc: 0, tenSanPham: '', thuongHieu: '', chatLieu: '', moTaNgan: '', moTa: '', giaGoc: 0, giaBan: 0, trangThai: 'An', noiBat: false };
const BT_RONG = { kichCo: '', mauSac: '', maMau: '#000000', giaRieng: '', soLuongTon: 0, maHang: '' };

export default function SuaSanPham() {
  const { ma } = useParams<{ ma: string }>();
  const moi = ma === 'moi';
  const router = useRouter();
  const thucHien = useThucHien();
  const chiTiet = useTai<any>(moi ? null : '/api/quan-tri/san-pham/' + ma);
  const danhMuc = useTai<any[]>('/api/quan-tri/danh-muc');
  const [f, setF] = useState<any>(SP_RONG);
  useEffect(() => { if (chiTiet.du) { const s = chiTiet.du.sanPham; setF({ ...SP_RONG, ...s, thuongHieu: s.thuongHieu ?? '', chatLieu: s.chatLieu ?? '', moTaNgan: s.moTaNgan ?? '', moTa: s.moTa ?? '' }); } }, [chiTiet.du]);
  useEffect(() => { if (moi && danhMuc.du?.length && !f.maDanhMuc) setF((x: any) => ({ ...x, maDanhMuc: danhMuc.du![0].maDanhMuc })); }, [moi, danhMuc.du, f.maDanhMuc]);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { maDanhMuc: Number(f.maDanhMuc), tenSanPham: f.tenSanPham, thuongHieu: f.thuongHieu || null, chatLieu: f.chatLieu || null, moTaNgan: f.moTaNgan || null, moTa: f.moTa || null, giaGoc: Number(f.giaGoc), giaBan: Number(f.giaBan), trangThai: f.trangThai, noiBat: !!f.noiBat };
    if (moi) {
      try { const r = await goi<any>('/api/quan-tri/san-pham', { method: 'POST', body }); router.replace('/quan-tri/san-pham/' + r.maSanPham); } catch (er: any) { await thucHien(async () => { throw er; }); }
    } else if (await thucHien(() => goi('/api/quan-tri/san-pham/' + ma, { method: 'PUT', body }), 'Đã lưu sản phẩm.')) chiTiet.tai();
  }

  return (
    <TrangQuanTri tieuDe={moi ? 'Thêm sản phẩm' : 'Sửa sản phẩm'} hanhDong={<Link className="nut vien nho" href="/quan-tri/san-pham">← Danh sách</Link>}>
      <TrangThaiTai dang={!moi && chiTiet.dang} loi={chiTiet.loi} coDuLieu={moi || !!chiTiet.du}>
        <div className="luoi">
          <form className="the" onSubmit={luu}>
            <h3>Thông tin sản phẩm</h3>
            <Truong nhan="Tên sản phẩm"><input required maxLength={200} value={f.tenSanPham} onChange={(e) => dat('tenSanPham', e.target.value)} /></Truong>
            <div className="luoi-2">
              <Truong nhan="Danh mục"><select required value={f.maDanhMuc} onChange={(e) => dat('maDanhMuc', e.target.value)}>
                {(danhMuc.du ?? []).map((d) => <option key={d.maDanhMuc} value={d.maDanhMuc}>{d.maDanhMucCha ? '— ' : ''}{d.tenDanhMuc}</option>)}</select></Truong>
              <Truong nhan="Trạng thái"><select value={f.trangThai} onChange={(e) => dat('trangThai', e.target.value)}><option value="An">Ẩn (nháp)</option><option value="DangBan">Đang bán</option><option value="NgungBan">Ngừng bán</option></select></Truong>
              <Truong nhan="Giá gốc (₫)"><input type="number" required min={0} step={1000} value={f.giaGoc} onChange={(e) => dat('giaGoc', e.target.value)} /></Truong>
              <Truong nhan="Giá bán (₫)" goiY="Không được cao hơn giá gốc."><input type="number" required min={0} step={1000} value={f.giaBan} onChange={(e) => dat('giaBan', e.target.value)} /></Truong>
              <Truong nhan="Thương hiệu"><input maxLength={100} value={f.thuongHieu} onChange={(e) => dat('thuongHieu', e.target.value)} /></Truong>
              <Truong nhan="Chất liệu"><input maxLength={200} value={f.chatLieu} onChange={(e) => dat('chatLieu', e.target.value)} /></Truong>
            </div>
            <Truong nhan="Mô tả ngắn"><input maxLength={300} value={f.moTaNgan} onChange={(e) => dat('moTaNgan', e.target.value)} /></Truong>
            <Truong nhan="Mô tả chi tiết"><textarea rows={6} value={f.moTa} onChange={(e) => dat('moTa', e.target.value)} /></Truong>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.noiBat} onChange={(e) => dat('noiBat', e.target.checked)} />Hiển thị ở mục “Nổi bật”</label>
            <button className="nut">{moi ? 'Tạo sản phẩm' : 'Lưu thay đổi'}</button>
            {moi && <p className="nho mo cach">Sau khi tạo, bạn sẽ thêm biến thể (size/màu), tồn kho và hình ảnh. Sản phẩm chỉ hiển thị ở cửa hàng khi ở trạng thái “Đang bán” và có biến thể.</p>}
          </form>
          {!moi && chiTiet.du && (<><BienThe maSp={ma} ds={chiTiet.du.bienThe} tai={chiTiet.tai} /><HinhAnh maSp={ma} ds={chiTiet.du.hinhAnh} mau={[...new Set<string>(chiTiet.du.bienThe.map((b: any) => b.mauSac))]} tai={chiTiet.tai} /></>)}
        </div>
      </TrangThaiTai>
    </TrangQuanTri>
  );
}

function BienThe({ maSp, ds, tai }: { maSp: string; ds: any[]; tai: () => void }) {
  const thucHien = useThucHien();
  const [them, setThem] = useState<any>(null);
  const [kho, setKho] = useState<{ bt: any; kieu: 'nhap' | 'dieuChinh' } | null>(null);
  const [soLuong, setSoLuong] = useState(0);
  const [ghiChu, setGhiChu] = useState('');
  const [lichSu, setLichSu] = useState<{ bt: any; ds: any[] } | null>(null);

  async function luuThem(e: React.FormEvent) {
    e.preventDefault();
    const b = { kichCo: them.kichCo, mauSac: them.mauSac, maMau: them.maMau || null, giaRieng: them.giaRieng === '' ? null : Number(them.giaRieng), soLuongTon: Number(them.soLuongTon), maHang: them.maHang || null, hienThi: true };
    if (await thucHien(() => goi(`/api/quan-tri/san-pham/${maSp}/bien-the`, { method: 'POST', body: b }), 'Đã thêm biến thể.')) { setThem(null); tai(); }
  }
  async function luuKho(e: React.FormEvent) {
    e.preventDefault();
    if (!kho) return;
    const ok = await thucHien(() => kho.kieu === 'nhap'
      ? goi('/api/quan-tri/kho/nhap', { method: 'POST', body: { maBienThe: kho.bt.maBienThe, soLuong, ghiChu: ghiChu || null } })
      : goi('/api/quan-tri/kho/dieu-chinh', { method: 'POST', body: { maBienThe: kho.bt.maBienThe, tonMoi: soLuong, ghiChu: ghiChu || null } }), 'Đã cập nhật kho.');
    if (ok) { setKho(null); tai(); }
  }
  const sua = (bt: any, body: any) => thucHien(() => goi('/api/quan-tri/bien-the/' + bt.maBienThe, { method: 'PUT', body: { maMau: null, giaRieng: null, hienThi: null, xoaGiaRieng: false, ...body } }), 'Đã cập nhật.').then((ok) => ok && tai());

  return (
    <section className="the">
      <div className="hang giua-hang"><h3 style={{ margin: 0 }}>Biến thể & tồn kho</h3><button className="nut vien nho" onClick={() => setThem({ ...BT_RONG })}>+ Thêm biến thể</button></div>
      {ds.length === 0 ? <p className="mo cach">Chưa có biến thể. Thêm ít nhất một biến thể (size + màu) để bán.</p> : (
        <div className="bang-boc cach"><table className="bang"><thead><tr><th>Mã hàng</th><th>Size</th><th>Màu</th><th>Giá riêng</th><th>Tồn</th><th>Giữ chỗ</th><th>Hiện</th><th /></tr></thead>
          <tbody>{ds.map((b) => (
            <tr key={b.maBienThe}>
              <td className="nho">{b.maHang}</td><td>{b.kichCo}</td>
              <td><span className="hang" style={{ gap: 6, flexWrap: 'nowrap' }}><input type="color" aria-label="Mã màu" value={b.maMau || '#cccccc'} onChange={(e) => sua(b, { maMau: e.target.value })} style={{ width: 28, height: 28, border: 0, padding: 0, background: 'none' }} />{b.mauSac}</span></td>
              <td>{b.giaRieng != null ? new Intl.NumberFormat('vi-VN').format(b.giaRieng) : <span className="mo">—</span>}</td>
              <td><b>{b.soLuongTon}</b></td><td>{b.soLuongGiuCho}</td>
              <td><input type="checkbox" aria-label="Hiển thị" checked={!!b.hienThi} onChange={(e) => sua(b, { hienThi: e.target.checked })} /></td>
              <td className="hang" style={{ gap: 4, flexWrap: 'nowrap' }}>
                <button className="nut vien nho" onClick={() => { setKho({ bt: b, kieu: 'nhap' }); setSoLuong(1); setGhiChu(''); }}>Nhập kho</button>
                <button className="nut vien nho" onClick={() => { setKho({ bt: b, kieu: 'dieuChinh' }); setSoLuong(b.soLuongTon); setGhiChu(''); }}>Kiểm kê</button>
                <button className="nut-chu nho" onClick={async () => { try { setLichSu({ bt: b, ds: await goi<any[]>('/api/quan-tri/kho/lich-su?maBienThe=' + b.maBienThe + '&kichThuoc=30') }); } catch { /* bỏ qua */ } }}>Lịch sử</button>
              </td>
            </tr>))}</tbody></table></div>
      )}
      {them && (
        <HopThoai tieuDe="Thêm biến thể" dong={() => setThem(null)}>
          <form onSubmit={luuThem}>
            <div className="luoi-2">
              <Truong nhan="Kích cỡ" goiY="Ví dụ: S, M, L, XL, Free"><input required maxLength={10} value={them.kichCo} onChange={(e) => setThem({ ...them, kichCo: e.target.value })} /></Truong>
              <Truong nhan="Màu sắc"><input required maxLength={50} value={them.mauSac} onChange={(e) => setThem({ ...them, mauSac: e.target.value })} /></Truong>
              <Truong nhan="Mã màu hiển thị"><input type="color" value={them.maMau} onChange={(e) => setThem({ ...them, maMau: e.target.value })} style={{ height: 44, padding: 4 }} /></Truong>
              <Truong nhan="Tồn kho ban đầu"><input type="number" min={0} max={1000000} required value={them.soLuongTon} onChange={(e) => setThem({ ...them, soLuongTon: e.target.value })} /></Truong>
              <Truong nhan="Giá riêng (để trống = giá sản phẩm)"><input type="number" min={0} step={1000} value={them.giaRieng} onChange={(e) => setThem({ ...them, giaRieng: e.target.value })} /></Truong>
              <Truong nhan="Mã hàng (tự tạo nếu để trống)"><input maxLength={50} value={them.maHang} onChange={(e) => setThem({ ...them, maHang: e.target.value })} /></Truong>
            </div>
            <button className="nut">Thêm</button>
          </form>
        </HopThoai>
      )}
      {kho && (
        <HopThoai tieuDe={(kho.kieu === 'nhap' ? 'Nhập kho: ' : 'Kiểm kê: ') + kho.bt.maHang} dong={() => setKho(null)}>
          <form onSubmit={luuKho}>
            <Truong nhan={kho.kieu === 'nhap' ? 'Số lượng nhập thêm' : 'Số lượng tồn thực tế'} goiY={kho.kieu === 'dieuChinh' ? `Hiện tại ${kho.bt.soLuongTon}, đang giữ chỗ ${kho.bt.soLuongGiuCho}. Không thể đặt thấp hơn số đang giữ chỗ.` : undefined}>
              <input type="number" required min={kho.kieu === 'nhap' ? 1 : 0} value={soLuong} onChange={(e) => setSoLuong(Number(e.target.value))} /></Truong>
            <Truong nhan="Ghi chú"><input maxLength={200} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></Truong>
            <button className="nut">Lưu</button>
          </form>
        </HopThoai>
      )}
      {lichSu && (
        <HopThoai tieuDe={'Lịch sử kho: ' + lichSu.bt.maHang} dong={() => setLichSu(null)} rong>
          <div className="bang-boc"><table className="bang"><thead><tr><th>Thời gian</th><th>Loại</th><th>Δ Tồn</th><th>Δ Giữ chỗ</th><th>Tham chiếu</th><th>Ghi chú</th></tr></thead>
            <tbody>{lichSu.ds.map((l) => <tr key={l.maLichSu}><td>{ngayGio(l.ngayTao)}</td><td>{l.loaiBienDong}</td><td>{l.thayDoiTon}</td><td>{l.thayDoiGiuCho}</td><td className="nho">{l.maThamChieu}</td><td className="nho">{l.ghiChu}</td></tr>)}</tbody></table></div>
        </HopThoai>
      )}
    </section>
  );
}

function HinhAnh({ maSp, ds, mau, tai }: { maSp: string; ds: any[]; mau: string[]; tai: () => void }) {
  const thucHien = useThucHien();
  const tep = useRef<HTMLInputElement>(null);
  const [mauChon, setMauChon] = useState('');
  const [dang, setDang] = useState(false);

  async function taiLen(files: FileList | null) {
    if (!files?.length) return;
    setDang(true);
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append('tep', file);
      const ok = await thucHien(async () => {
        const r = await goi<any>('/api/quan-tri/upload-anh', { method: 'POST', form: fd });
        await goi(`/api/quan-tri/san-pham/${maSp}/hinh-anh`, { method: 'POST', body: { duongDanAnh: r.duongDan, mauSac: mauChon || null, chuThich: null, laAnhChinh: ds.length === 0, thuTu: ds.length } });
      }, 'Đã tải ảnh lên.');
      if (!ok) break;
    }
    setDang(false); if (tep.current) tep.current.value = ''; tai();
  }
  const body = (h: any, doi: any) => ({ duongDanAnh: h.duongDanAnh, mauSac: h.mauSac, chuThich: h.chuThich, laAnhChinh: h.laAnhChinh, thuTu: h.thuTu, ...doi });
  return (
    <section className="the">
      <h3>Hình ảnh</h3>
      <div className="hang">
        <select className="o" style={{ width: 'auto' }} value={mauChon} onChange={(e) => setMauChon(e.target.value)} aria-label="Gắn ảnh với màu"><option value="">Ảnh chung (mọi màu)</option>{mau.map((m) => <option key={m}>{m}</option>)}</select>
        <input ref={tep} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => taiLen(e.target.files)} />
        <button className="nut vien" disabled={dang} onClick={() => tep.current?.click()}>{dang ? 'Đang tải lên…' : '+ Tải ảnh lên'}</button>
        <span className="nho mo">JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.</span>
      </div>
      <div className="ds-anh-qt cach">
        {ds.map((h) => (
          <div key={h.maHinhAnh} className={h.laAnhChinh ? 'chinh' : ''}>
            <Anh src={h.duongDanAnh} alt="" />
            <button className="nut do nho xoa" aria-label="Xóa ảnh" style={{ padding: '2px 8px' }} onClick={async () => { if (confirm('Xóa ảnh này?') && await thucHien(() => goi('/api/quan-tri/hinh-anh/' + h.maHinhAnh, { method: 'DELETE' }), 'Đã xóa ảnh.')) tai(); }}>✕</button>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: '.72rem', padding: '3px 6px' }}>
              {h.laAnhChinh ? 'Ảnh chính' : <button className="nut-chu" style={{ color: '#fff' }} onClick={async () => { if (await thucHien(() => goi('/api/quan-tri/hinh-anh/' + h.maHinhAnh, { method: 'PUT', body: body(h, { laAnhChinh: true }) }), 'Đã đặt ảnh chính.')) tai(); }}>Đặt làm ảnh chính</button>}
              {h.mauSac ? ' · ' + h.mauSac : ''}
            </div>
          </div>))}
      </div>
    </section>
  );
}
