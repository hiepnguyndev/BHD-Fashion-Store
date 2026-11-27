import Link from 'next/link';
import type { Metadata } from 'next';
import { PhanTrang, TheSanPham, Trong } from '@/components/Common';
import { layDuLieu } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sản phẩm' };

const SAP_XEP: [string, string][] = [['', 'Mới nhất'], ['banChay', 'Bán chạy'], ['danhGia', 'Đánh giá cao'], ['giaTang', 'Giá tăng dần'], ['giaGiam', 'Giá giảm dần']];
const KICH_CO = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];
const KHOANG_GIA: [string, string, string][] = [['', '', 'Tất cả mức giá'], ['', '300000', 'Dưới 300.000₫'], ['300000', '600000', '300.000₫ – 600.000₫'], ['600000', '1000000', '600.000₫ – 1.000.000₫'], ['1000000', '', 'Trên 1.000.000₫']];
const KICH_THUOC = 12;

type SP = Record<string, string | string[] | undefined>;
const lay = (sp: SP, k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) || ''; };

export default async function TrangDanhSach({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const loc = { tuKhoa: lay(sp, 'tuKhoa'), danhMuc: lay(sp, 'danhMuc'), boSuuTap: lay(sp, 'boSuuTap'), giaTu: lay(sp, 'giaTu'), giaDen: lay(sp, 'giaDen'), kichCo: lay(sp, 'kichCo'), sapXep: lay(sp, 'sapXep'), noiBat: lay(sp, 'noiBat'), giamGia: lay(sp, 'giamGia') };
  const trang = Math.max(1, parseInt(lay(sp, 'trang')) || 1);
  const taoQuery = (doi: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const gop: Record<string, any> = { ...loc, ...doi };
    for (const [k, v] of Object.entries(gop)) if (v !== undefined && v !== '' && v !== 0) q.set(k, String(v));
    return q;
  };
  const lienKet = (doi: Record<string, string | number | undefined>) => { const q = taoQuery({ trang: '', ...doi }).toString(); return '/san-pham' + (q ? '?' + q : ''); };

  const q = taoQuery({ trang, kichThuoc: KICH_THUOC });
  const [kq, danhMuc] = await Promise.all([layDuLieu<any>('sanPham', '/api/san-pham?' + q), layDuLieu<any[]>('sanPham', '/api/danh-muc')]);
  const goc = (danhMuc ?? []).filter((d) => !d.maDanhMucCha);
  const con = (danhMuc ?? []).filter((d) => d.maDanhMucCha);
  const dsSp = kq?.danhSach ?? [];

  return (
    <div className="bo-cuc-ds">
      <aside className="bo-loc">
        <h2 style={{ marginBottom: 4 }}>Sản phẩm</h2>
        {loc.tuKhoa && <p className="nho mo">Kết quả cho “{loc.tuKhoa}” · <Link className="nut-chu" href={lienKet({ tuKhoa: '' })}>xóa</Link></p>}
        {loc.giamGia && <p className="nho mo">Đang lọc: sản phẩm giảm giá · <Link className="nut-chu" href={lienKet({ giamGia: '' })}>xóa</Link></p>}
        <h3>Danh mục</h3>
        <ul>
          <li><Link href={lienKet({ danhMuc: '' })} className={!loc.danhMuc ? 'dang' : ''}>Tất cả</Link></li>
          {goc.map((d) => (
            <li key={d.maDanhMuc}>
              <Link href={lienKet({ danhMuc: d.duongDan })} className={loc.danhMuc === d.duongDan ? 'dang' : ''}>{d.tenDanhMuc}</Link>
              {(loc.danhMuc === d.duongDan || con.some((c) => c.maDanhMucCha === d.maDanhMuc && c.duongDan === loc.danhMuc)) && (
                <ul style={{ paddingLeft: 14 }}>{con.filter((c) => c.maDanhMucCha === d.maDanhMuc).map((c) => <li key={c.maDanhMuc}><Link href={lienKet({ danhMuc: c.duongDan })} className={loc.danhMuc === c.duongDan ? 'dang' : ''}>{c.tenDanhMuc}</Link></li>)}</ul>
              )}
            </li>
          ))}
        </ul>
        <h3>Khoảng giá</h3>
        <ul>{KHOANG_GIA.map(([tu, den, ten]) => <li key={ten}><Link href={lienKet({ giaTu: tu, giaDen: den })} className={loc.giaTu === tu && loc.giaDen === den ? 'dang' : ''}>{ten}</Link></li>)}</ul>
        <h3>Kích cỡ</h3>
        <div className="hang" style={{ gap: 8 }}>
          <Link className={'chip' + (!loc.kichCo ? ' dang' : '')} href={lienKet({ kichCo: '' })}>Tất cả</Link>
          {KICH_CO.map((k) => <Link key={k} className={'chip' + (loc.kichCo === k ? ' dang' : '')} href={lienKet({ kichCo: k })}>{k}</Link>)}
        </div>
      </aside>

      <section>
        <div className="hang giua-hang" style={{ marginBottom: 18 }}>
          <span className="mo">{kq ? `${kq.tong} sản phẩm` : ''}</span>
          <div className="hang" style={{ gap: 6 }}>
            {SAP_XEP.map(([ma, ten]) => <Link key={ma} className={'chip' + (loc.sapXep === ma ? ' dang' : '')} href={lienKet({ sapXep: ma })}>{ten}</Link>)}
          </div>
        </div>
        {!kq ? <div className="thong-bao-loi">Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau.</div>
          : dsSp.length === 0 ? <Trong tieuDe="Không tìm thấy sản phẩm phù hợp"><Link className="nut vien" href="/san-pham">Xem tất cả sản phẩm</Link></Trong>
          : <div className="luoi-sp">{dsSp.map((s: any) => <TheSanPham key={s.maSanPham} sp={s} />)}</div>}
        {kq && <PhanTrang trang={trang} tong={kq.tong} kichThuoc={KICH_THUOC} taoLienKet={(t) => lienKet({ trang: t })} />}
      </section>
    </div>
  );
}
