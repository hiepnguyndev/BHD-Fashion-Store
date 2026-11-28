'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DangTai, TheSanPham } from '@/components/Common';
import { useT, useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';

type ThongSo = { chieuCao?: number | null; canNang?: number | null; vongNguc?: number | null; vongEo?: number | null; coGiay?: number | null; gioiTinh?: 'Nam' | 'Nu' | null };
type GoiY = { kichCoAo?: string; kichCoQuan?: string; kichCoGiay?: string };

const TRONG = { gioiTinh: '', chieuCao: '', canNang: '', vongNguc: '', vongEo: '', coGiay: '' };
const SO = (v: string) => (v.trim() === '' ? null : Number(v));
const tuThongSo = (ts: ThongSo) => ({
  gioiTinh: ts.gioiTinh ?? '',
  chieuCao: ts.chieuCao != null ? String(ts.chieuCao) : '', canNang: ts.canNang != null ? String(ts.canNang) : '',
  vongNguc: ts.vongNguc != null ? String(ts.vongNguc) : '', vongEo: ts.vongEo != null ? String(ts.vongEo) : '',
  coGiay: ts.coGiay != null ? String(ts.coGiay) : '',
});

// Danh mục thật của cửa hàng theo giới tính; váy dùng cỡ áo (S/M/L/XL).
const NHOM: Record<string, { tieuDe: string; danhMuc: string; theo: 'kichCoAo' | 'kichCoQuan' }[]> = {
  Nam: [
    { tieuDe: 'Áo nam', danhMuc: 'ao-nam', theo: 'kichCoAo' },
    { tieuDe: 'Quần nam', danhMuc: 'quan-nam', theo: 'kichCoQuan' },
  ],
  Nu: [
    { tieuDe: 'Áo nữ', danhMuc: 'ao-nu', theo: 'kichCoAo' },
    { tieuDe: 'Quần nữ', danhMuc: 'quan-nu', theo: 'kichCoQuan' },
    { tieuDe: 'Váy nữ', danhMuc: 'vay-nu', theo: 'kichCoAo' },
  ],
};

export default function TrangSoDo() {
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState(TRONG);
  const [dangTai, setDangTai] = useState(true);
  const [dangGui, setDangGui] = useState(false);
  const [goiY, setGoiY] = useState<GoiY | null>(null);
  const [gioiTinh, setGioiTinh] = useState<string>('');
  const [sanPham, setSanPham] = useState<Record<string, any[]>>({});

  useEffect(() => {
    goi<{ thongSo: ThongSo; goiY: GoiY }>('/api/nguoi-dung/toi/thong-so')
      .then((r) => {
        setF(tuThongSo(r.thongSo));
        if (Object.keys(r.goiY).length > 0) { setGoiY(r.goiY); setGioiTinh(r.thongSo.gioiTinh ?? ''); taiSanPham(r.goiY, r.thongSo.gioiTinh ?? ''); }
      })
      .catch(() => {})
      .finally(() => setDangTai(false));
  }, []);

  async function taiSanPham(gy: GoiY, gt: string) {
    const nhom = gt ? NHOM[gt] : [];
    const ket: Record<string, any[]> = {};
    await Promise.all(nhom.map(async ({ danhMuc, theo }) => {
      const kichCo = gy[theo];
      if (!kichCo) return;
      try {
        const r = await goi<any>('/api/san-pham?danhMuc=' + danhMuc + '&kichCo=' + encodeURIComponent(kichCo) + '&sapXep=banChay&kichThuoc=4');
        ket[danhMuc] = r?.danhSach ?? [];
      } catch { ket[danhMuc] = []; }
    }));
    setSanPham(ket);
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const than = { chieuCao: SO(f.chieuCao), canNang: SO(f.canNang), vongNguc: SO(f.vongNguc), vongEo: SO(f.vongEo), coGiay: SO(f.coGiay), gioiTinh: f.gioiTinh || null };
    if (!than.vongNguc && !than.vongEo && !than.coGiay && !(than.chieuCao && than.canNang)) {
      toast(t('Vui lòng nhập ít nhất vòng ngực, vòng eo hoặc cỡ giày (hoặc cả chiều cao và cân nặng).'), 'loi');
      return;
    }
    setDangGui(true);
    try {
      const r = await goi<{ thongSo: ThongSo; goiY: GoiY }>('/api/nguoi-dung/toi/thong-so', { method: 'PUT', body: than });
      setGoiY(r.goiY); setGioiTinh(r.thongSo.gioiTinh ?? '');
      toast(t('Đã lưu số đo. Trợ lý chat cũng sẽ dùng thông tin này để tư vấn.'), 'ok');
      await taiSanPham(r.goiY, r.thongSo.gioiTinh ?? '');
    } catch (er) {
      toast(er instanceof LoiApi ? er.message : t('Có lỗi xảy ra.'), 'loi');
    } finally { setDangGui(false); }
  }

  if (dangTai) return <DangTai />;
  const dat = (k: keyof typeof TRONG) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div>
      <section className="the">
        <h2>{t('Số đo & gợi ý size')}</h2>
        <p className="nho mo">{t('Điền số đo của bạn một lần: cửa hàng gợi ý cỡ Áo, Quần và sản phẩm còn hàng phù hợp, đồng thời trợ lý chat dùng thông tin này để tư vấn. Đây là gợi ý gần đúng, không thay thế bảng size riêng của từng sản phẩm.')}</p>
        <form onSubmit={gui} className="form-goi-y-size">
          <div className="truong" style={{ gridColumn: '1 / -1' }}>
            <label>{t('Bạn mua đồ cho')}</label>
            <div className="hang" role="radiogroup">
              {[['Nam', 'Nam'], ['Nu', 'Nữ']].map(([v, ten]) => (
                <label key={v} className="chon-dong"><input type="radio" name="gt" checked={f.gioiTinh === v} onChange={() => setF((x) => ({ ...x, gioiTinh: v }))} /> {t(ten)}</label>
              ))}
            </div>
          </div>
          <div className="truong"><label htmlFor="cc">{t('Chiều cao (cm)')}</label><input id="cc" type="number" min={100} max={230} value={f.chieuCao} onChange={dat('chieuCao')} /></div>
          <div className="truong"><label htmlFor="cn">{t('Cân nặng (kg)')}</label><input id="cn" type="number" min={25} max={250} value={f.canNang} onChange={dat('canNang')} /></div>
          <div className="truong"><label htmlFor="vn">{t('Vòng ngực (cm)')}</label><input id="vn" type="number" min={50} max={160} value={f.vongNguc} onChange={dat('vongNguc')} /></div>
          <div className="truong"><label htmlFor="ve">{t('Vòng eo (cm)')}</label><input id="ve" type="number" min={40} max={160} value={f.vongEo} onChange={dat('vongEo')} /></div>
          <div className="truong"><label htmlFor="cg">{t('Cỡ giày (EU)')}</label><input id="cg" type="number" min={34} max={46} step={0.5} value={f.coGiay} onChange={dat('coGiay')} /></div>
          <button className="nut rong" disabled={dangGui} style={{ gridColumn: '1 / -1' }}>{dangGui ? t('Đang xử lý…') : t('Lưu và xem gợi ý')}</button>
        </form>
      </section>

      {goiY && (
        <section className="the" style={{ marginTop: 20 }}>
          <h2>{t('Size gợi ý của bạn')}</h2>
          <div className="the-goi-y-size">
            {goiY.kichCoAo && <span>{t('Áo')}: <b>{goiY.kichCoAo}</b></span>}
            {goiY.kichCoQuan && <span>{t('Quần')}: <b>{goiY.kichCoQuan}</b></span>}
            {goiY.kichCoGiay && <span>{t('Giày')}: <b>{goiY.kichCoGiay}</b></span>}
          </div>
          {!gioiTinh && <p className="nho mo">{t('Chọn "Bạn mua đồ cho" để xem sản phẩm phù hợp.')}</p>}
          {gioiTinh && NHOM[gioiTinh].map(({ tieuDe, danhMuc, theo }) => {
            const kichCo = goiY[theo];
            if (!kichCo) return null;
            const ds = sanPham[danhMuc];
            return (
              <div key={danhMuc} style={{ marginTop: 20 }}>
                <div className="hang giua-hang">
                  <h3 style={{ margin: 0 }}>{t(tieuDe)} · {t('size')} {kichCo}</h3>
                  <Link className="nut-chu nho" href={`/products?danhMuc=${danhMuc}&kichCo=${encodeURIComponent(kichCo)}`}>{t('Xem tất cả')}</Link>
                </div>
                {ds === undefined ? <DangTai /> : ds.length === 0 ? (
                  <p className="nho mo">{t('Hiện chưa có sản phẩm còn hàng ở cỡ này.')}</p>
                ) : (
                  <div className="luoi-sp" style={{ marginTop: 12 }}>{ds.map((sp) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
