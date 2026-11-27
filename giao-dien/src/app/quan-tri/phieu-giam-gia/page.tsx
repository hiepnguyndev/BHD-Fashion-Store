'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Chung';
import { TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/QuanTri';
import { goi } from '@/lib/api';
import { ngayGio, sangDatetimeLocal, sangUtc, vnd } from '@/lib/dinh-dang';

const RONG = { maCode: '', moTa: '', loaiGiam: 'PhanTram', giaTriGiam: 10, giamToiDa: '', donToiThieu: 0, soLuong: '', gioiHanMoiNguoi: 1, ngayBatDau: '', ngayKetThuc: '', hoatDong: true, congKhai: false };

export default function PhieuGiamGiaQT() {
  const { du, dang, loi, tai } = useTai<any[]>('/api/quan-tri/phieu-giam-gia');
  const thucHien = useThucHien();
  const [f, setF] = useState<any>(null);
  const [ma, setMa] = useState<number | null>(null);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const mo = (p?: any) => {
    setMa(p ? p.maPhieuGiamGia : null);
    setF(p ? { ...RONG, ...p, giamToiDa: p.giamToiDa ?? '', soLuong: p.soLuong ?? '', moTa: p.moTa ?? '', ngayBatDau: sangDatetimeLocal(p.ngayBatDau), ngayKetThuc: sangDatetimeLocal(p.ngayKetThuc) } : { ...RONG });
  };
  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { maCode: f.maCode.trim(), moTa: f.moTa || null, loaiGiam: f.loaiGiam, giaTriGiam: Number(f.giaTriGiam), giamToiDa: f.giamToiDa === '' ? null : Number(f.giamToiDa), donToiThieu: Number(f.donToiThieu) || 0, soLuong: f.soLuong === '' ? null : Number(f.soLuong), gioiHanMoiNguoi: Number(f.gioiHanMoiNguoi) || 1, ngayBatDau: sangUtc(f.ngayBatDau), ngayKetThuc: sangUtc(f.ngayKetThuc), hoatDong: !!f.hoatDong, congKhai: !!f.congKhai };
    if (await thucHien(() => goi('/api/quan-tri/phieu-giam-gia' + (ma ? '/' + ma : ''), { method: ma ? 'PUT' : 'POST', body }), 'Đã lưu mã giảm giá.')) { setF(null); tai(); }
  }
  const bay = Date.now();
  return (
    <TrangQuanTri tieuDe="Mã giảm giá" hanhDong={<button className="nut" onClick={() => mo()}>+ Tạo mã</button>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Mã</th><th>Giảm</th><th>Đơn tối thiểu</th><th>Đã dùng</th><th>Hiệu lực</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {du.length === 0 && <tr><td colSpan={7} className="giua mo">Chưa có mã giảm giá.</td></tr>}
            {du.map((p) => {
              const hetHan = new Date(p.ngayKetThuc + 'Z').getTime() < bay;
              return (
                <tr key={p.maPhieuGiamGia}>
                  <td><b>{p.maCode}</b><div className="nho mo">{p.moTa}</div></td>
                  <td>{p.loaiGiam === 'PhanTram' ? p.giaTriGiam + '%' : vnd(p.giaTriGiam)}{p.giamToiDa ? <div className="nho mo">tối đa {vnd(p.giamToiDa)}</div> : null}</td>
                  <td>{vnd(p.donToiThieu)}</td><td>{p.daDung}{p.soLuong != null ? ' / ' + p.soLuong : ''}</td>
                  <td className="nho">{ngayGio(p.ngayBatDau)}<br />→ {ngayGio(p.ngayKetThuc)}</td>
                  <td><NhanTrangThai ma={!p.hoatDong ? 'An' : hetHan ? 'HetHan' : 'HienThi'} ten={!p.hoatDong ? 'Tạm tắt' : hetHan ? 'Hết hạn' : 'Đang chạy'} /></td>
                  <td><button className="nut-chu" onClick={() => mo(p)}>Sửa</button></td>
                </tr>);
            })}
          </tbody></table></div>}
      </TrangThaiTai>
      {f && (
        <HopThoai tieuDe={ma ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'} dong={() => setF(null)}>
          <form onSubmit={luu}>
            <div className="luoi-2">
              <Truong nhan="Mã (khách nhập)" goiY="3–30 ký tự chữ, số, gạch."><input required pattern="[A-Za-z0-9_\-]{3,30}" value={f.maCode} onChange={(e) => dat('maCode', e.target.value.toUpperCase())} /></Truong>
              <Truong nhan="Loại giảm"><select value={f.loaiGiam} onChange={(e) => dat('loaiGiam', e.target.value)}><option value="PhanTram">Phần trăm (%)</option><option value="SoTien">Số tiền (₫)</option></select></Truong>
              <Truong nhan={f.loaiGiam === 'PhanTram' ? 'Giá trị giảm (1–100 %)' : 'Số tiền giảm (₫)'}><input type="number" required min={1} max={f.loaiGiam === 'PhanTram' ? 100 : undefined} value={f.giaTriGiam} onChange={(e) => dat('giaTriGiam', e.target.value)} /></Truong>
              <Truong nhan="Giảm tối đa (₫, để trống = không giới hạn)"><input type="number" min={0} value={f.giamToiDa} onChange={(e) => dat('giamToiDa', e.target.value)} /></Truong>
              <Truong nhan="Đơn tối thiểu (₫)"><input type="number" min={0} value={f.donToiThieu} onChange={(e) => dat('donToiThieu', e.target.value)} /></Truong>
              <Truong nhan="Tổng số lượt dùng (trống = không giới hạn)"><input type="number" min={1} value={f.soLuong} onChange={(e) => dat('soLuong', e.target.value)} /></Truong>
              <Truong nhan="Số lần tối đa mỗi người"><input type="number" min={1} value={f.gioiHanMoiNguoi} onChange={(e) => dat('gioiHanMoiNguoi', e.target.value)} /></Truong>
              <div />
              <Truong nhan="Bắt đầu"><input type="datetime-local" required value={f.ngayBatDau} onChange={(e) => dat('ngayBatDau', e.target.value)} /></Truong>
              <Truong nhan="Kết thúc"><input type="datetime-local" required value={f.ngayKetThuc} onChange={(e) => dat('ngayKetThuc', e.target.value)} /></Truong>
            </div>
            <Truong nhan="Mô tả"><input maxLength={300} value={f.moTa} onChange={(e) => dat('moTa', e.target.value)} /></Truong>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.hoatDong} onChange={(e) => dat('hoatDong', e.target.checked)} />Đang hoạt động</label>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.congKhai} onChange={(e) => dat('congKhai', e.target.checked)} />Hiển thị công khai ở trang Ưu đãi</label>
            <button className="nut">Lưu</button>
          </form>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
