'use client';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Common';
import { AnhNhap, TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { ngayGio, sangDatetimeLocal, sangUtc } from '@/lib/format';

const RONG = { tieuDe: '', tomTat: '', noiDung: '', anhBia: '', hienThi: true, ngayDang: '' };

export default function TinTucQT() {
  const { du, dang, loi, tai } = useTai<any[]>('/api/quan-tri/tin-tuc');
  const thucHien = useThucHien();
  const [f, setF] = useState<any>(null);
  const [ma, setMa] = useState<number | null>(null);
  const dat = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function mo(b?: any) {
    if (!b) { setMa(null); setF({ ...RONG }); return; }
    let ct: any = null;
    if (!(await thucHien(async () => { ct = await goi<any>('/api/quan-tri/tin-tuc/' + b.maTinTuc); }, ''))) return;
    setMa(ct.maTinTuc);
    setF({ tieuDe: ct.tieuDe, tomTat: ct.tomTat ?? '', noiDung: ct.noiDung, anhBia: ct.anhBia ?? '', hienThi: ct.hienThi, ngayDang: sangDatetimeLocal(ct.ngayDang) });
  }
  async function luu(e: React.FormEvent) {
    e.preventDefault();
    const body = { tieuDe: f.tieuDe, tomTat: f.tomTat || null, noiDung: f.noiDung, anhBia: f.anhBia || null, hienThi: !!f.hienThi, ngayDang: sangUtc(f.ngayDang) };
    if (await thucHien(() => goi('/api/quan-tri/tin-tuc' + (ma ? '/' + ma : ''), { method: ma ? 'PUT' : 'POST', body }), ma ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết.')) { setF(null); tai(); }
  }
  return (
    <TrangQuanTri tieuDe="Tin tức" hanhDong={<button className="nut" onClick={() => mo()}>+ Đăng bài</button>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!du}>
        {du && <div className="bang-boc"><table className="bang"><thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Ngày đăng</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {du.length === 0 && <tr><td colSpan={5} className="giua mo">Chưa có bài viết. Bấm “Đăng bài” để tạo bài đầu tiên.</td></tr>}
            {du.map((b) => (
              <tr key={b.maTinTuc}>
                <td style={{ width: 90 }}>{b.anhBia && <img src={b.anhBia} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 8 }} />}</td>
                <td><b>{b.tieuDe}</b><div className="nho mo">/news/{b.duongDan}</div></td>
                <td>{ngayGio(b.ngayDang)}</td>
                <td><NhanTrangThai ma={b.hienThi ? 'HienThi' : 'An'} ten={b.hienThi ? 'Đang hiển thị' : 'Ẩn'} /></td>
                <td className="hang" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <a className="nut-chu" href={'/news/' + b.duongDan} target="_blank" rel="noreferrer">Xem</a>
                  <button className="nut-chu" onClick={() => mo(b)}>Sửa</button>
                  <button className="nut-chu" onClick={async () => { if (confirm('Xóa bài viết này?') && await thucHien(() => goi('/api/quan-tri/tin-tuc/' + b.maTinTuc, { method: 'DELETE' }), 'Đã xóa.')) tai(); }}>Xóa</button>
                </td>
              </tr>))}
          </tbody></table></div>}
      </TrangThaiTai>
      {f && (
        <HopThoai tieuDe={ma ? 'Sửa bài viết' : 'Đăng bài viết'} dong={() => setF(null)} rong>
          <form onSubmit={luu}>
            <Truong nhan="Tiêu đề"><input required maxLength={200} value={f.tieuDe} onChange={(e) => dat('tieuDe', e.target.value)} /></Truong>
            <Truong nhan="Tóm tắt (hiện ở danh sách)"><textarea rows={2} maxLength={500} value={f.tomTat} onChange={(e) => dat('tomTat', e.target.value)} /></Truong>
            <Truong nhan="Ảnh bìa (không bắt buộc)"><AnhNhap gia={f.anhBia} doi={(v) => dat('anhBia', v)} /></Truong>
            <Truong nhan="Nội dung" goiY="Mỗi đoạn cách nhau một dòng trống. Dòng bắt đầu bằng “## ” là tiêu đề phụ."><textarea required rows={12} value={f.noiDung} onChange={(e) => dat('noiDung', e.target.value)} /></Truong>
            <div className="luoi-3">
              <Truong nhan="Ngày đăng (trống = bây giờ)" goiY="Đặt ngày trong tương lai để hẹn giờ đăng."><input type="datetime-local" value={f.ngayDang} onChange={(e) => dat('ngayDang', e.target.value)} /></Truong>
            </div>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!f.hienThi} onChange={(e) => dat('hienThi', e.target.checked)} />Hiển thị trên cửa hàng</label>
            <button className="nut">{ma ? 'Lưu thay đổi' : 'Đăng bài'}</button>
          </form>
        </HopThoai>
      )}
    </TrangQuanTri>
  );
}
