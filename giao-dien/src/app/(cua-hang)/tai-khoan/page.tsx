'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { HopThoai } from '@/components/Chung';
import { useAuth, useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';
import { TINH_THANH_PHO } from '@/lib/dinh-dang';

const DC_RONG = { tenNguoiNhan: '', soDienThoai: '', diaChiCuThe: '', phuongXa: '', tinhThanh: 'TP. Hồ Chí Minh', macDinh: false };

export default function TrangTaiKhoan() {
  const { nguoiDung, taiLai, dangXuat } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const loi = (e: unknown) => toast(e instanceof LoiApi ? e.message : 'Có lỗi xảy ra.', 'loi');

  const [hoTen, setHoTen] = useState(nguoiDung?.hoTen || '');
  const [sdt, setSdt] = useState(nguoiDung?.soDienThoai || '');
  const [mkCu, setMkCu] = useState('');
  const [mkMoi, setMkMoi] = useState('');
  const [dsDc, setDsDc] = useState<any[]>([]);
  const [sua, setSua] = useState<any>(null);
  const [moXoa, setMoXoa] = useState(false);
  const [mkXoa, setMkXoa] = useState('');

  const taiDc = useCallback(() => goi<any[]>('/api/nguoi-dung/toi/dia-chi').then(setDsDc).catch(() => {}), []);
  useEffect(() => { taiDc(); }, [taiDc]);

  async function luuHoSo(e: React.FormEvent) {
    e.preventDefault();
    try { await goi('/api/nguoi-dung/toi', { method: 'PUT', body: { hoTen: hoTen.trim(), soDienThoai: sdt.trim() || null } }); await taiLai(); toast('Đã lưu thông tin.', 'ok'); } catch (er) { loi(er); }
  }
  async function doiMk(e: React.FormEvent) {
    e.preventDefault();
    try { await goi('/api/nguoi-dung/toi/mat-khau', { method: 'PUT', body: { matKhauCu: mkCu, matKhauMoi: mkMoi } }); setMkCu(''); setMkMoi(''); toast('Đã đổi mật khẩu.', 'ok'); } catch (er) { loi(er); }
  }
  async function luuDc(e: React.FormEvent) {
    e.preventDefault();
    const { maDiaChi, ...body } = sua;
    try { await goi('/api/nguoi-dung/toi/dia-chi' + (maDiaChi ? '/' + maDiaChi : ''), { method: maDiaChi ? 'PUT' : 'POST', body: { ...body, maPhuongXa: null, maTinhThanh: null } }); setSua(null); taiDc(); toast('Đã lưu địa chỉ.', 'ok'); } catch (er) { loi(er); }
  }
  async function xoaDc(ma: number) {
    if (!confirm('Xóa địa chỉ này?')) return;
    try { await goi('/api/nguoi-dung/toi/dia-chi/' + ma, { method: 'DELETE' }); taiDc(); } catch (er) { loi(er); }
  }
  async function xuat() {
    try {
      const r = await fetch('/api/nguoi-dung/toi/xuat-du-lieu', { credentials: 'same-origin' });
      if (!r.ok) throw new LoiApi('Không xuất được dữ liệu.', r.status);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = 'du-lieu-ca-nhan.json'; a.click(); URL.revokeObjectURL(url);
    } catch (er) { loi(er); }
  }
  async function xoaTk(e: React.FormEvent) {
    e.preventDefault();
    try { await goi('/api/nguoi-dung/toi', { method: 'DELETE', body: { matKhau: mkXoa } }); await dangXuat(); toast('Tài khoản đã được xóa.', 'ok'); router.push('/'); router.refresh(); } catch (er) { loi(er); }
  }

  return (
    <div className="luoi">
      <form className="the" onSubmit={luuHoSo}>
        <h2>Thông tin cá nhân</h2>
        {!nguoiDung?.emailDaXacThuc && <div className="thong-bao-tin">Email của bạn chưa được xác thực.</div>}
        <div className="truong"><label>Email</label><input value={nguoiDung?.email || ''} disabled /></div>
        <div className="luoi-2">
          <div className="truong"><label htmlFor="ht">Họ và tên</label><input id="ht" required minLength={2} maxLength={100} value={hoTen} onChange={(e) => setHoTen(e.target.value)} /></div>
          <div className="truong"><label htmlFor="sdt">Số điện thoại</label><input id="sdt" pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" value={sdt} onChange={(e) => setSdt(e.target.value)} /></div>
        </div>
        <button className="nut">Lưu thay đổi</button>
      </form>

      <section className="the">
        <div className="hang giua-hang"><h2 style={{ margin: 0 }}>Sổ địa chỉ</h2><button className="nut vien nho" onClick={() => setSua({ ...DC_RONG, tenNguoiNhan: nguoiDung?.hoTen || '', soDienThoai: nguoiDung?.soDienThoai || '' })}>+ Thêm địa chỉ</button></div>
        {dsDc.length === 0 && <p className="mo cach">Bạn chưa lưu địa chỉ nào.</p>}
        {dsDc.map((d) => (
          <div key={d.maDiaChi} className="hang giua-hang" style={{ padding: '12px 0', borderTop: '1px solid var(--vien)', alignItems: 'flex-start' }}>
            <div><b>{d.tenNguoiNhan}</b> · {d.soDienThoai} {d.macDinh && <span className="nhan-tt xanh">Mặc định</span>}<div className="nho mo">{d.diaChiCuThe}, {d.phuongXa}, {d.tinhThanh}</div></div>
            <div className="hang"><button className="nut-chu nho" onClick={() => setSua({ ...d })}>Sửa</button><button className="nut-chu nho" onClick={() => xoaDc(d.maDiaChi)}>Xóa</button></div>
          </div>
        ))}
      </section>

      <form className="the" onSubmit={doiMk}>
        <h2>Đổi mật khẩu</h2>
        <div className="luoi-2">
          <div className="truong"><label htmlFor="mc">Mật khẩu hiện tại</label><input id="mc" type="password" required autoComplete="current-password" value={mkCu} onChange={(e) => setMkCu(e.target.value)} /></div>
          <div className="truong"><label htmlFor="mm">Mật khẩu mới</label><input id="mm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={mkMoi} onChange={(e) => setMkMoi(e.target.value)} /></div>
        </div>
        <button className="nut">Đổi mật khẩu</button>
      </form>

      <section className="the">
        <h2>Dữ liệu cá nhân của bạn</h2>
        <p className="mo">Bạn có quyền tải về bản sao dữ liệu của mình và yêu cầu xóa tài khoản. Thông tin đơn hàng có thể được giữ lại theo quy định về kế toán, thuế.</p>
        <div className="hang"><button className="nut vien" onClick={xuat}>Tải dữ liệu của tôi</button><button className="nut do vien" onClick={() => setMoXoa(true)}>Xóa tài khoản</button></div>
      </section>

      {sua && (
        <HopThoai tieuDe={sua.maDiaChi ? 'Sửa địa chỉ' : 'Thêm địa chỉ'} dong={() => setSua(null)}>
          <form onSubmit={luuDc}>
            <div className="luoi-2">
              <div className="truong"><label>Người nhận</label><input required minLength={2} maxLength={100} value={sua.tenNguoiNhan} onChange={(e) => setSua({ ...sua, tenNguoiNhan: e.target.value })} /></div>
              <div className="truong"><label>Số điện thoại</label><input required pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" value={sua.soDienThoai} onChange={(e) => setSua({ ...sua, soDienThoai: e.target.value })} /></div>
            </div>
            <div className="truong"><label>Số nhà, tên đường</label><input required minLength={3} maxLength={255} value={sua.diaChiCuThe} onChange={(e) => setSua({ ...sua, diaChiCuThe: e.target.value })} /></div>
            <div className="luoi-2">
              <div className="truong"><label>Phường / xã</label><input required maxLength={100} value={sua.phuongXa} onChange={(e) => setSua({ ...sua, phuongXa: e.target.value })} /></div>
              <div className="truong"><label>Tỉnh / thành phố</label><select value={sua.tinhThanh} onChange={(e) => setSua({ ...sua, tinhThanh: e.target.value })}>{TINH_THANH_PHO.map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={!!sua.macDinh} onChange={(e) => setSua({ ...sua, macDinh: e.target.checked })} />Đặt làm địa chỉ mặc định</label>
            <button className="nut">Lưu địa chỉ</button>
          </form>
        </HopThoai>
      )}
      {moXoa && (
        <HopThoai tieuDe="Xóa tài khoản" dong={() => setMoXoa(false)}>
          <form onSubmit={xoaTk}>
            <p>Hành động này <b>không thể hoàn tác</b>. Thông tin cá nhân của bạn sẽ được ẩn danh hóa. Nhập mật khẩu để xác nhận.</p>
            <div className="truong"><label htmlFor="mx">Mật khẩu</label><input id="mx" type="password" required value={mkXoa} onChange={(e) => setMkXoa(e.target.value)} autoComplete="current-password" /></div>
            <button className="nut do">Xóa vĩnh viễn tài khoản</button>
          </form>
        </HopThoai>
      )}
    </div>
  );
}
