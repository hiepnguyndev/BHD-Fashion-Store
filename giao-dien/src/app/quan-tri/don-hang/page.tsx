'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { DangTai, NhanTrangThai } from '@/components/Chung';
import { PhanTrangQT, TrangQuanTri, TrangThaiTai, useTai } from '@/components/QuanTri';
import { ngayGio, TRANG_THAI_DON, TEN_PHUONG_THUC, vnd } from '@/lib/dinh-dang';
import { useSearchParams } from 'next/navigation';

function Noi() {
  const [trangThai, setTrangThai] = useState(useSearchParams().get('trangThai') || '');
  const [tuKhoa, setTuKhoa] = useState('');
  const [tk, setTk] = useState('');
  const [trang, setTrang] = useState(1);
  const q = new URLSearchParams({ trang: String(trang), kichThuoc: '20', ...(trangThai ? { trangThai } : {}), ...(tk ? { tuKhoa: tk } : {}) });
  const { du, dang, loi } = useTai<any>('/api/quan-tri/don-hang?' + q);
  return (
    <TrangQuanTri tieuDe="Đơn hàng">
      <form className="thanh-cong-cu" onSubmit={(e) => { e.preventDefault(); setTrang(1); setTk(tuKhoa.trim()); }}>
        <select className="o" value={trangThai} onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}>
          <option value="">Tất cả trạng thái</option>{Object.entries(TRANG_THAI_DON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="o" placeholder="Mã đơn, email, SĐT, tên…" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
        <button className="nut">Tìm</button>
      </form>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && (<>
          <div className="bang-boc"><table className="bang"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Thanh toán</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {du.danhSach.length === 0 && <tr><td colSpan={6} className="mo giua">Không có đơn hàng.</td></tr>}
              {du.danhSach.map((x: any) => (
                <tr key={x.maDonHienThi}>
                  <td><Link className="nut-chu" href={'/quan-tri/don-hang/' + x.maDonHienThi}><b>{x.maDonHienThi}</b></Link>{x.doiTraChoDuyet > 0 && <span className="nhan-tt vang" style={{ marginLeft: 6 }}>Đổi/trả</span>}</td>
                  <td>{x.tenNguoiNhan}<div className="nho mo">{x.email} · {x.soDienThoai}</div></td>
                  <td>{ngayGio(x.ngayDat)}</td><td className="nho">{TEN_PHUONG_THUC[x.phuongThucThanhToan] || x.phuongThucThanhToan}</td>
                  <td><b>{vnd(x.tongThanhToan)}</b></td><td><NhanTrangThai ma={x.trangThai} ten={TRANG_THAI_DON[x.trangThai]} /></td>
                </tr>))}
            </tbody></table></div>
          <PhanTrangQT trang={trang} tong={du.tong} kichThuoc={du.kichThuoc} doi={setTrang} />
        </>)}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
export default function DonHangQT() { return <Suspense fallback={<DangTai />}><Noi /></Suspense>; }
