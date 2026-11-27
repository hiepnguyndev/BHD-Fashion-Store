'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { vnd } from '@/lib/format';

function url(query: string, doi: Record<string, string>) {
  const q = new URLSearchParams(query);
  q.delete('trang');
  for (const [k, v] of Object.entries(doi)) { if (v) q.set(k, v); else q.delete(k); }
  const s = q.toString();
  return '/products' + (s ? '?' + s : '');
}

/** Danh sách thả xuống cho một tham số lọc (kích cỡ, màu sắc). */
export function ChonLoc({ tham, giaTri, tatCa, ds, query }: { tham: string; giaTri: string; tatCa: string; ds: { gia: string; nhan: string }[]; query: string }) {
  const router = useRouter();
  return (
    <select className="chon-loc" value={giaTri} aria-label={tatCa} onChange={(e) => router.push(url(query, { [tham]: e.target.value }))}>
      <option value="">{tatCa}</option>
      {ds.map((d) => <option key={d.gia} value={d.gia}>{d.nhan}</option>)}
    </select>
  );
}

/** Thanh kéo khoảng giá hai đầu; áp dụng khi thả tay. */
export function ThanhKeoGia({ thap, cao, giaTu, giaDen, query, buoc = 10000 }: { thap: number; cao: number; giaTu: string; giaDen: string; query: string; buoc?: number }) {
  const router = useRouter();
  const min = Math.floor(thap / buoc) * buoc, max = Math.max(Math.ceil(cao / buoc) * buoc, min + buoc);
  const [lo, setLo] = useState(giaTu ? Number(giaTu) : min);
  const [hi, setHi] = useState(giaDen ? Number(giaDen) : max);
  const gia = useRef({ lo, hi });
  useEffect(() => { const l = giaTu ? Number(giaTu) : min, h = giaDen ? Number(giaDen) : max; setLo(l); setHi(h); gia.current = { lo: l, hi: h }; }, [giaTu, giaDen, min, max]);
  const dat = (l: number, h: number) => { gia.current = { lo: l, hi: h }; setLo(l); setHi(h); };
  const ap = () => router.push(url(query, { giaTu: gia.current.lo > min ? String(gia.current.lo) : '', giaDen: gia.current.hi < max ? String(gia.current.hi) : '' }));
  const pc = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="keo-gia">
      <div className="hang giua-hang nho"><b>{vnd(lo)}</b><b>{vnd(hi)}</b></div>
      <div className="keo-gia-thanh">
        <div className="vet" style={{ left: pc(lo) + '%', right: 100 - pc(hi) + '%' }} />
        <input type="range" min={min} max={max} step={buoc} value={lo} aria-label="Giá thấp nhất" onChange={(e) => dat(Math.min(Number(e.target.value), hi - buoc), hi)} onPointerUp={ap} onKeyUp={ap} />
        <input type="range" min={min} max={max} step={buoc} value={hi} aria-label="Giá cao nhất" onChange={(e) => dat(lo, Math.max(Number(e.target.value), lo + buoc))} onPointerUp={ap} onKeyUp={ap} />
      </div>
    </div>
  );
}
