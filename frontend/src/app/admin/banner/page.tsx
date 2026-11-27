'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Common';
import { AnhNhap, TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { sangDatetimeLocal, sangUtc } from '@/lib/format';

const RONG = { tieuDe: '', duongDanAnh: '', duongDanAnhDienThoai: '', lienKet: '', viTri: 'TrangChu', thuTu: 0, hienThi: true, ngayBatDau: '', ngayKetThuc: '' };

export default function BannerQT() {
  const { du, dang, loi, tai } = useTai<any[]>('/api/quan-tri/banner');
  const thucHien = useThucHien();
  const [f, setF] = useState<any>(null);
  const [ma, setMa] = useState<number | null>(null);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const mo = (b?: any) => { setMa(b ? b.maBanner : null); setF(b ? { ...RONG, ...b, duongDanAnhDienThoai: b.duongDanAnhDienThoai ?? '', lienKet: b.lienKet ?? '', ngayBatDau: sangDatetimeLocal(b.ngayBatDau), ngayKetThuc: sangDatetimeLocal(b.ngayKetThuc) } : { ...RONG }); };
  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { tieuDe: f.tieuDe, duongDanAnh: f.duongDanAnh, duongDanAnhDienThoai: f.duongDanAnhDienThoai || null, lienKet: f.lienKet || null, viTri: f.viTri, thuTu: Number(f.thuTu) || 0, hienThi: !!f.hienThi, ngayBatDau: sangUtc(f.ngayBatDau), ngayKetThuc: sangUtc(f.ngayKetThuc) };
    if (await thucHien(() => goi('/api/quan-tri/banner' + (ma ? '/' + ma : ''), { method: ma ? 'PUT' : 'POST', body }), 'Đã lưu banner.')) { setF(null); tai(); }
  }
  return (
    <TrangQuanTri tieuDe="Banner" hanhDong={<button className="nut" onClick={() => mo()}>+ Thêm banner</button>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Vị trí</th><th>Thứ tự</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {du.length === 0 && <tr><td colSpan={6} className="giua mo">Chưa có banner. Trang chủ sẽ dùng ảnh bìa mặc định.</td></tr>}
            {du.map((b) => (
              <tr key={b.maBanner}>
                <td style={{ width: 90 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={b.duongDanAnh} alt="" style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 8 }} /></td>
                <td><b>{b.tieuDe}</b><div className="nho mo">{b.lienKet}</div></td><td>{b.viTri}</td><td>{b.thuTu}</td>
                <td><NhanTrangThai ma={b.hienThi ? 'HienThi' : 'An'} ten={b.hienThi ? 'Hiển thị' : 'Ẩn'} /></td>
                <td className="hang" style={{ gap: 6, flexWrap: 'nowrap' }}><button className="nut-chu" onClick={() => mo(b)}>Sửa</button><button className="nut-chu" onClick={async () => { if (confirm('Xóa banner này?') && await thucHien(() => goi('/api/quan-tri/banner/' + b.maBanner, { method: 'DELETE' }), 'Đã xóa.')) tai(); }}>Xóa</button></td>
              </tr>))}
          </tbody></table></div>}
      </TrangThaiTai>
      {f && (
        <HopThoai tieuDe={ma ? 'Sửa banner' : 'Thêm banner'} dong={() => setF(null)}>
          <form onSubmit={luu}>
            <Truong nhan="Tiêu đề"><input required maxLength={200} value={f.tieuDe} onChange={(e) => dat('tieuDe', e.target.value)} /></Truong>
            <Truong nhan="Ảnh (máy tính)" goiY="Khuyến nghị ngang, tỉ lệ khoảng 16:9."><AnhNhap gia={f.duongDanAnh} doi={(v) => dat('duongDanAnh', v)} /></Truong>
            <Truong nhan="Ảnh cho điện thoại (không bắt buộc)"><AnhNhap gia={f.duongDanAnhDienThoai} doi={(v) => dat('duongDanAnhDienThoai', v)} /></Truong>
            <Truong nhan="Liên kết khi bấm" goiY="Bắt đầu bằng / (trang trong cửa hàng) hoặc https://. Chỉ liên kết nội bộ hiển thị nút bấm."><input maxLength={300} value={f.lienKet} onChange={(e) => dat('lienKet', e.target.value)} placeholder="/products?noiBat=true" /></Truong>
            <div className="luoi-3">
              <Truong nhan="Vị trí"><select value={f.viTri} onChange={(e) => dat('viTri', e.target.value)}><option value="TrangChu">Trang chủ</option><option value="DanhMuc">Danh mục</option></select></Truong>
              <Truong nhan="Thứ tự"><input type="number" value={f.thuTu} onChange={(e) => dat('thuTu', e.target.value)} /></Truong>
              <div />
              <Truong nhan="Bắt đầu (trống = ngay)"><input type="datetime-local" value={f.ngayBatDau} onChange={(e) => dat('ngayBatDau', e.target.value)} /></Truong>
              <Truong nhan="Kết thúc (trống = vô hạn)"><input type="datetime-local" value={f.ngayKetThuc} onChange={(e) => dat('ngayKetThuc', e.target.value)} /></Truong>
            </div>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.hienThi} onChange={(e) => dat('hienThi', e.target.checked)} />Hiển thị</label>
            <button className="nut">Lưu</button>
          </form>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
