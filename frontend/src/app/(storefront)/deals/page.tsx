import Link from 'next/link';
import type { Metadata } from 'next';
import { TheSanPham } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import LuoiMaGiamGia from '@/components/LuoiMaGiamGia';
import { layT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ưu đãi' };

export default async function TrangUuDai() {
  const { t } = await layT();
  const [phieu, giam] = await Promise.all([
    layDuLieu<any[]>('donHang', '/api/phieu-giam-gia/cong-khai'),
    layDuLieu<any>('sanPham', '/api/san-pham?giamGia=true&kichThuoc=12&sapXep=banChay'),
  ]);
  const dsPhieu = phieu ?? [];
  const dsGiam = giam?.danhSach ?? [];

  return (
    <>
      <div className="dai-uu-dai">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: 0 }}>{t('Ưu đãi')}</h1>
          <p className="mo" style={{ margin: '6px 0 0' }}>{t('Mã giảm giá đang chạy và những sản phẩm đang được giảm giá.')}</p>
        </div>
        <Link className="nut lon" style={{ position: 'relative', zIndex: 1 }} href="/products?giamGia=true">{t('Xem tất cả sản phẩm giảm giá')}</Link>
      </div>

      <div className="tieu-de-muc" id="ma-giam-gia"><h2>{t('Mã giảm giá')}</h2></div>
      {dsPhieu.length > 0 ? (
        <LuoiMaGiamGia phieu={dsPhieu} t={t} />
      ) : (
        <div className="thong-bao-tin">{phieu === null ? t('Chưa tải được danh sách mã giảm giá. Vui lòng thử lại sau.') : t('Hiện chưa có mã giảm giá nào. Hãy quay lại sau nhé!')}</div>
      )}
      <p className="nho mo cach">{t('Nhập mã ở bước đặt hàng để được giảm. Mỗi mã có điều kiện và số lượt dùng riêng.')}</p>

      <div className="tieu-de-muc" id="dang-giam-gia"><h2>{t('Đang giảm giá')}</h2><Link className="nut-chu" href="/products?giamGia=true">{t('Xem tất cả')}</Link></div>
      {dsGiam.length > 0 ? (
        <div className="luoi-sp">{dsGiam.map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
      ) : (
        <div className="thong-bao-tin">{giam === null ? t('Chưa tải được danh sách sản phẩm.') : t('Hiện chưa có sản phẩm nào đang giảm giá.')}</div>
      )}
    </>
  );
}
