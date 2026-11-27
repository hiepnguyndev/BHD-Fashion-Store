import Link from 'next/link';
import { tenCuaHang } from '@/lib/api';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="chan-trang">
      <div className="khung">
        <div className="luoi-cot">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}><Logo sang /></div>
            <p className="nho">Thời trang tối giản, chất liệu dễ chịu, giao hàng toàn quốc.</p>
          </div>
          <div><h4>Mua sắm</h4><Link href="/san-pham">Danh mục</Link><Link href="/uu-dai">Ưu đãi</Link><Link href="/lien-he">Liên hệ</Link><Link href="/tra-cuu-don-hang">Tra cứu đơn hàng</Link></div>
          <div><h4>Chính sách</h4><Link href="/chinh-sach/doi-tra">Đổi trả</Link><Link href="/chinh-sach/van-chuyen">Vận chuyển</Link><Link href="/chinh-sach/thanh-toan">Thanh toán</Link></div>
          <div><h4>Pháp lý</h4><Link href="/chinh-sach/dieu-khoan">Điều khoản sử dụng</Link><Link href="/chinh-sach/bao-mat">Bảo vệ dữ liệu cá nhân</Link><Link href="/chinh-sach/lien-he">Thông tin cửa hàng</Link></div>
        </div>
        <p className="nho" style={{ marginTop: 28, opacity: 0.7 }}>© {new Date().getFullYear()} {tenCuaHang}. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );
}
