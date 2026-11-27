import Link from 'next/link';
import type { Metadata } from 'next';
import { PhanTrang, TheSanPham, Trong } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import { layT } from '@/lib/i18n-server';
import { ChonLoc, ThanhKeoGia } from '@/components/BoLocSanPham';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sản phẩm' };

const SAP_XEP: [string, string][] = [['', 'Mới nhất'], ['banChay', 'Bán chạy'], ['danhGia', 'Đánh giá cao'], ['giaTang', 'Giá tăng dần'], ['giaGiam', 'Giá giảm dần']];
const KICH_THUOC = 12;

type SP = Record<string, string | string[] | undefined>;
const lay = (sp: SP, k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) || ''; };

export default async function TrangDanhSach({ searchParams }: { searchParams: Promise<SP> }) {
  const { t } = await layT();
  const sp = await searchParams;
  const loc = { tuKhoa: lay(sp, 'tuKhoa'), danhMuc: lay(sp, 'danhMuc'), boSuuTap: lay(sp, 'boSuuTap'), giaTu: lay(sp, 'giaTu'), giaDen: lay(sp, 'giaDen'), kichCo: lay(sp, 'kichCo'), mauSac: lay(sp, 'mauSac'), sapXep: lay(sp, 'sapXep'), noiBat: lay(sp, 'noiBat'), giamGia: lay(sp, 'giamGia') };
  const trang = Math.max(1, parseInt(lay(sp, 'trang')) || 1);
  const taoQuery = (doi: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const gop: Record<string, any> = { ...loc, ...doi };
    for (const [k, v] of Object.entries(gop)) if (v !== undefined && v !== '' && v !== 0) q.set(k, String(v));
    return q;
  };
  const lienKet = (doi: Record<string, string | number | undefined>) => { const q = taoQuery({ trang: '', ...doi }).toString(); return '/products' + (q ? '?' + q : ''); };

  const queryHienTai = taoQuery({}).toString();
  const q = taoQuery({ trang, kichThuoc: KICH_THUOC });
  const qLoc = new URLSearchParams(); if (loc.danhMuc) qLoc.set('danhMuc', loc.danhMuc); if (loc.tuKhoa) qLoc.set('tuKhoa', loc.tuKhoa);
  const [kq, danhMuc, boLoc] = await Promise.all([
    layDuLieu<any>('sanPham', '/api/san-pham?' + q), layDuLieu<any[]>('sanPham', '/api/danh-muc'),
    layDuLieu<any>('sanPham', '/api/bo-loc?' + qLoc),
  ]);
  const dem: Record<string, number> = Object.fromEntries((boLoc?.danhMuc ?? []).map((d: any) => [d.duongDan, d.soSanPham]));
  const demCha = (cha: any) => (danhMuc ?? []).filter((c) => c.maDanhMucCha === cha.maDanhMuc).reduce((n, c) => n + (dem[c.duongDan] ?? 0), 0);
  const dsKichCo: { kichCo: string; soSanPham: number }[] = boLoc?.kichCo ?? [];
  const dsMau: { mauSac: string; maMau: string | null; soSanPham: number }[] = boLoc?.mauSac ?? [];
  const dangLoc = !!(loc.tuKhoa || loc.danhMuc || loc.giaTu || loc.giaDen || loc.kichCo || loc.mauSac || loc.giamGia || loc.noiBat || loc.boSuuTap);
  const goc = (danhMuc ?? []).filter((d) => !d.maDanhMucCha);
  const con = (danhMuc ?? []).filter((d) => d.maDanhMucCha);
  const dsSp = kq?.danhSach ?? [];

  return (
    <div className="bo-cuc-ds">
      <aside className="bo-loc">
        <h2 style={{ marginBottom: 4 }}>{t('Sản phẩm')}</h2>
        {loc.tuKhoa && <p className="nho mo">{t('Kết quả cho')} “{loc.tuKhoa}” · <Link className="nut-chu" href={lienKet({ tuKhoa: '' })}>{t('xóa')}</Link></p>}
        {loc.giamGia && <p className="nho mo">{t('Đang lọc: sản phẩm giảm giá')} · <Link className="nut-chu" href={lienKet({ giamGia: '' })}>{t('xóa')}</Link></p>}
        <h3>{t('Danh mục')}</h3>
        <ul>
          <li><Link href={lienKet({ danhMuc: '' })} className={!loc.danhMuc ? 'dang' : ''}>{t('Tất cả')}</Link></li>
          {goc.map((d) => (
            <li key={d.maDanhMuc}>
              <Link href={lienKet({ danhMuc: d.duongDan })} className={loc.danhMuc === d.duongDan ? 'dang' : ''}>{d.tenDanhMuc} <span className="nho mo">({demCha(d)})</span></Link>
              {(loc.danhMuc === d.duongDan || con.some((c) => c.maDanhMucCha === d.maDanhMuc && c.duongDan === loc.danhMuc)) && (
                <ul style={{ paddingLeft: 14 }}>{con.filter((c) => c.maDanhMucCha === d.maDanhMuc).map((c) => <li key={c.maDanhMuc}><Link href={lienKet({ danhMuc: c.duongDan })} className={loc.danhMuc === c.duongDan ? 'dang' : ''}>{c.tenDanhMuc} <span className="nho mo">({dem[c.duongDan] ?? 0})</span></Link></li>)}</ul>
              )}
            </li>
          ))}
        </ul>
        {boLoc?.giaThap != null && boLoc.giaCao > boLoc.giaThap && (
          <>
            <h3>{t('Khoảng giá')}</h3>
            <ThanhKeoGia thap={boLoc.giaThap} cao={boLoc.giaCao} giaTu={loc.giaTu} giaDen={loc.giaDen} query={queryHienTai} />
          </>
        )}
        {dsKichCo.length > 0 && (
          <>
            <h3>{t('Kích cỡ')}</h3>
            <ChonLoc tham="kichCo" giaTri={loc.kichCo} tatCa={t('Tất cả kích cỡ')} query={queryHienTai} ds={dsKichCo.map((k) => ({ gia: k.kichCo, nhan: `${k.kichCo} (${k.soSanPham})` }))} />
          </>
        )}
        {dsMau.length > 0 && (
          <>
            <h3>{t('Màu sắc')}</h3>
            <ChonLoc tham="mauSac" giaTri={loc.mauSac} tatCa={t('Tất cả màu sắc')} query={queryHienTai} ds={dsMau.map((m) => ({ gia: m.mauSac, nhan: `${m.mauSac} (${m.soSanPham})` }))} />
          </>
        )}
        {dangLoc && <p style={{ marginTop: 16 }}><Link className="nut-chu" href="/products">{t('Xóa tất cả bộ lọc')}</Link></p>}
      </aside>

      <section>
        <div className="hang giua-hang" style={{ marginBottom: 18 }}>
          <span className="mo">{kq ? t('{n} sản phẩm', { n: kq.tong }) : ''}</span>
          <div className="hang" style={{ gap: 6 }}>
            {SAP_XEP.map(([ma, ten]) => <Link key={ma} className={'chip' + (loc.sapXep === ma ? ' dang' : '')} href={lienKet({ sapXep: ma })}>{t(ten)}</Link>)}
          </div>
        </div>
        {!kq ? <div className="thong-bao-loi">{t('Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau.')}</div>
          : dsSp.length === 0 ? <Trong tieuDe={t('Không tìm thấy sản phẩm phù hợp')}><Link className="nut vien" href="/products">{t('Xem tất cả sản phẩm')}</Link></Trong>
          : <div className="luoi-sp">{dsSp.map((s: any) => <TheSanPham key={s.maSanPham} sp={s} />)}</div>}
        {kq && <PhanTrang trang={trang} tong={kq.tong} kichThuoc={KICH_THUOC} taoLienKet={(t) => lienKet({ trang: t })} />}
      </section>
    </div>
  );
}
