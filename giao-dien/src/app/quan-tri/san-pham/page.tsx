'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Anh, NhanTrangThai } from '@/components/Chung';
import { PhanTrangQT, TrangQuanTri, TrangThaiTai, useTai } from '@/components/QuanTri';
import { vnd } from '@/lib/dinh-dang';

const TEN_TT: Record<string, string> = { An: 'Ẩn', DangBan: 'Đang bán', NgungBan: 'Ngừng bán' };

export default function SanPhamQT() {
  const [trang, setTrang] = useState(1);
  const [tuKhoa, setTuKhoa] = useState('');
  const [tk, setTk] = useState('');
  const [trangThai, setTrangThai] = useState('');
  const q = new URLSearchParams({ trang: String(trang), kichThuoc: '20', ...(tk ? { tuKhoa: tk } : {}), ...(trangThai ? { trangThai } : {}) });
  const { du, dang, loi } = useTai<any>('/api/quan-tri/san-pham?' + q);
  return (
    <TrangQuanTri tieuDe="Sản phẩm & kho" hanhDong={<Link className="nut" href="/quan-tri/san-pham/moi">+ Thêm sản phẩm</Link>}>
      <form className="thanh-cong-cu" onSubmit={(e) => { e.preventDefault(); setTrang(1); setTk(tuKhoa.trim()); }}>
        <select className="o" value={trangThai} onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}><option value="">Mọi trạng thái</option>{Object.entries(TEN_TT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="o" placeholder="Tên hoặc mã hàng…" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} /><button className="nut">Tìm</button>
      </form>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && (<>
          <div className="bang-boc"><table className="bang"><thead><tr><th /><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn / giữ chỗ</th><th>Đã bán</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {du.danhSach.length === 0 && <tr><td colSpan={7} className="giua mo">Chưa có sản phẩm. Bấm “Thêm sản phẩm” để bắt đầu.</td></tr>}
              {du.danhSach.map((x: any) => (
                <tr key={x.maSanPham}>
                  <td style={{ width: 56 }}><div style={{ width: 44, height: 56, borderRadius: 8, overflow: 'hidden' }}><Anh src={x.anhChinh} alt={x.tenSanPham} /></div></td>
                  <td><Link className="nut-chu" href={'/quan-tri/san-pham/' + x.maSanPham}><b>{x.tenSanPham}</b></Link>{x.noiBat && <span className="nhan-tt vang" style={{ marginLeft: 6 }}>Nổi bật</span>}</td>
                  <td>{x.tenDanhMuc}</td><td>{vnd(x.giaBan)}</td><td>{x.tongTon} / {x.tongGiuCho}</td><td>{x.soLuongDaBan}</td>
                  <td><NhanTrangThai ma={x.trangThai} ten={TEN_TT[x.trangThai]} /></td>
                </tr>))}
            </tbody></table></div>
          <PhanTrangQT trang={trang} tong={du.tong} kichThuoc={du.kichThuoc} doi={setTrang} />
        </>)}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
