'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Common';
import { TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';

const RONG = { maDanhMucCha: '', tenDanhMuc: '', moTa: '', thuTu: 0, hienThi: true };

export default function DanhMucQT() {
  const { du, dang, loi, tai } = useTai<any[]>('/api/quan-tri/danh-muc');
  const thucHien = useThucHien();
  const [f, setF] = useState<any>(null);
  const [ma, setMa] = useState<number | null>(null);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const mo = (d?: any) => { setMa(d ? d.maDanhMuc : null); setF(d ? { ...RONG, ...d, maDanhMucCha: d.maDanhMucCha ?? '', moTa: d.moTa ?? '' } : { ...RONG }); };
  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { maDanhMucCha: f.maDanhMucCha === '' ? null : Number(f.maDanhMucCha), tenDanhMuc: f.tenDanhMuc, moTa: f.moTa || null, thuTu: Number(f.thuTu) || 0, hienThi: !!f.hienThi };
    if (await thucHien(() => goi('/api/quan-tri/danh-muc' + (ma ? '/' + ma : ''), { method: ma ? 'PUT' : 'POST', body }), 'Đã lưu danh mục.')) { setF(null); tai(); }
  }
  const goc = (du ?? []).filter((d) => !d.maDanhMucCha);
  return (
    <TrangQuanTri tieuDe="Danh mục" hanhDong={<button className="nut" onClick={() => mo()}>+ Thêm danh mục</button>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Tên</th><th>Đường dẫn</th><th>Thứ tự</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {du.length === 0 && <tr><td colSpan={5} className="giua mo">Chưa có danh mục. Cần tạo ít nhất một danh mục trước khi thêm sản phẩm.</td></tr>}
            {[...goc.flatMap((g) => [g, ...du.filter((c) => c.maDanhMucCha === g.maDanhMuc)]), ...du.filter((c) => c.maDanhMucCha && !goc.some((g) => g.maDanhMuc === c.maDanhMucCha))].map((d) => (
              <tr key={d.maDanhMuc}>
                <td style={{ paddingLeft: d.maDanhMucCha ? 32 : undefined }}>{d.maDanhMucCha ? '↳ ' : ''}<b>{d.tenDanhMuc}</b></td><td className="nho">{d.duongDan}</td><td>{d.thuTu}</td>
                <td><NhanTrangThai ma={d.hienThi ? 'HienThi' : 'An'} ten={d.hienThi ? 'Hiển thị' : 'Ẩn'} /></td>
                <td className="hang" style={{ gap: 6, flexWrap: 'nowrap' }}><button className="nut-chu" onClick={() => mo(d)}>Sửa</button><button className="nut-chu" onClick={async () => { if (confirm('Xóa danh mục này? Chỉ xóa được khi không còn sản phẩm/danh mục con.') && await thucHien(() => goi('/api/quan-tri/danh-muc/' + d.maDanhMuc, { method: 'DELETE' }), 'Đã xóa.')) tai(); }}>Xóa</button></td>
              </tr>))}
          </tbody></table></div>}
      </TrangThaiTai>
      {f && (
        <HopThoai tieuDe={ma ? 'Sửa danh mục' : 'Thêm danh mục'} dong={() => setF(null)}>
          <form onSubmit={luu}>
            <Truong nhan="Tên danh mục"><input required maxLength={100} value={f.tenDanhMuc} onChange={(e) => dat('tenDanhMuc', e.target.value)} /></Truong>
            <Truong nhan="Danh mục cha"><select value={f.maDanhMucCha} onChange={(e) => dat('maDanhMucCha', e.target.value)}><option value="">— Không (danh mục gốc) —</option>{goc.filter((g) => g.maDanhMuc !== ma).map((g) => <option key={g.maDanhMuc} value={g.maDanhMuc}>{g.tenDanhMuc}</option>)}</select></Truong>
            <Truong nhan="Mô tả"><input maxLength={300} value={f.moTa} onChange={(e) => dat('moTa', e.target.value)} /></Truong>
            <Truong nhan="Thứ tự hiển thị"><input type="number" value={f.thuTu} onChange={(e) => dat('thuTu', e.target.value)} /></Truong>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.hienThi} onChange={(e) => dat('hienThi', e.target.checked)} />Hiển thị</label>
            <button className="nut">Lưu</button>
          </form>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
