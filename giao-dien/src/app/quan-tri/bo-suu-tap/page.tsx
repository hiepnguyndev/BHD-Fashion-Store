'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Chung';
import { AnhNhap, TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/QuanTri';
import { goi } from '@/lib/api';
import { sangDatetimeLocal, sangUtc } from '@/lib/dinh-dang';

const RONG = { tenBoSuuTap: '', moTa: '', anhBia: '', hienThi: true, ngayBatDau: '', ngayKetThuc: '' };

export default function BoSuuTapQT() {
  const { du, dang, loi, tai } = useTai<any[]>('/api/quan-tri/bo-suu-tap');
  const thucHien = useThucHien();
  const [f, setF] = useState<any>(null);
  const [ma, setMa] = useState<number | null>(null);
  const [gan, setGan] = useState<{ c: any; chon: Set<number>; tatCa: any[] } | null>(null);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const mo = (c?: any) => { setMa(c ? c.maBoSuuTap : null); setF(c ? { ...RONG, ...c, moTa: c.moTa ?? '', anhBia: c.anhBia ?? '', ngayBatDau: sangDatetimeLocal(c.ngayBatDau), ngayKetThuc: sangDatetimeLocal(c.ngayKetThuc) } : { ...RONG }); };
  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { tenBoSuuTap: f.tenBoSuuTap, moTa: f.moTa || null, anhBia: f.anhBia || null, hienThi: !!f.hienThi, ngayBatDau: sangUtc(f.ngayBatDau), ngayKetThuc: sangUtc(f.ngayKetThuc) };
    if (await thucHien(() => goi('/api/quan-tri/bo-suu-tap' + (ma ? '/' + ma : ''), { method: ma ? 'PUT' : 'POST', body }), 'Đã lưu bộ sưu tập.')) { setF(null); tai(); }
  }
  async function moGan(c: any) {
    try {
      const [dsHienTai, tat] = await Promise.all([goi<any[]>(`/api/quan-tri/bo-suu-tap/${c.maBoSuuTap}/san-pham`), goi<any>('/api/quan-tri/san-pham?kichThuoc=100')]);
      setGan({ c, chon: new Set(dsHienTai.map((x) => x.maSanPham)), tatCa: tat.danhSach });
    } catch { /* bỏ qua */ }
  }
  return (
    <TrangQuanTri tieuDe="Bộ sưu tập" hanhDong={<button className="nut" onClick={() => mo()}>+ Thêm bộ sưu tập</button>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Tên</th><th>Số sản phẩm</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {du.length === 0 && <tr><td colSpan={4} className="giua mo">Chưa có bộ sưu tập.</td></tr>}
            {du.map((c) => (
              <tr key={c.maBoSuuTap}><td><b>{c.tenBoSuuTap}</b><div className="nho mo">{c.duongDan}</div></td><td>{c.soSanPham}</td>
                <td><NhanTrangThai ma={c.hienThi ? 'HienThi' : 'An'} ten={c.hienThi ? 'Hiển thị' : 'Ẩn'} /></td>
                <td className="hang" style={{ gap: 6, flexWrap: 'nowrap' }}><button className="nut vien nho" onClick={() => moGan(c)}>Chọn sản phẩm</button><button className="nut-chu" onClick={() => mo(c)}>Sửa</button></td></tr>))}
          </tbody></table></div>}
      </TrangThaiTai>
      {f && (
        <HopThoai tieuDe={ma ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập'} dong={() => setF(null)}>
          <form onSubmit={luu}>
            <Truong nhan="Tên"><input required maxLength={150} value={f.tenBoSuuTap} onChange={(e) => dat('tenBoSuuTap', e.target.value)} /></Truong>
            <Truong nhan="Mô tả"><textarea maxLength={500} value={f.moTa} onChange={(e) => dat('moTa', e.target.value)} /></Truong>
            <Truong nhan="Ảnh bìa"><AnhNhap gia={f.anhBia} doi={(v) => dat('anhBia', v)} /></Truong>
            <div className="luoi-2">
              <Truong nhan="Bắt đầu (trống = ngay)"><input type="datetime-local" value={f.ngayBatDau} onChange={(e) => dat('ngayBatDau', e.target.value)} /></Truong>
              <Truong nhan="Kết thúc (trống = vô hạn)"><input type="datetime-local" value={f.ngayKetThuc} onChange={(e) => dat('ngayKetThuc', e.target.value)} /></Truong>
            </div>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.hienThi} onChange={(e) => dat('hienThi', e.target.checked)} />Hiển thị</label>
            <button className="nut">Lưu</button>
          </form>
        </HopThoai>
      )}
      {gan && (
        <HopThoai tieuDe={'Sản phẩm trong: ' + gan.c.tenBoSuuTap} dong={() => setGan(null)}>
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {gan.tatCa.map((s) => (
              <label key={s.maSanPham} className="chon-dong" style={{ padding: '6px 0', borderBottom: '1px solid var(--vien)' }}>
                <input type="checkbox" checked={gan.chon.has(s.maSanPham)} onChange={(e) => { const n = new Set(gan.chon); if (e.target.checked) n.add(s.maSanPham); else n.delete(s.maSanPham); setGan({ ...gan, chon: n }); }} />{s.tenSanPham}
              </label>))}
          </div>
          <button className="nut cach" onClick={async () => { if (await thucHien(() => goi(`/api/quan-tri/bo-suu-tap/${gan.c.maBoSuuTap}/san-pham`, { method: 'PUT', body: { maSanPham: [...gan.chon] } }), 'Đã cập nhật sản phẩm trong bộ sưu tập.')) { setGan(null); tai(); } }}>Lưu ({gan.chon.size} sản phẩm)</button>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
