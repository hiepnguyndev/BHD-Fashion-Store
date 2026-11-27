'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { DangTai } from '@/components/Common';

function Chuyen() {
  const sp = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const ma = (sp.get('ma') || '').toUpperCase();
    router.replace(/^TT[A-Z0-9]{10}$/.test(ma) ? `/thanh-toan/${ma}?kq=${encodeURIComponent(sp.get('kq') || '')}` : '/');
  }, [sp, router]);
  return <DangTai />;
}
export default function KetQua() {
  return <Suspense fallback={<DangTai />}><Chuyen /></Suspense>;
}
