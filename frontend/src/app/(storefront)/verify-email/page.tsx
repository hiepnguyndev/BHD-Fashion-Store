'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DangTai } from '@/components/Common';
import { goi, LoiApi } from '@/lib/api';

function Noi() {
  const ma = useSearchParams().get('ma') || '';
  const [kq, setKq] = useState<{ ok: boolean; thongBao: string } | null>(null);
  const daGoi = useRef(false);
  useEffect(() => {
    if (daGoi.current) return; daGoi.current = true;
    if (!ma) { setKq({ ok: false, thongBao: 'Liên kết không hợp lệ.' }); return; }
    goi<any>('/api/nguoi-dung/xac-thuc-email', { method: 'POST', body: { ma } })
      .then((r) => setKq({ ok: true, thongBao: r?.thongBao || 'Email đã được xác thực.' }))
      .catch((e) => setKq({ ok: false, thongBao: e instanceof LoiApi ? e.message : 'Không xác thực được.' }));
  }, [ma]);
  if (!kq) return <DangTai />;
  return (
    <div className="xac-thuc-khung giua">
      <div className="dau-tick" style={kq.ok ? undefined : { background: '#fbe4e1', color: 'var(--do)' }}>{kq.ok ? '✓' : '!'}</div>
      <h1>{kq.ok ? 'Xác thực thành công' : 'Chưa xác thực được'}</h1>
      <p className="mo">{kq.thongBao}</p>
      <Link className="nut" href="/login">Đăng nhập</Link>
    </div>
  );
}
export default function XacThuc() { return <Suspense fallback={<DangTai />}><Noi /></Suspense>; }
