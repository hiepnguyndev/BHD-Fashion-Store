import Link from 'next/link';
import type { Metadata } from 'next';
import { TheSanPham } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import { vnd, ngayGio } from '@/lib/format';
import CopyCode from './CopyCode';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ưu đãi' };

export default async function TrangUuDai() {
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
          <h1 style={{ margin: 0 }}>Ưu đãi</h1>
          <p className="mo" style={{ margin: '6px 0 0' }}>Mã giảm giá đang chạy và những sản phẩm đang được giảm giá.</p>
        </div>
        <Link className="nut lon" style={{ position: 'relative', zIndex: 1 }} href="/san-pham?giamGia=true">Xem tất cả sản phẩm giảm giá</Link>
      </div>

      <div className="tieu-de-muc"><h2>Mã giảm giá</h2></div>
      {dsPhieu.length > 0 ? (
        <div className="luoi-uu-dai">
          {dsPhieu.map((p) => (
            <div key={p.maCode} className="the-ma">
              <div>
                <div className="giam">{p.loaiGiam === 'PhanTram' ? `Giảm ${p.giaTriGiam}%` : `Giảm ${vnd(p.giaTriGiam)}`}</div>
                {p.moTa && <div className="nho">{p.moTa}</div>}
                <div className="nho mo">
                  {p.donToiThieu > 0 ? `Đơn từ ${vnd(p.donToiThieu)}` : 'Mọi đơn hàng'}
                  {p.loaiGiam === 'PhanTram' && p.giamToiDa ? ` · tối đa ${vnd(p.giamToiDa)}` : ''}
                </div>
                <div className="nho mo">Hết hạn {ngayGio(p.ngayKetThuc)}</div>
              </div>
              <CopyCode ma={p.maCode} />
            </div>
          ))}
        </div>
      ) : (
        <div className="thong-bao-tin">{phieu === null ? 'Chưa tải được danh sách mã giảm giá. Vui lòng thử lại sau.' : 'Hiện chưa có mã giảm giá nào. Hãy quay lại sau nhé!'}</div>
      )}
      <p className="nho mo cach">Nhập mã ở bước đặt hàng để được giảm. Mỗi mã có điều kiện và số lượt dùng riêng.</p>

      <div className="tieu-de-muc"><h2>Đang giảm giá</h2><Link className="nut-chu" href="/san-pham?giamGia=true">Xem tất cả</Link></div>
      {dsGiam.length > 0 ? (
        <div className="luoi-sp">{dsGiam.map((sp: any) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
      ) : (
        <div className="thong-bao-tin">{giam === null ? 'Chưa tải được danh sách sản phẩm.' : 'Hiện chưa có sản phẩm nào đang giảm giá.'}</div>
      )}
    </>
  );
}
