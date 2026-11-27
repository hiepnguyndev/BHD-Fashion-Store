'use client';
import { useState } from 'react';
import { NhanTrangThai } from '@/components/Chung';
import { PhanTrangQT, TrangQuanTri, TrangThaiTai, useTai, useThucHien } from '@/components/QuanTri';
import { useAuth } from '@/components/Providers';
import { goi } from '@/lib/api';
import { ngayGio } from '@/lib/dinh-dang';

export default function NguoiDungQT() {
  const { nguoiDung } = useAuth();
  const thucHien = useThucHien();
  const [trang, setTrang] = useState(1);
  const [tuKhoa, setTuKhoa] = useState('');
  const [tk, setTk] = useState('');
  const { du, dang, loi, tai } = useTai<any>(`/api/quan-tri/nguoi-dung?trang=${trang}&kichThuoc=20${tk ? '&tuKhoa=' + encodeURIComponent(tk) : ''}`);
  const doi = async (ma: number, body: any, xacNhan?: string) => { if (xacNhan && !confirm(xacNhan)) return; if (await thucHien(() => goi('/api/quan-tri/nguoi-dung/' + ma, { method: 'PATCH', body }), 'Đã cập nhật.')) tai(); };
  return (
    <TrangQuanTri tieuDe="Người dùng">
      <form className="thanh-cong-cu" onSubmit={(e) => { e.preventDefault(); setTrang(1); setTk(tuKhoa.trim()); }}><input className="o" placeholder="Email, tên, SĐT…" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} /><button className="nut">Tìm</button></form>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && (<>
          <div className="bang-boc"><table className="bang"><thead><tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th /></tr></thead>
            <tbody>{du.danhSach.map((u: any) => {
              const laToi = u.maNguoiDung === nguoiDung?.maNguoiDung;
              return (
                <tr key={u.maNguoiDung}>
                  <td><b>{u.hoTen}</b></td><td>{u.email}{!u.emailDaXacThuc && <span className="nhan-tt vang" style={{ marginLeft: 6 }}>Chưa xác thực</span>}</td><td>{u.soDienThoai}</td>
                  <td><NhanTrangThai ma={u.vaiTro === 'QuanTri' ? 'DaXacNhan' : ''} ten={u.vaiTro === 'QuanTri' ? 'Quản trị' : 'Khách hàng'} /></td>
                  <td><NhanTrangThai ma={u.trangThai} ten={u.trangThai === 'HoatDong' ? 'Hoạt động' : 'Đã khóa'} /></td><td className="nho">{ngayGio(u.lanDangNhapCuoi)}</td>
                  <td className="hang" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    {!laToi && (u.trangThai === 'HoatDong'
                      ? <button className="nut do vien nho" onClick={() => doi(u.maNguoiDung, { trangThai: 'Khoa' }, 'Khóa tài khoản này? Người dùng sẽ bị đăng xuất.')}>Khóa</button>
                      : <button className="nut vien nho" onClick={() => doi(u.maNguoiDung, { trangThai: 'HoatDong' })}>Mở khóa</button>)}
                    {!laToi && <button className="nut vien nho" onClick={() => doi(u.maNguoiDung, { vaiTro: u.vaiTro === 'QuanTri' ? 'KhachHang' : 'QuanTri' }, u.vaiTro === 'QuanTri' ? 'Thu hồi quyền quản trị?' : 'Cấp quyền quản trị cho tài khoản này?')}>{u.vaiTro === 'QuanTri' ? 'Thu hồi QT' : 'Cấp QT'}</button>}
                  </td>
                </tr>);
            })}</tbody></table></div>
          <PhanTrangQT trang={trang} tong={du.tong} kichThuoc={du.kichThuoc} doi={setTrang} />
        </>)}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
