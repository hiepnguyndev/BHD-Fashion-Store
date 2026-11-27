'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DangTai } from '@/components/Chung';
import { useAuth } from '@/components/Providers';
import Logo from '@/components/Logo';

const MUC: [string, string][] = [
  ['/quan-tri', 'Tổng quan'], ['/quan-tri/don-hang', 'Đơn hàng'], ['/quan-tri/doi-tra', 'Đổi / trả'], ['/quan-tri/thanh-toan', 'Thanh toán & hoàn tiền'],
  ['/quan-tri/san-pham', 'Sản phẩm & kho'], ['/quan-tri/danh-muc', 'Danh mục'], ['/quan-tri/bo-suu-tap', 'Bộ sưu tập'], ['/quan-tri/banner', 'Banner'],
  ['/quan-tri/phieu-giam-gia', 'Mã giảm giá'], ['/quan-tri/danh-gia', 'Đánh giá'], ['/quan-tri/nguoi-dung', 'Người dùng'], ['/quan-tri/nhat-ky-gui', 'Email đã gửi'],
];

export default function QuanTriLayout({ children }: { children: ReactNode }) {
  const { nguoiDung, dangTai, dangXuat } = useAuth();
  const router = useRouter();
  const ten = usePathname();
  useEffect(() => { if (!dangTai && !nguoiDung) router.replace('/dang-nhap?tiep=' + encodeURIComponent(ten)); }, [dangTai, nguoiDung, router, ten]);
  if (dangTai || !nguoiDung) return <DangTai />;
  if (nguoiDung.vaiTro !== 'QuanTri') return (
    <div className="khung trang-chinh"><div className="trong"><div className="bieu-tuong">🔒</div><h1>Bạn không có quyền truy cập</h1><p>Trang này chỉ dành cho quản trị viên.</p><Link className="nut" href="/">Về trang chủ</Link></div></div>
  );
  return (
    <div className="quan-tri">
      <aside>
        <div className="logo"><Logo sang /> <span className="nhan-qt">Quản trị</span></div>
        {MUC.map(([h, t]) => <Link key={h} href={h} className={ten === h || (h !== '/quan-tri' && ten.startsWith(h)) ? 'dang' : ''}>{t}</Link>)}
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 12 }}>
          <Link href="/">← Xem cửa hàng</Link>
          <a href="#" onClick={async (e) => { e.preventDefault(); await dangXuat(); router.push('/'); }}>Đăng xuất</a>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
