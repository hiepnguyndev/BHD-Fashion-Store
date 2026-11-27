import Link from 'next/link';
import { tenCuaHang } from '@/lib/api';
import Logo from './Logo';
import { layT } from '@/lib/i18n-server';

export default async function Footer() {
  const { t } = await layT();
  return (
    <footer className="chan-trang">
      <div className="khung">
        <div className="luoi-cot">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}><Logo sang /></div>
            <p className="nho">{t('Thời trang tối giản, chất liệu dễ chịu, giao hàng toàn quốc.')}</p>
          </div>
          <div><h4>{t('Mua sắm')}</h4><Link href="/products">{t('Danh mục')}</Link><Link href="/deals">{t('Ưu đãi')}</Link><Link href="/contact">{t('Liên hệ')}</Link><Link href="/track-order">{t('Tra cứu đơn hàng')}</Link></div>
          <div><h4>{t('Chính sách')}</h4><Link href="/policies/doi-tra">{t('Đổi trả')}</Link><Link href="/policies/van-chuyen">{t('Vận chuyển')}</Link><Link href="/policies/thanh-toan">{t('Thanh toán')}</Link></div>
          <div><h4>{t('Pháp lý')}</h4><Link href="/policies/dieu-khoan">{t('Điều khoản sử dụng')}</Link><Link href="/policies/bao-mat">{t('Bảo vệ dữ liệu cá nhân')}</Link><Link href="/policies/lien-he">{t('Thông tin cửa hàng')}</Link></div>
        </div>
        <p className="nho" style={{ marginTop: 28, opacity: 0.7 }}>© {new Date().getFullYear()} {tenCuaHang}. {t('Bảo lưu mọi quyền.')}</p>
      </div>
    </footer>
  );
}
