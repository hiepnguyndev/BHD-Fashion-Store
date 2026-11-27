'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DangTai, NhanTrangThai, Trong } from '@/components/Common';
import { goi } from '@/lib/api';
import { ngayGio, TRANG_THAI_DON, vnd } from '@/lib/format';

export default function DonHangCuaToi() {
  const [trang, setTrang] = useState(1);
  const [d, setD] = useState<any>(null);
  const [loi, setLoi] = useState('');
  useEffect(() => { setD(null); goi('/api/don-hang?trang=' + trang + '&kichThuoc=10').then(setD).catch((e) => setLoi(e.message)); }, [trang]);
  if (loi) return <div className="thong-bao-loi">{loi}</div>;
  if (!d) return <DangTai />;
  if (d.danhSach.length === 0) return <Trong tieuDe="Bạn chưa có đơn hàng nào"><Link className="nut" href="/san-pham">Bắt đầu mua sắm</Link></Trong>;
  const soTrang = Math.ceil(d.tong / d.kichThuoc);
  return (
    <div>
      <h1>Đơn hàng của tôi</h1>
      <div className="bang-boc"><table className="bang"><thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{d.danhSach.map((x: any) => (
          <tr key={x.maDonHang}><td><b>{x.maDonHienThi}</b></td><td>{ngayGio(x.ngayDat)}</td><td>{vnd(x.tongThanhToan)}</td><td><NhanTrangThai ma={x.trangThai} ten={TRANG_THAI_DON[x.trangThai]} /></td><td><Link className="nut-chu" href={'/tai-khoan/don-hang/' + x.maDonHienThi}>Chi tiết</Link></td></tr>
        ))}</tbody></table></div>
      {soTrang > 1 && <div className="phan-trang">{Array.from({ length: soTrang }, (_, i) => i + 1).map((t) => <button key={t} className={'chip' + (t === trang ? ' dang' : '')} onClick={() => setTrang(t)}>{t}</button>)}</div>}
    </div>
  );
}
