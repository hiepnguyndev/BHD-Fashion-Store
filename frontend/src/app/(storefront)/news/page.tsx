import Link from 'next/link';
import type { Metadata } from 'next';
import { Anh, PhanTrang, Trong } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import { layT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tin tức' };
const KICH_THUOC = 9;

export default async function TrangTinTuc({ searchParams }: { searchParams: Promise<{ trang?: string }> }) {
  const { t } = await layT();
  const trang = Math.max(1, parseInt((await searchParams).trang ?? '') || 1);
  const kq = await layDuLieu<any>('sanPham', `/api/tin-tuc?trang=${trang}&kichThuoc=${KICH_THUOC}`);
  const ds = kq?.danhSach ?? [];
  return (
    <>
      <div className="tieu-de-trang"><div><h1 style={{ marginBottom: 4 }}>{t('Tin tức')}</h1></div></div>
      {!kq ? <div className="thong-bao-loi">{t('Chưa tải được tin tức. Vui lòng thử lại sau.')}</div>
        : ds.length === 0 ? <Trong tieuDe={t('Chưa có tin tức nào')} />
        : (
          <div className="luoi-tin cach">
            {ds.map((b: any) => (
              <Link key={b.maTinTuc} href={'/news/' + b.duongDan} className="the-tin">
                {b.anhBia && <div className="anh-tin"><Anh src={b.anhBia} alt={b.tieuDe} /></div>}
                <span className="nho mo">{new Date(b.ngayDang).toLocaleDateString('vi-VN')}</span>
                <h2>{b.tieuDe}</h2>
                {b.tomTat && <p className="mo" style={{ margin: 0 }}>{b.tomTat}</p>}
                <span className="nut-chu">{t('Đọc tiếp')} →</span>
              </Link>
            ))}
          </div>
        )}
      {kq && <PhanTrang trang={trang} tong={kq.tong} kichThuoc={KICH_THUOC} taoLienKet={(n) => '/news' + (n > 1 ? '?trang=' + n : '')} />}
    </>
  );
}
