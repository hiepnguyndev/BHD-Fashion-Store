'use client';
import { useState } from 'react';
import { NhanTrangThai, Sao } from '@/components/Chung';
import { PhanTrangQT, TrangQuanTri, TrangThaiTai, useTai, useThucHien } from '@/components/QuanTri';
import { goi } from '@/lib/api';
import { ngayGio } from '@/lib/dinh-dang';

export default function DanhGiaQT() {
  const [tt, setTt] = useState('ChoDuyet');
  const [trang, setTrang] = useState(1);
  const { du, dang, loi, tai } = useTai<any[]>(`/api/quan-tri/danh-gia?trang=${trang}&kichThuoc=20${tt ? '&trangThai=' + tt : ''}`);
  const thucHien = useThucHien();
  const duyet = async (ma: number, trangThai: string) => { if (await thucHien(() => goi('/api/quan-tri/danh-gia/' + ma, { method: 'PATCH', body: { trangThai } }), 'Đã cập nhật.')) tai(); };
  return (
    <TrangQuanTri tieuDe="Đánh giá sản phẩm">
      <div className="thanh-cong-cu"><select className="o" value={tt} onChange={(e) => { setTt(e.target.value); setTrang(1); }}><option value="">Tất cả</option><option value="ChoDuyet">Chờ duyệt</option><option value="HienThi">Đang hiển thị</option><option value="An">Đã ẩn</option></select></div>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && (<>
          {du.length === 0 && <p className="mo">Không có đánh giá.</p>}
          {du.map((d) => (
            <div key={d.maDanhGia} className="the mong" style={{ marginBottom: 10 }}>
              <div className="hang giua-hang"><div><b>{d.tenSanPham}</b> · {d.tenNguoiDanhGia} <Sao diem={d.soSao} /></div><NhanTrangThai ma={d.trangThai === 'ChoDuyet' ? 'ChoDuyet' : d.trangThai === 'HienThi' ? 'HienThi' : 'An'} ten={{ ChoDuyet: 'Chờ duyệt', HienThi: 'Hiển thị', An: 'Đã ẩn' }[d.trangThai as string]} /></div>
              <p style={{ margin: '6px 0' }}>{d.noiDung || <span className="mo">(không có nội dung)</span>}</p>
              <div className="hang giua-hang"><span className="nho mo">{ngayGio(d.ngayTao)}</span>
                <div className="hang">{d.trangThai !== 'HienThi' && <button className="nut nho" onClick={() => duyet(d.maDanhGia, 'HienThi')}>Duyệt hiển thị</button>}{d.trangThai !== 'An' && <button className="nut vien nho" onClick={() => duyet(d.maDanhGia, 'An')}>Ẩn</button>}</div></div>
            </div>))}
          <PhanTrangQT trang={trang} tong={du.length === 20 ? trang * 20 + 1 : trang * 20} kichThuoc={20} doi={setTrang} />
        </>)}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
