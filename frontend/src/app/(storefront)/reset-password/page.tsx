'use client';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { DangTai } from '@/components/Common';
import { goi, LoiApi } from '@/lib/api';

function Form() {
  const ma = useSearchParams().get('ma') || '';
  const [mk, setMk] = useState('');
  const [mk2, setMk2] = useState('');
  const [loi, setLoi] = useState('');
  const [xong, setXong] = useState(false);
  const [dang, setDang] = useState(false);
  async function gui(e: React.FormEvent) {
    e.preventDefault(); setLoi('');
    if (mk !== mk2) { setLoi('Mật khẩu nhập lại không khớp.'); return; }
    setDang(true);
    try { await goi('/api/nguoi-dung/dat-lai-mat-khau', { method: 'POST', body: { ma, matKhauMoi: mk } }); setXong(true); }
    catch (err) { setLoi(err instanceof LoiApi ? err.message : 'Không đặt lại được mật khẩu.'); }
    finally { setDang(false); }
  }
  if (!ma) return <div className="xac-thuc-khung"><div className="thong-bao-loi">Liên kết không hợp lệ.</div><Link className="nut vien" href="/forgot-password">Yêu cầu liên kết mới</Link></div>;
  return (
    <div className="xac-thuc-khung">
      <h1 className="giua">Đặt lại mật khẩu</h1>
      {xong ? <div className="the"><div className="thong-bao-ok">Đã đặt lại mật khẩu. Hãy đăng nhập lại.</div><Link className="nut rong" href="/login">Đăng nhập</Link></div> : (
        <form className="the" onSubmit={gui}>
          <div className="truong"><label htmlFor="mk">Mật khẩu mới</label><PasswordInput id="mk" required minLength={8} maxLength={72} autoComplete="new-password" value={mk} onChange={(e) => setMk(e.target.value)} /></div>
          <div className="truong"><label htmlFor="mk2">Nhập lại mật khẩu mới</label><PasswordInput id="mk2" required minLength={8} maxLength={72} autoComplete="new-password" value={mk2} onChange={(e) => setMk2(e.target.value)} /></div>
          {loi && <div className="thong-bao-loi">{loi}</div>}
          <button className="nut rong" disabled={dang}>{dang ? 'Đang lưu…' : 'Đặt lại mật khẩu'}</button>
        </form>
      )}
    </div>
  );
}
export default function DatLai() { return <Suspense fallback={<DangTai />}><Form /></Suspense>; }
