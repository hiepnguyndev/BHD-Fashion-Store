import Link from 'next/link';
import BannerCarousel from '@/components/BannerCarousel';
import { Anh, TheSanPham } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import { tenCuaHang } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function TrangChu() {
  const [banner, noiBat, moi, danhMuc, bst] = await Promise.all([
    layDuLieu<any[]>('sanPham', '/api/banner?viTri=TrangChu'),
    layDuLieu<any>('sanPham', '/api/san-pham?noiBat=true&kichThuoc=8'),
    layDuLieu<any>('sanPham', '/api/san-pham?kichThuoc=8'),
    layDuLieu<any[]>('sanPham', '/api/danh-muc'),
    layDuLieu<any[]>('sanPham', '/api/bo-suu-tap'),
  ]);
  const goc = (danhMuc ?? []).filter((d) => !d.maDanhMucCha);
  const dsNoiBat = noiBat?.danhSach ?? [];
  const dsMoi = moi?.danhSach ?? [];

  return (
    <>
      {banner && banner.length > 0 ? (
        <BannerCarousel banner={banner} />
      ) : (
        <section className="anh-bia">
          <div className="noi-dung">
            <h1>{tenCuaHang}: mặc đẹp mỗi ngày, không cầu kỳ.</h1>
            <p>Chất liệu dễ chịu, đường may chỉn chu, giao hàng toàn quốc.</p>
            <Link className="nut lon" href="/san-pham">Mua sắm ngay</Link>
          </div>
        </section>
      )}

      {goc.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>Danh mục</h2></div>
          <div className="luoi-dm">
            {goc.map((d) => <Link key={d.maDanhMuc} className="the-dm" href={'/san-pham?danhMuc=' + d.duongDan}>{d.tenDanhMuc}<span>→</span></Link>)}
          </div>
        </>
      )}

      {dsNoiBat.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>Sản phẩm nổi bật</h2><Link className="nut-chu" href="/san-pham?noiBat=true">Xem tất cả</Link></div>
          <div className="luoi-sp">{dsNoiBat.map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
        </>
      )}

      {bst && bst.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>Bộ sưu tập</h2></div>
          <div className="luoi-bst">
            {bst.slice(0, 3).map((b) => (
              <Link key={b.maBoSuuTap} className="the-bst" href={'/san-pham?boSuuTap=' + b.duongDan}>
                {b.anhBia && <Anh src={b.anhBia} alt={b.tenBoSuuTap} />}
                <div><h3 style={{ color: '#fff', margin: 0 }}>{b.tenBoSuuTap}</h3><span className="nho">{b.soSanPham} sản phẩm</span></div>
              </Link>
            ))}
          </div>
        </>
      )}

      {dsMoi.length > 0 && (
        <>
          <div className="tieu-de-muc"><h2>Hàng mới về</h2><Link className="nut-chu" href="/san-pham">Xem tất cả</Link></div>
          <div className="luoi-sp">{dsMoi.map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
        </>
      )}

      {!noiBat && !moi && (
        <div className="thong-bao-tin cach-lon">Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau ít phút.</div>
      )}

      <div className="cam-ket">
        <div><b>Giao hàng toàn quốc</b><span className="nho mo">Miễn phí vận chuyển cho đơn đủ điều kiện.</span></div>
        <div><b>Đổi trả trong 7 ngày</b><span className="nho mo">Kể từ khi nhận hàng, theo chính sách đổi trả.</span></div>
        <div><b>Thanh toán linh hoạt</b><span className="nho mo">COD, chuyển khoản VietQR, thẻ/ví qua SePay.</span></div>
      </div>
    </>
  );
}
