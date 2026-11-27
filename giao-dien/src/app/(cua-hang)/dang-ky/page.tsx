'use client';
import Link from 'next/link';
import { useState } from 'react';
import { goi, LoiApi } from '@/lib/api';

export default function DangKy() {
  const [f, setF] = useState({ hoTen: '', email: '', matKhau: '', soDienThoai: '' });
  const [dongY, setDongY] = useState(false);
  const [loi, setLoi] = useState('');
  const [xong, setXong] = useState(false);
  const [dang, setDang] = useState(false);
  const dat = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(''); setDang(true);
    try {
      await goi('/api/nguoi-dung/dang-ky', { method: 'POST', body: { hoTen: f.hoTen.trim(), email: f.email.trim(), matKhau: f.matKhau, soDienThoai: f.soDienThoai.trim() || null, dongYChinhSach: dongY } });
      setXong(true);
    } catch (err) { setLoi(err instanceof LoiApi ? err.message : 'Không đăng ký được.'); }
    finally { setDang(false); }
  }
  if (xong) return (
    <div className="xac-thuc-khung giua"><div className="dau-tick">✉</div><h1>Kiểm tra email của bạn</h1>
      <p className="mo">Chúng tôi đã gửi liên kết xác thực tới <b>{f.email}</b>. Bấm vào liên kết để kích hoạt tài khoản.</p>
      <Link className="nut vien" href="/dang-nhap">Về trang đăng nhập</Link></div>
  );
  return (
    <div className="xac-thuc-khung">
      <h1 className="giua">Tạo tài khoản</h1>
      <form className="the" onSubmit={gui}>
        <div className="truong"><label htmlFor="ht">Họ và tên</label><input id="ht" required minLength={2} maxLength={100} autoComplete="name" value={f.hoTen} onChange={(e) => dat('hoTen', e.target.value)} /></div>
        <div className="truong"><label htmlFor="em">Email</label><input id="em" type="email" required maxLength={150} autoComplete="email" value={f.email} onChange={(e) => dat('email', e.target.value)} /></div>
        <div className="truong"><label htmlFor="sdt">Số điện thoại (không bắt buộc)</label><input id="sdt" inputMode="tel" pattern="0[0-9]{9}" title="10 chữ số, bắt đầu bằng 0" autoComplete="tel" value={f.soDienThoai} onChange={(e) => dat('soDienThoai', e.target.value)} /></div>
        <div className="truong"><label htmlFor="mk">Mật khẩu</label><input id="mk" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.matKhau} onChange={(e) => dat('matKhau', e.target.value)} /><span className="goi-y">Tối thiểu 8 ký tự.</span></div>
        <label className="chon-dong" style={{ marginBottom: 14 }}><input type="checkbox" checked={dongY} onChange={(e) => setDongY(e.target.checked)} required /><span>Tôi đồng ý với <Link className="nut-chu" href="/chinh-sach/dieu-khoan" target="_blank">điều khoản sử dụng</Link> và cho phép xử lý dữ liệu cá nhân theo <Link className="nut-chu" href="/chinh-sach/bao-mat" target="_blank">chính sách bảo vệ dữ liệu</Link>.</span></label>
        {loi && <div className="thong-bao-loi">{loi}</div>}
        <button className="nut rong" disabled={dang || !dongY}>{dang ? 'Đang tạo…' : 'Đăng ký'}</button>
      </form>
      <p className="giua mo">Đã có tài khoản? <Link className="nut-chu" href="/dang-nhap">Đăng nhập</Link></p>
    </div>
  );
}
