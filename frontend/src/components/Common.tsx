import Link from 'next/link';
import type { ReactNode } from 'react';
import { MAU_TRANG_THAI, vnd } from '@/lib/format';

export function Anh({ src, alt = '', className }: { src?: string | null; alt?: string; className?: string }) {
  if (!src) return <div className="anh-trong" aria-hidden>{(alt || '·').trim().charAt(0).toUpperCase()}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

export function Sao({ diem, soLuot }: { diem: number; soLuot?: number }) {
  const n = Math.round(Number(diem) || 0);
  return (
    <span className="sao" title={`${Number(diem || 0).toFixed(1)}/5`}>
      {'★'.repeat(n)}<span className="tat">{'★'.repeat(5 - n)}</span>
      {soLuot !== undefined && <span className="mo nho" style={{ letterSpacing: 0, marginLeft: 6 }}>({soLuot})</span>}
    </span>
  );
}

export function NhanTrangThai({ ma, ten }: { ma: string; ten?: string }) {
  return <span className={'nhan-tt ' + (MAU_TRANG_THAI[ma] || '')}>{ten || ma}</span>;
}

export function DangTai() {
  return <div className="dang-tai"><span className="xoay" aria-label="Đang tải" /></div>;
}

export function Trong({ bieuTuong = '🧵', tieuDe, children }: { bieuTuong?: string; tieuDe: string; children?: ReactNode }) {
  return (
    <div className="trong">
      <div className="bieu-tuong">{bieuTuong}</div>
      <h3>{tieuDe}</h3>
      {children}
    </div>
  );
}

export function PhanTrang({ trang, tong, kichThuoc, taoLienKet }: { trang: number; tong: number; kichThuoc: number; taoLienKet: (t: number) => string }) {
  const soTrang = Math.max(1, Math.ceil(tong / kichThuoc));
  if (soTrang <= 1) return null;
  const ds: (number | '…')[] = [];
  for (let i = 1; i <= soTrang; i++) if (i === 1 || i === soTrang || Math.abs(i - trang) <= 2) ds.push(i); else if (ds[ds.length - 1] !== '…') ds.push('…');
  return (
    <nav className="phan-trang" aria-label="Phân trang">
      {trang > 1 && <Link href={taoLienKet(trang - 1)}>‹</Link>}
      {ds.map((x, i) => (x === '…' ? <span key={'d' + i}>…</span> : x === trang ? <span key={x} className="dang" aria-current="page">{x}</span> : <Link key={x} href={taoLienKet(x)}>{x}</Link>))}
      {trang < soTrang && <Link href={taoLienKet(trang + 1)}>›</Link>}
    </nav>
  );
}

export function TheSanPham({ sp }: { sp: any }) {
  const giam = sp.giaGoc > sp.giaBan ? Math.round(((sp.giaGoc - sp.giaBan) / sp.giaGoc) * 100) : 0;
  return (
    <Link href={'/san-pham/' + sp.duongDan} className="the-sp">
      <div className="anh">
        {!sp.conHang ? <span className="dan het">Hết hàng</span> : giam > 0 ? <span className="dan">-{giam}%</span> : null}
        <Anh src={sp.anhChinh} alt={sp.tenSanPham} />
      </div>
      <div className="ten">{sp.tenSanPham}</div>
      <div><span className="gia">{vnd(sp.giaBan)}</span>{giam > 0 && <span className="gia-goc">{vnd(sp.giaGoc)}</span>}</div>
      {Array.isArray(sp.mauSac) && sp.mauSac.length > 0 && (
        <div className="cham-mau">{sp.mauSac.slice(0, 6).map((m: any) => <i key={m.mauSac} title={m.mauSac} style={{ background: m.maMau || '#ddd' }} />)}</div>
      )}
    </Link>
  );
}

export function HopThoai({ tieuDe, dong, children, rong }: { tieuDe: string; dong: () => void; children: ReactNode; rong?: boolean }) {
  return (
    <div className="lop-phu" onMouseDown={(e) => { if (e.target === e.currentTarget) dong(); }} role="dialog" aria-modal="true" aria-label={tieuDe}>
      <div className={'hop-thoai' + (rong ? ' rong' : '')}>
        <div className="hang giua-hang" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{tieuDe}</h2>
          <button className="nut-icon" onClick={dong} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
