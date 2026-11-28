'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DangTai } from '@/components/Common';
import { useAuth, useT } from '@/components/Providers';

export default function TaiKhoanLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, dangTai } = useAuth();
  const router = useRouter();
  const ten = usePathname();
  const t = useT();
  useEffect(() => { if (!dangTai && !nguoiDung) router.replace('/login?tiep=' + encodeURIComponent(ten)); }, [dangTai, nguoiDung, router, ten]);
  if (dangTai || !nguoiDung) return <DangTai />;
  const muc: [string, string][] = [['/account', 'Thông tin & địa chỉ'], ['/account/orders', 'Đơn hàng của tôi'], ['/account/size', 'Số đo & gợi ý size'], ['/account/wishlist', 'Sản phẩm yêu thích']];
  return (
    <div className="bo-cuc-tk">
      <ul className="menu-doc">{muc.map(([h, tt]) => <li key={h}><Link href={h} className={ten === h || (h !== '/account' && ten.startsWith(h)) ? 'dang' : ''}>{t(tt)}</Link></li>)}</ul>
      <div>{children}</div>
    </div>
  );
}
