import type { Metadata } from 'next';
import { tenCuaHang } from '@/lib/api';
import FormLienHe from './FormLienHe';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Liên hệ' };

// Đọc lúc chạy từ biến môi trường của dịch vụ giaodien (xem .env): không cần build lại khi đổi.
const lay = (k: string) => (process.env[k] || '').trim();

export default function TrangLienHe() {
  const thongTin = [
    { bt: '📍', nhan: 'Địa chỉ', giaTri: lay('LIEN_HE_DIA_CHI') },
    { bt: '📞', nhan: 'Điện thoại', giaTri: lay('LIEN_HE_DIEN_THOAI'), lienKet: lay('LIEN_HE_DIEN_THOAI') ? 'tel:' + lay('LIEN_HE_DIEN_THOAI').replace(/[^\d+]/g, '') : '' },
    { bt: '✉️', nhan: 'Email', giaTri: lay('LIEN_HE_EMAIL'), lienKet: lay('LIEN_HE_EMAIL') ? 'mailto:' + lay('LIEN_HE_EMAIL') : '' },
    { bt: '🕘', nhan: 'Giờ làm việc', giaTri: lay('LIEN_HE_GIO_LAM_VIEC') },
  ];
  const email = lay('LIEN_HE_EMAIL');
  return (
    <>
      <div className="tieu-de-trang"><div><h1 style={{ marginBottom: 4 }}>Liên hệ</h1><p className="mo" style={{ margin: 0 }}>{tenCuaHang} luôn sẵn lòng hỗ trợ bạn về đơn hàng, đổi trả và tư vấn size.</p></div></div>
      <div className="khoi-lien-he cach">
        <div>
          {thongTin.map((o) => (
            <div key={o.nhan} className="o-thong-tin">
              <span className="bt" aria-hidden>{o.bt}</span>
              <div>
                <b>{o.nhan}</b>
                <div className={o.giaTri ? '' : 'mo'}>{o.giaTri ? (o.lienKet ? <a className="nut-chu" href={o.lienKet}>{o.giaTri}</a> : o.giaTri) : 'Đang cập nhật'}</div>
              </div>
            </div>
          ))}
        </div>
        {email ? (
          <FormLienHe email={email} tenCuaHang={tenCuaHang} />
        ) : (
          <div className="the"><h2>Gửi tin nhắn</h2><p className="mo">Cửa hàng chưa cấu hình email nhận tin. Bạn vui lòng liên hệ qua các thông tin bên cạnh.</p></div>
        )}
      </div>
    </>
  );
}
