'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import ChiTietDon from '@/components/ChiTietDon';
import { DangTai } from '@/components/Chung';
import { goi, LoiApi } from '@/lib/api';

export default function ChiTietDonCuaToi() {
  const { ma } = useParams<{ ma: string }>();
  const [don, setDon] = useState<any>(null);
  const [loi, setLoi] = useState('');
  const tai = useCallback(() => goi('/api/don-hang/' + encodeURIComponent(ma)).then(setDon).catch((e) => setLoi(e instanceof LoiApi ? e.message : 'Không tải được đơn hàng.')), [ma]);
  useEffect(() => { tai(); }, [tai]);
  if (loi) return <div><div className="thong-bao-loi">{loi}</div><Link className="nut vien" href="/tai-khoan/don-hang">← Đơn hàng của tôi</Link></div>;
  if (!don) return <DangTai />;
  return (
    <div>
      <p><Link className="nut-chu" href="/tai-khoan/don-hang">← Đơn hàng của tôi</Link></p>
      <ChiTietDon don={don} choPhepDoiTra taiLai={tai} huyDon={async (lyDo) => { await goi(`/api/don-hang/${don.maDonHienThi}/huy`, { method: 'POST', body: { lyDo } }); }} />
    </div>
  );
}
