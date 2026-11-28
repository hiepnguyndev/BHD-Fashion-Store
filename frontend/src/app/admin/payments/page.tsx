'use client';
import Link from 'next/link';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Common';
import { PhanTrangQT, TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { ngayGio, TEN_PHUONG_THUC, TEN_TT_THANH_TOAN, vnd } from '@/lib/format';

type Tab = 'thanhToan' | 'hoanTien' | 'giaoDich';

export default function ThanhToanQT() {
  const [tab, setTab] = useState<Tab>('thanhToan');
  return (
    <TrangQuanTri tieuDe="Thanh toán & hoàn tiền">
      <div className="hang" style={{ marginBottom: 16 }}>
        {([['thanhToan', 'Giao dịch thanh toán'], ['hoanTien', 'Hoàn tiền'], ['giaoDich', 'Nhật ký cổng/ngân hàng']] as [Tab, string][]).map(([k, t]) => <button key={k} className={'chip' + (tab === k ? ' dang' : '')} onClick={() => setTab(k)}>{t}</button>)}
      </div>
      {tab === 'thanhToan' && <DsThanhToan />}
      {tab === 'hoanTien' && <DsHoanTien />}
      {tab === 'giaoDich' && <DsGiaoDich />}
    </TrangQuanTri>
  );
}

function DsThanhToan() {
  const [trang, setTrang] = useState(1);
  const [trangThai, setTrangThai] = useState('CanXuLy');
  const [kenh, setKenh] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  const [tk, setTk] = useState('');
  const q = new URLSearchParams({ trang: String(trang), ...(trangThai ? { trangThai } : {}), ...(kenh ? { kenh } : {}), ...(tk ? { tuKhoa: tk } : {}) });
  const { du, dang, loi, tai } = useTai<any>('/api/quan-tri/thanh-toan?' + q);
  const thucHien = useThucHien();
  const [hoan, setHoan] = useState<any>(null);
  const [soTien, setSoTien] = useState(0);
  const [lyDo, setLyDo] = useState('');
  return (<>
    <form className="thanh-cong-cu" onSubmit={(e) => { e.preventDefault(); setTrang(1); setTk(tuKhoa.trim()); }}>
      <select className="o" value={trangThai} onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}><option value="">Mọi trạng thái</option>{Object.entries(TEN_TT_THANH_TOAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select className="o" value={kenh} onChange={(e) => { setKenh(e.target.value); setTrang(1); }}><option value="">Mọi kênh</option>{Object.keys(TEN_PHUONG_THUC).map((k) => <option key={k} value={k}>{k}</option>)}</select>
      <input className="o" placeholder="Mã đơn / mã thanh toán…" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} /><button className="nut">Tìm</button>
    </form>
    <p className="nho mo">“Cần xử lý”: tiền về sai số tiền, về sau khi đơn hủy/hết hạn. Hãy đối chiếu sao kê rồi xác nhận hoặc tạo yêu cầu hoàn tiền.</p>
    <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
      {du && (<>
        <div className="bang-boc"><table className="bang"><thead><tr><th>Đơn</th><th>Kênh</th><th>Mã thanh toán</th><th>Cần thu</th><th>Đã nhận</th><th>Trạng thái</th><th>Ghi chú</th><th /></tr></thead>
          <tbody>
            {du.danhSach.length === 0 && <tr><td colSpan={8} className="giua mo">Không có giao dịch.</td></tr>}
            {du.danhSach.map((t: any) => (
              <tr key={t.maThanhToan}>
                <td><Link className="nut-chu" href={'/admin/orders/' + t.maDonHienThi}>{t.maDonHienThi}</Link><div className="nho mo">{ngayGio(t.ngayTao)}</div></td>
                <td>{t.kenhThanhToan}</td><td className="nho">{t.maThanhToanNganHang}</td><td>{vnd(t.soTien)}</td><td>{vnd(t.soTienDaNhan)}</td>
                <td><NhanTrangThai ma={t.trangThai} ten={TEN_TT_THANH_TOAN[t.trangThai]} /></td><td className="nho" style={{ maxWidth: 220 }}>{t.ghiChu}</td>
                <td className="hang" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  {['ChoThanhToan', 'HetHan', 'CanXuLy'].includes(t.trangThai) && t.kenhThanhToan !== 'COD' && <button className="nut nho" onClick={async () => { if (confirm(`Xác nhận ĐÃ NHẬN ${vnd(t.soTien)} cho đơn ${t.maDonHienThi}? Đơn sẽ chuyển sang chờ xác nhận.`) && await thucHien(() => goi(`/api/quan-tri/thanh-toan/${t.maThanhToan}/xac-nhan`, { method: 'POST', body: { ghiChu: 'Quản trị xác nhận thủ công' } }), 'Đã xác nhận.')) tai(); }}>Xác nhận đã nhận</button>}
                  {['DaThanhToan', 'CanXuLy'].includes(t.trangThai) && t.soTienDaNhan > 0 && <button className="nut vien nho" onClick={() => { setHoan(t); setSoTien(t.soTienDaNhan); setLyDo(''); }}>Hoàn tiền</button>}
                </td>
              </tr>))}
          </tbody></table></div>
        <PhanTrangQT trang={trang} tong={du.tong} kichThuoc={du.kichThuoc} doi={setTrang} />
      </>)}
    </TrangThaiTai>
    {hoan && (
      <HopThoai tieuDe={'Tạo yêu cầu hoàn tiền: ' + hoan.maDonHienThi} dong={() => setHoan(null)}>
        <form onSubmit={async (e) => { e.preventDefault(); if (await thucHien(() => goi('/api/quan-tri/hoan-tien', { method: 'POST', body: { maThanhToan: hoan.maThanhToan, soTien, lyDo: lyDo.trim() } }), 'Đã tạo yêu cầu hoàn tiền.')) { setHoan(null); tai(); } }}>
          <Truong nhan={`Số tiền hoàn (tối đa ${vnd(hoan.soTienDaNhan)})`}><input type="number" required min={1} max={hoan.soTienDaNhan} value={soTien} onChange={(e) => setSoTien(Number(e.target.value))} /></Truong>
          <Truong nhan="Lý do"><input required minLength={3} maxLength={300} value={lyDo} onChange={(e) => setLyDo(e.target.value)} /></Truong>
          <p className="nho mo">Hệ thống chỉ ghi nhận yêu cầu. Bạn cần chuyển khoản trả khách rồi đánh dấu “Đã hoàn” ở tab Hoàn tiền.</p>
          <button className="nut">Tạo yêu cầu</button>
        </form>
      </HopThoai>
    )}
  </>);
}

function DsHoanTien() {
  const [tt, setTt] = useState('ChoXuLy');
  const { du, dang, loi, tai } = useTai<any>('/api/quan-tri/hoan-tien' + (tt ? '?trangThai=' + tt : ''));
  const thucHien = useThucHien();
  const [xl, setXl] = useState<any>(null);
  const [pt, setPt] = useState('Chuyển khoản thủ công');
  const [maTC, setMaTC] = useState('');
  return (<>
    <div className="thanh-cong-cu"><select className="o" value={tt} onChange={(e) => setTt(e.target.value)}><option value="">Tất cả</option><option value="ChoXuLy">Chờ xử lý</option><option value="DaHoan">Đã hoàn</option><option value="TuChoi">Từ chối</option></select></div>
    <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
      {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Đơn</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th>Tạo lúc</th><th /></tr></thead>
        <tbody>
          {du.danhSach.length === 0 && <tr><td colSpan={6} className="giua mo">Không có yêu cầu hoàn tiền.</td></tr>}
          {du.danhSach.map((h: any) => (
            <tr key={h.maHoanTien}>
              <td><Link className="nut-chu" href={'/admin/orders/' + h.maDonHienThi}>{h.maDonHienThi}</Link><div className="nho mo">{h.kenhThanhToan}</div></td>
              <td><b>{vnd(h.soTien)}</b></td><td className="nho">{h.lyDo}</td>
              <td><NhanTrangThai ma={h.trangThai === 'TuChoi' ? 'TuChoi' : h.trangThai} ten={{ ChoXuLy: 'Chờ xử lý', DaHoan: 'Đã hoàn', TuChoi: 'Từ chối' }[h.trangThai as string]} />{h.maThamChieu && <div className="nho mo">{h.maThamChieu}</div>}</td>
              <td className="nho">{ngayGio(h.ngayTao)}</td>
              <td>{h.trangThai === 'ChoXuLy' && <button className="nut nho" onClick={() => { setXl(h); setMaTC(''); }}>Xử lý</button>}</td>
            </tr>))}
        </tbody></table></div>}
    </TrangThaiTai>
    {xl && (
      <HopThoai tieuDe={`Hoàn ${vnd(xl.soTien)} cho đơn ${xl.maDonHienThi}`} dong={() => setXl(null)}>
        <Truong nhan="Hình thức hoàn"><input value={pt} maxLength={100} onChange={(e) => setPt(e.target.value)} /></Truong>
        <Truong nhan="Mã tham chiếu giao dịch hoàn (nếu có)"><input value={maTC} maxLength={64} onChange={(e) => setMaTC(e.target.value)} /></Truong>
        <p className="nho mo">Chỉ bấm “Đã hoàn tiền” sau khi bạn đã thực sự chuyển tiền cho khách.</p>
        <div className="hang">
          <button className="nut" onClick={async () => { if (await thucHien(() => goi('/api/quan-tri/hoan-tien/' + xl.maHoanTien, { method: 'PATCH', body: { trangThai: 'DaHoan', phuongThucHoan: pt, maThamChieu: maTC } }), 'Đã đánh dấu hoàn tiền.')) { setXl(null); tai(); } }}>Đã hoàn tiền</button>
          <button className="nut do vien" onClick={async () => { if (confirm('Từ chối yêu cầu hoàn tiền này?') && await thucHien(() => goi('/api/quan-tri/hoan-tien/' + xl.maHoanTien, { method: 'PATCH', body: { trangThai: 'TuChoi', phuongThucHoan: '', maThamChieu: '' } }), 'Đã từ chối.')) { setXl(null); tai(); } }}>Từ chối</button>
        </div>
      </HopThoai>
    )}
  </>);
}

function DsGiaoDich() {
  const [kq, setKq] = useState('');
  const { du, dang, loi } = useTai<any>('/api/quan-tri/giao-dich-cong' + (kq ? '?ketQua=' + kq : ''));
  return (<>
    <div className="thanh-cong-cu"><select className="o" value={kq} onChange={(e) => setKq(e.target.value)}><option value="">Mọi kết quả</option>{['ThanhCong', 'BoQuaTrung', 'SaiSoTien', 'KhongKhopMa', 'HetHan', 'Loi'].map((k) => <option key={k}>{k}</option>)}</select></div>
    <p className="nho mo">“KhongKhopMa”: tiền về nhưng nội dung không có mã thanh toán hợp lệ — đối chiếu thủ công. “Loi”: đã nhận nhưng chưa xử lý xong, hệ thống sẽ tự thử lại.</p>
    <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
      {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Nhận lúc</th><th>Nguồn</th><th>Mã GD ngoài</th><th>Ngân hàng</th><th>Số tiền</th><th>Nội dung</th><th>Kết quả</th></tr></thead>
        <tbody>{du.danhSach.map((g: any) => <tr key={g.maGiaoDichCong}><td className="nho">{ngayGio(g.ngayNhan)}</td><td>{g.nguon}</td><td className="nho">{g.maGiaoDichNgoai}</td><td className="nho">{g.nganHang}</td><td>{vnd(g.soTien)}</td><td className="nho" style={{ maxWidth: 260 }}>{g.noiDung}</td><td><NhanTrangThai ma={g.ketQuaXuLy === 'ThanhCong' ? 'DaThanhToan' : g.ketQuaXuLy === 'BoQuaTrung' ? 'DaHoan' : 'CanXuLy'} ten={g.ketQuaXuLy} /></td></tr>)}</tbody></table></div>}
    </TrangThaiTai>
  </>);
}
