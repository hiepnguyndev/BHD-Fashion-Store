'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DangTai } from '@/components/Common';
import { useAuth } from '@/components/Providers';

export default function TaiKhoanLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, dangTai } = useAuth();
  const router = useRouter();
  const ten = usePathname();
  useEffect(() => { if (!dangTai && !nguoiDung) router.replace('/dang-nhap?tiep=' + encodeURIComponent(ten)); }, [dangTai, nguoiDung, router, ten]);
  if (dangTai || !nguoiDung) return <DangTai />;
  const muc: [string, string][] = [['/tai-khoan', 'Thông tin & địa chỉ'], ['/tai-khoan/don-hang', 'Đơn hàng của tôi'], ['/tai-khoan/yeu-thich', 'Sản phẩm yêu thích']];
  return (
    <div className="bo-cuc-tk">
      <ul className="menu-doc">{muc.map(([h, t]) => <li key={h}><Link href={h} className={ten === h || (h !== '/tai-khoan' && ten.startsWith(h)) ? 'dang' : ''}>{t}</Link></li>)}</ul>
      <div>{children}</div>
    </div>
  );
}
