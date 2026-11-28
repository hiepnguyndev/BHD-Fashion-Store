'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from './Providers';

export default function BannerCarousel({ banner }: { banner: { maBanner: number; tieuDe: string; duongDanAnh: string; duongDanAnhDienThoai?: string | null; lienKet?: string | null }[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banner.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % banner.length), 6000);
    return () => clearInterval(t);
  }, [banner.length]);
  const b = banner[i];
  if (!b) return null;
  const noiBo = !!b.lienKet && b.lienKet.startsWith('/') && !b.lienKet.startsWith('//');
  const ngoai = !!b.lienKet && /^https?:\/\//i.test(b.lienKet);   // chỉ nhận http(s), chặn javascript: và các giao thức khác
  return (
    <section className="anh-bia" aria-roledescription="carousel">
      <picture key={b.maBanner}>
        {b.duongDanAnhDienThoai && <source media="(max-width: 600px)" srcSet={b.duongDanAnhDienThoai} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nen-anh" src={b.duongDanAnh} alt="" style={{ animation: 'hien .6s ease both' }} />
      </picture>
      {noiBo && <Link className="lien-ket-banner" href={b.lienKet!} aria-label={b.tieuDe} />}
      {ngoai && <a className="lien-ket-banner" href={b.lienKet!} target="_blank" rel="noopener noreferrer" aria-label={b.tieuDe} />}
      <div className="noi-dung">
        <h1 className="an-chu">{b.tieuDe}</h1>
        {b.lienKet && (noiBo ? <Link className="nut lon" href={b.lienKet}>{t('Khám phá ngay')}</Link> : null)}
      </div>
      {banner.length > 1 && (
        <div className="cham-banner">
          {banner.map((x, k) => <button key={x.maBanner} className={k === i ? 'dang' : ''} aria-label={`Banner ${k + 1}`} onClick={() => setI(k)} />)}
        </div>
      )}
    </section>
  );
}
