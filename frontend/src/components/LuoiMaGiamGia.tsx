import CopyCode from '@/app/(storefront)/deals/CopyCode';
import { vnd, ngayGio } from '@/lib/format';

export default function LuoiMaGiamGia({ phieu, t }: { phieu: any[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <div className="luoi-uu-dai">
      {phieu.map((p) => (
        <div key={p.maCode} className="the-ma">
          <div>
            <div className="giam">{p.loaiGiam === 'PhanTram' ? t('Giảm {n}', { n: p.giaTriGiam + '%' }) : t('Giảm {n}', { n: vnd(p.giaTriGiam) })}</div>
            {p.moTa && <div className="nho">{p.moTa}</div>}
            <div className="nho mo">
              {p.donToiThieu > 0 ? t('Đơn từ {n}', { n: vnd(p.donToiThieu) }) : t('Mọi đơn hàng')}
              {p.loaiGiam === 'PhanTram' && p.giamToiDa ? ' · ' + t('tối đa {n}', { n: vnd(p.giamToiDa) }) : ''}
            </div>
            <div className="nho mo">{t('Hết hạn {n}', { n: ngayGio(p.ngayKetThuc) })}</div>
          </div>
          <CopyCode ma={p.maCode} />
        </div>
      ))}
    </div>
  );
}
