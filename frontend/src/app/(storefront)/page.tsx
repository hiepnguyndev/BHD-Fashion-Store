import Link from 'next/link';
import BannerCarousel from '@/components/BannerCarousel';
import { Anh, TheSanPham } from '@/components/Common';
import LuoiMaGiamGia from '@/components/LuoiMaGiamGia';
import { layDuLieu } from '@/lib/server';
import { tenCuaHang } from '@/lib/api';
import { layT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export default async function TrangChu() {
  const { t } = await layT();
  const [banner, giam, danhMuc, bst, phieu] = await Promise.all([
    layDuLieu<any[]>('sanPham', '/api/banner?viTri=TrangChu'),
    layDuLieu<any>('sanPham', '/api/san-pham?giamGia=true&kichThuoc=8&sapXep=banChay'),
    layDuLieu<any[]>('sanPham', '/api/danh-muc'),
    layDuLieu<any[]>('sanPham', '/api/bo-suu-tap'),
    layDuLieu<any[]>('donHang', '/api/phieu-giam-gia/cong-khai'),
  ]);
  const goc = (danhMuc ?? []).filter((d) => !d.maDanhMucCha);
  // Ảnh đại diện của mỗi mục chính: ảnh chính của sản phẩm bán chạy nhất trong mục đó.
  const anhMuc = await Promise.all(goc.map(async (d) => (await layDuLieu<any>('sanPham', `/api/san-pham?danhMuc=${d.duongDan}&sapXep=banChay&kichThuoc=1`))?.danhSach?.[0]?.anhChinh as string | undefined));
  const dsGiam = giam?.danhSach ?? [];
  const dsPhieu = phieu ?? [];

  return (
    <>
      {banner && banner.length > 0 ? (
        <BannerCarousel banner={banner} />
      ) : (
        <section className="anh-bia">
          <div className="noi-dung">
            <h1>{tenCuaHang}: {t('mặc đẹp mỗi ngày, không cầu kỳ.')}</h1>
            <p>{t('Chất liệu dễ chịu, đường may chỉn chu, giao hàng toàn quốc.')}</p>
            <Link className="nut lon" href="/products">{t('Mua sắm ngay')}</Link>
          </div>
        </section>
      )}

      {goc.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>{t('Danh mục')}</h2></div>
          <div className="luoi-dm-lon">
            {goc.map((d, i) => (
              <Link key={d.maDanhMuc} className="the-dm-lon" href={'/products?danhMuc=' + d.duongDan}>
                {anhMuc[i] && <Anh src={anhMuc[i]} alt={d.tenDanhMuc} />}
                <div><h3>{d.tenDanhMuc}</h3><span>{t('Khám phá ngay')} →</span></div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="tieu-de-muc"><h2>{t('Sản phẩm đang sale')}</h2>{dsGiam.length > 0 && <Link className="nut-chu" href="/products?giamGia=true">{t('Xem tất cả')}</Link>}</div>
      {dsGiam.length > 0 ? (
        <div className="luoi-sp">{dsGiam.map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
      ) : (
        <div className="thong-bao-tin">{giam === null ? t('Chưa tải được danh sách sản phẩm.') : t('Hiện chưa có sản phẩm nào đang giảm giá.')}</div>
      )}

      {bst && bst.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>{t('Bộ sưu tập')}</h2></div>
          <div className="luoi-bst">
            {bst.slice(0, 3).map((b) => (
              <Link key={b.maBoSuuTap} className="the-bst" href={'/products?boSuuTap=' + b.duongDan}>
                {b.anhBia && <Anh src={b.anhBia} alt={b.tenBoSuuTap} />}
                <div><h3 style={{ color: '#fff', margin: 0 }}>{b.tenBoSuuTap}</h3><span className="nho">{t('{n} sản phẩm', { n: b.soSanPham })}</span></div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="tieu-de-muc"><h2>{t('Mã giảm giá')}</h2>{dsPhieu.length > 0 && <Link className="nut-chu" href="/deals#ma-giam-gia">{t('Xem tất cả')}</Link>}</div>
      {dsPhieu.length > 0 ? (
        <LuoiMaGiamGia phieu={dsPhieu.slice(0, 6)} t={t} />
      ) : (
        <div className="thong-bao-tin">{phieu === null ? t('Chưa tải được danh sách mã giảm giá. Vui lòng thử lại sau.') : t('Hiện chưa có mã giảm giá nào. Hãy quay lại sau nhé!')}</div>
      )}
    </>
  );
}
