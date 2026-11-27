'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { DangTai } from '@/components/Common';
import { useAuth, useGio } from '@/components/Providers';
import { LoiApi } from '@/lib/api';
import { diaChiTiepHopLe } from '@/lib/format';

function Form() {
  const { dangNhap } = useAuth();
  const { taiLai } = useGio();
  const router = useRouter();
  const tiep = diaChiTiepHopLe(useSearchParams().get('tiep'));
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(false);
  const [chuaXacThuc, setChuaXacThuc] = useState(false);
  const [daGui, setDaGui] = useState(false);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(''); setDang(true); setChuaXacThuc(false);
    try {
      const nd = await dangNhap(email.trim(), matKhau);
      await taiLai();
      router.push(tiep || (nd.vaiTro === 'QuanTri' ? '/quan-tri' : '/'));
      router.refresh();
    } catch (err) {
      const m = err instanceof LoiApi ? err.message : 'Không đăng nhập được.';
      setLoi(m); setChuaXacThuc(/xác thực/i.test(m));
    } finally { setDang(false); }
  }
  async function guiLai() {
    try { await fetch('/api/nguoi-dung/gui-lai-xac-thuc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) }); } catch { /* bỏ qua */ }
    setDaGui(true);
  }
  return (
    <div className="xac-thuc-khung">
      <h1 className="giua">Đăng nhập</h1>
      <form className="the" onSubmit={gui}>
        <div className="truong"><label htmlFor="em">Email</label><input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="truong"><label htmlFor="mk">Mật khẩu</label><input id="mk" type="password" required autoComplete="current-password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} /></div>
        {loi && <div className="thong-bao-loi">{loi}</div>}
        {chuaXacThuc && !daGui && <p className="nho"><button type="button" className="nut-chu" onClick={guiLai}>Gửi lại email xác thực</button></p>}
        {daGui && <div className="thong-bao-ok">Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi lại liên kết.</div>}
        <button className="nut rong" disabled={dang}>{dang ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="nho giua cach"><Link className="nut-chu" href="/quen-mat-khau">Quên mật khẩu?</Link></p>
      </form>
      <p className="giua mo">Chưa có tài khoản? <Link className="nut-chu" href="/dang-ky">Đăng ký</Link></p>
    </div>
  );
}
export default function DangNhap() { return <Suspense fallback={<DangTai />}><Form /></Suspense>; }
