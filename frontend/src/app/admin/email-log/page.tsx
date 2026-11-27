'use client';
import { useState } from 'react';
import { NhanTrangThai } from '@/components/Common';
import { TrangQuanTri, TrangThaiTai, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { ngayGio } from '@/lib/format';

export default function NhatKyGuiQT() {
  const [tt, setTt] = useState('');
  const { du, dang, loi, tai } = useTai<any>('/api/quan-tri/nhat-ky-gui' + (tt ? '?trangThai=' + tt : ''));
  const thucHien = useThucHien();
  return (
    <TrangQuanTri tieuDe="Email đã gửi">
      <div className="thanh-cong-cu"><select className="o" value={tt} onChange={(e) => setTt(e.target.value)}><option value="">Tất cả</option><option value="ChoGui">Chờ gửi lại</option><option value="DaGui">Đã gửi</option><option value="Loi">Lỗi</option></select></div>
      <p className="nho mo">Email chứa liên kết bí mật (xác thực, đặt lại mật khẩu) không được lưu nội dung nên không gửi lại được, khách cần yêu cầu lại.</p>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Thời gian</th><th>Người nhận</th><th>Mẫu</th><th>Tham chiếu</th><th>Trạng thái</th><th>Lỗi</th><th /></tr></thead>
          <tbody>
            {du.danhSach.length === 0 && <tr><td colSpan={7} className="giua mo">Chưa có email nào.</td></tr>}
            {du.danhSach.map((x: any) => (
              <tr key={x.maNhatKy}><td className="nho">{ngayGio(x.ngayTao)}</td><td>{x.nguoiNhan}</td><td>{x.maMauCode}</td><td className="nho">{x.maThamChieu}</td>
                <td><NhanTrangThai ma={x.trangThai === 'DaGui' ? 'DaThanhToan' : x.trangThai === 'Loi' ? 'HetHan' : 'ChoThanhToan'} ten={{ DaGui: 'Đã gửi', ChoGui: 'Chờ gửi lại', Loi: 'Lỗi' }[x.trangThai as string]} />{x.soLanThu > 1 && <span className="nho mo"> ({x.soLanThu} lần)</span>}</td>
                <td className="nho" style={{ maxWidth: 240 }}>{x.loiCuoi}</td>
                <td>{x.trangThai !== 'DaGui' && <button className="nut vien nho" onClick={async () => { if (await thucHien(() => goi(`/api/quan-tri/nhat-ky-gui/${x.maNhatKy}/gui-lai`, { method: 'POST', body: {} }), 'Đã gửi lại.')) tai(); }}>Gửi lại</button>}</td></tr>))}
          </tbody></table></div>}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
