'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Common';
import { TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { ngayGio, TEN_DOI_TRA, vnd } from '@/lib/format';
import Link from 'next/link';

const TIEP: Record<string, [string, string][]> = {
  ChoDuyet: [['DaDuyet', 'Duyệt'], ['TuChoi', 'Từ chối']], DaDuyet: [['DaNhanHang', 'Đã nhận lại hàng']], DaNhanHang: [['DaHoanTat', 'Hoàn tất']],
};

export default function DoiTraQT() {
  const [tt, setTt] = useState('ChoDuyet');
  const { du, dang, loi, tai } = useTai<any>('/api/quan-tri/doi-tra' + (tt ? '?trangThai=' + tt : ''));
  const thucHien = useThucHien();
  const [xl, setXl] = useState<{ d: any; moi: string } | null>(null);
  const [ghiChu, setGhiChu] = useState('');
  const [tien, setTien] = useState(0);
  async function gui(e: React.FormEvent) {
    e.preventDefault();
    if (!xl) return;
    if (await thucHien(() => goi('/api/quan-tri/doi-tra/' + xl.d.maDoiTra, { method: 'PATCH', body: { trangThai: xl.moi, ghiChuAdmin: ghiChu.trim() || null, soTienHoan: xl.d.hinhThuc === 'TraHang' && xl.moi === 'DaDuyet' ? tien : null } }), 'Đã cập nhật yêu cầu.')) { setXl(null); tai(); }
  }
  return (
    <TrangQuanTri tieuDe="Đổi / trả hàng">
      <div className="thanh-cong-cu"><select className="o" value={tt} onChange={(e) => setTt(e.target.value)}><option value="">Tất cả</option>{Object.entries(TEN_DOI_TRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && (du.danhSach.length === 0 ? <p className="mo">Không có yêu cầu.</p> : du.danhSach.map((d: any) => (
          <div key={d.maDoiTra} className="the cach" style={{ marginTop: 12 }}>
            <div className="hang giua-hang"><div><b>{d.hinhThuc === 'DoiHang' ? 'Đổi hàng' : 'Trả hàng'}</b> · đơn <Link className="nut-chu" href={'/admin/orders/' + d.maDonHienThi}>{d.maDonHienThi}</Link> · {d.tenNguoiNhan} ({d.email})</div><NhanTrangThai ma={d.trangThai} ten={TEN_DOI_TRA[d.trangThai]} /></div>
            <p className="nho mo" style={{ margin: '6px 0' }}>{ngayGio(d.ngayTao)} — “{d.lyDo}”</p>
            <ul className="nho" style={{ margin: '6px 0', paddingLeft: 18 }}>{d.dong.map((x: any) => <li key={x.maChiTietDoiTra}>{x.tenSanPham} ({x.mauSac}, {x.kichCo}) × {x.soLuong}{x.maBienTheMoi ? ` → biến thể mới #${x.maBienTheMoi}` : ''}</li>)}</ul>
            {d.soTienHoan > 0 && <div className="nho">Số tiền hoàn: <b>{vnd(d.soTienHoan)}</b></div>}
            {d.ghiChuAdmin && <div className="nho">Ghi chú: {d.ghiChuAdmin}</div>}
            <div className="hang cach">{(TIEP[d.trangThai] || []).map(([moi, ten]) => <button key={moi} className={'nut nho' + (moi === 'TuChoi' ? ' do vien' : '')} onClick={() => { setXl({ d, moi }); setGhiChu(''); setTien(d.soTienHoan || 0); }}>{ten}</button>)}</div>
          </div>)))}
      </TrangThaiTai>
      {xl && (
        <HopThoai tieuDe={`${TEN_DOI_TRA[xl.moi]}: yêu cầu #${xl.d.maDoiTra}`} dong={() => setXl(null)}>
          <form onSubmit={gui}>
            {xl.d.hinhThuc === 'TraHang' && xl.moi === 'DaDuyet' && <Truong nhan="Số tiền hoàn cho khách (₫)" goiY="Hoàn tiền được thực hiện thủ công, ghi nhận ở mục Thanh toán & hoàn tiền."><input type="number" min={0} required value={tien} onChange={(e) => setTien(Number(e.target.value))} /></Truong>}
            <Truong nhan="Ghi chú gửi khách"><textarea maxLength={500} required={xl.moi === 'TuChoi'} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></Truong>
            <button className="nut">Xác nhận</button>
          </form>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
