import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { layDuLieu } from '@/lib/server';
import { TheSanPham } from '@/components/Common';
import ProductDetail from './ProductDetail';
import { layT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

type Ngu = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ngu): Promise<Metadata> {
  const { slug: duongDan } = await params;
  const d = await layDuLieu<any>('sanPham', '/api/san-pham/' + encodeURIComponent(duongDan));
  return d ? { title: d.sanPham.tenSanPham, description: d.sanPham.moTaNgan || undefined } : { title: 'Sản phẩm' };
}

export default async function TrangSanPham({ params }: Ngu) {
  const { t } = await layT();
  const { slug: duongDan } = await params;
  const d = await layDuLieu<any>('sanPham', '/api/san-pham/' + encodeURIComponent(duongDan));
  if (!d) notFound();
  return (
    <>
      <nav className="duong-dan">
        <Link href="/">{t('Trang chủ')}</Link> / <Link href="/products">{t('Sản phẩm')}</Link>
        {d.danhMuc.map((c: any) => <span key={c.maDanhMuc}> / <Link href={'/products?danhMuc=' + c.duongDan}>{c.tenDanhMuc}</Link></span>)}
      </nav>
      <ProductDetail sanPham={d.sanPham} hinhAnh={d.hinhAnh} bienThe={d.bienThe} />
      {d.lienQuan.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>{t('Có thể bạn thích')}</h2></div>
          <div className="luoi-sp">{d.lienQuan.slice(0, 4).map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
        </>
      )}
    </>
  );
}
