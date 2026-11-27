import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { layDuLieu } from '@/lib/may-chu';

export const dynamic = 'force-dynamic';

export default async function CuaHangLayout({ children }: { children: ReactNode }) {
  const danhMuc = (await layDuLieu<any[]>('sanPham', '/api/danh-muc')) ?? [];
  return (
    <>
      <Header danhMuc={danhMuc} />
      <main className="khung trang-chinh">{children}</main>
      <Footer />
    </>
  );
}
