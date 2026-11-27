'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DangTai, TheSanPham, Trong } from '@/components/Common';
import { goi } from '@/lib/api';

export default function YeuThich() {
  const [ds, setDs] = useState<any[] | null>(null);
  useEffect(() => { goi<any[]>('/api/yeu-thich').then(setDs).catch(() => setDs([])); }, []);
  if (!ds) return <DangTai />;
  if (ds.length === 0) return <Trong bieuTuong="♡" tieuDe="Chưa có sản phẩm yêu thích"><Link className="nut" href="/products">Khám phá sản phẩm</Link></Trong>;
  return (
    <div>
      <h1>Sản phẩm yêu thích</h1>
      <div className="luoi-sp">
        {ds.map((sp) => (
          <div key={sp.maSanPham}>
            <TheSanPham sp={sp} />
            <button className="nut-chu nho" style={{ marginTop: 6 }} onClick={() => goi('/api/yeu-thich/' + sp.maSanPham, { method: 'DELETE' }).then(() => setDs((x) => (x || []).filter((y) => y.maSanPham !== sp.maSanPham))).catch(() => {})}>Bỏ yêu thích</button>
          </div>
        ))}
      </div>
    </div>
  );
}
