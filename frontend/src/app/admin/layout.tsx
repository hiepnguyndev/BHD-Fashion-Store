'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DangTai } from '@/components/Common';
import { useAuth } from '@/components/Providers';
import Logo from '@/components/Logo';

const MUC: [string, string][] = [
  ['/admin', 'Tổng quan'], ['/admin/orders', 'Đơn hàng'], ['/admin/returns', 'Đổi / trả'], ['/admin/payments', 'Thanh toán & hoàn tiền'],
  ['/admin/products', 'Sản phẩm & kho'], ['/admin/categories', 'Danh mục'], ['/admin/collections', 'Bộ sưu tập'], ['/admin/banner', 'Banner'], ['/admin/news', 'Tin tức'],
  ['/admin/coupons', 'Mã giảm giá'], ['/admin/reviews', 'Đánh giá'], ['/admin/users', 'Người dùng'], ['/admin/email-log', 'Email đã gửi'],
];

export default function QuanTriLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, dangTai, dangXuat } = useAuth();
  const router = useRouter();
  const ten = usePathname();
  useEffect(() => { if (!dangTai && !nguoiDung) router.replace('/login?tiep=' + encodeURIComponent(ten)); }, [dangTai, nguoiDung, router, ten]);
  if (dangTai || !nguoiDung) return <DangTai />;
  if (nguoiDung.vaiTro !== 'QuanTri') return (
    <div className="khung trang-chinh"><div className="trong"><div className="bieu-tuong">🔒</div><h1>Bạn không có quyền truy cập</h1><p>Trang này chỉ dành cho quản trị viên.</p><Link className="nut" href="/">Về trang chủ</Link></div></div>
  );
  return (
    <div className="quan-tri">
      <aside>
        <div className="logo"><Logo sang /> <span className="nhan-qt">Quản trị</span></div>
        {MUC.map(([h, t]) => <Link key={h} href={h} className={ten === h || (h !== '/admin' && ten.startsWith(h)) ? 'dang' : ''}>{t}</Link>)}
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 12 }}>
          <Link href="/">← Xem cửa hàng</Link>
          <a href="#" onClick={async (e) => { e.preventDefault(); await dangXuat(); router.push('/'); }}>Đăng xuất</a>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
