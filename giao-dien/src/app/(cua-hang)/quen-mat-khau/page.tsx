'use client';
import Link from 'next/link';
import { useState } from 'react';
import { goi, LoiApi } from '@/lib/api';

export default function QuenMatKhau() {
  const [email, setEmail] = useState('');
  const [xong, setXong] = useState(false);
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(false);
  async function gui(e: React.FormEvent) {
    e.preventDefault(); setLoi(''); setDang(true);
    try { await goi('/api/nguoi-dung/quen-mat-khau', { method: 'POST', body: { email: email.trim() } }); setXong(true); }
    catch (err) { setLoi(err instanceof LoiApi ? err.message : 'Có lỗi xảy ra.'); }
    finally { setDang(false); }
  }
  return (
    <div className="xac-thuc-khung">
      <h1 className="giua">Quên mật khẩu</h1>
      {xong ? <div className="the"><div className="thong-bao-ok">Nếu email này có tài khoản, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong thời gian ngắn.</div><Link className="nut vien rong" href="/dang-nhap">Về trang đăng nhập</Link></div> : (
        <form className="the" onSubmit={gui}>
          <p className="mo">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.</p>
          <div className="truong"><label htmlFor="em">Email</label><input id="em" type="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {loi && <div className="thong-bao-loi">{loi}</div>}
          <button className="nut rong" disabled={dang}>{dang ? 'Đang gửi…' : 'Gửi liên kết'}</button>
        </form>
      )}
    </div>
  );
}
