'use client';
import { useEffect, useState } from 'react';
import { DangTai, TheSanPham } from '@/components/Common';
import { useAuth, useT, useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';
import { tinhGoiYSize, type GoiYSize, type ThongSoCoThe } from '@/lib/size';

const TRONG: Record<string, string> = { chieuCao: '', canNang: '', vongNguc: '', vongEo: '', coGiay: '' };
const SO = (v: string) => (v.trim() === '' ? undefined : Number(v));

const NHOM: { khoa: keyof GoiYSize; danhMuc: string; tieuDe: string }[] = [
  { khoa: 'kichCoAo', danhMuc: 'ao', tieuDe: 'Áo gợi ý' },
  { khoa: 'kichCoQuan', danhMuc: 'quan', tieuDe: 'Quần gợi ý' },
  { khoa: 'kichCoGiay', danhMuc: 'giay', tieuDe: 'Giày gợi ý' },
];

export default function TrangGoiYSize() {
  const { nguoiDung, dangTai: dangTaiAuth } = useAuth();
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState(TRONG);
  const [dangTai, setDangTai] = useState(true);
  const [dangGui, setDangGui] = useState(false);
  const [goiY, setGoiY] = useState<GoiYSize | null>(null);
  const [sanPham, setSanPham] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (dangTaiAuth) return;
    if (!nguoiDung) { setDangTai(false); return; }
    goi<{ thongSo: ThongSoCoThe; goiY: GoiYSize }>('/api/nguoi-dung/toi/thong-so')
      .then((r) => {
        setF({
          chieuCao: r.thongSo.chieuCao != null ? String(r.thongSo.chieuCao) : '',
          canNang: r.thongSo.canNang != null ? String(r.thongSo.canNang) : '',
          vongNguc: r.thongSo.vongNguc != null ? String(r.thongSo.vongNguc) : '',
          vongEo: r.thongSo.vongEo != null ? String(r.thongSo.vongEo) : '',
          coGiay: r.thongSo.coGiay != null ? String(r.thongSo.coGiay) : '',
        });
        if (Object.keys(r.goiY).length > 0) { setGoiY(r.goiY); taiSanPham(r.goiY); }
      })
      .catch(() => {})
      .finally(() => setDangTai(false));
  }, [dangTaiAuth, nguoiDung]);

  async function taiSanPham(gy: GoiYSize) {
    const ket: Record<string, any[]> = {};
    await Promise.all(NHOM.map(async ({ khoa, danhMuc }) => {
      const kichCo = gy[khoa];
      if (!kichCo) return;
      try {
        const r = await goi<any>('/api/san-pham?danhMuc=' + danhMuc + '&kichCo=' + encodeURIComponent(kichCo) + '&kichThuoc=8');
        ket[danhMuc] = r?.danhSach ?? [];
      } catch { ket[danhMuc] = []; }
    }));
    setSanPham(ket);
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const than = {
      chieuCao: SO(f.chieuCao), canNang: SO(f.canNang), vongNguc: SO(f.vongNguc),
      vongEo: SO(f.vongEo), coGiay: SO(f.coGiay),
    };
    if (!than.vongNguc && !than.vongEo && !than.coGiay && !(than.chieuCao && than.canNang)) {
      toast(t('Vui lòng nhập ít nhất vòng ngực, vòng eo hoặc cỡ giày (hoặc cả chiều cao và cân nặng).'), 'loi');
      return;
    }
    setDangGui(true);
    try {
      let gy: GoiYSize;
      if (nguoiDung) {
        const r = await goi<{ thongSo: ThongSoCoThe; goiY: GoiYSize }>('/api/nguoi-dung/toi/thong-so', { method: 'PUT', body: than });
        gy = r.goiY;
        toast(t('Đã lưu thông số và gợi ý size.'), 'ok');
      } else {
        gy = tinhGoiYSize(than);
      }
      setGoiY(gy);
      await taiSanPham(gy);
    } catch (er) {
      toast(er instanceof LoiApi ? er.message : t('Có lỗi xảy ra.'), 'loi');
    } finally {
      setDangGui(false);
    }
  }

  if (dangTaiAuth || dangTai) return <DangTai />;

  return (
    <div>
      <h1>{t('Gợi ý size')}</h1>
      <p className="nho mo">{t('Điền thông số cơ thể để hệ thống gợi ý cỡ Áo, Quần, Giày phù hợp. Đây là gợi ý gần đúng, không thay thế bảng size riêng của từng sản phẩm.')}</p>
      {!nguoiDung && <p className="nho mo">{t('Bạn chưa đăng nhập nên thông số sẽ không được lưu lại cho lần sau.')}</p>}

      <form onSubmit={gui} className="form-goi-y-size">
        <div className="truong"><label htmlFor="cc">{t('Chiều cao (cm)')}</label><input id="cc" type="number" min={100} max={230} value={f.chieuCao} onChange={(e) => setF((x) => ({ ...x, chieuCao: e.target.value }))} /></div>
        <div className="truong"><label htmlFor="cn">{t('Cân nặng (kg)')}</label><input id="cn" type="number" min={25} max={250} value={f.canNang} onChange={(e) => setF((x) => ({ ...x, canNang: e.target.value }))} /></div>
        <div className="truong"><label htmlFor="vn">{t('Vòng ngực (cm)')}</label><input id="vn" type="number" min={50} max={160} value={f.vongNguc} onChange={(e) => setF((x) => ({ ...x, vongNguc: e.target.value }))} /></div>
        <div className="truong"><label htmlFor="ve">{t('Vòng eo (cm)')}</label><input id="ve" type="number" min={40} max={160} value={f.vongEo} onChange={(e) => setF((x) => ({ ...x, vongEo: e.target.value }))} /></div>
        <div className="truong"><label htmlFor="cg">{t('Cỡ giày (EU)')}</label><input id="cg" type="number" min={34} max={46} step={0.5} value={f.coGiay} onChange={(e) => setF((x) => ({ ...x, coGiay: e.target.value }))} /></div>
        <button className="nut rong" disabled={dangGui} style={{ gridColumn: '1 / -1' }}>{dangGui ? t('Đang xử lý…') : t('Xem gợi ý')}</button>
      </form>

      {goiY && (
        <div style={{ marginTop: 28 }}>
          <h2>{t('Size gợi ý của bạn')}</h2>
          <div className="the-goi-y-size">
            {goiY.kichCoAo && <span>{t('Áo')}: <b>{goiY.kichCoAo}</b></span>}
            {goiY.kichCoQuan && <span>{t('Quần')}: <b>{goiY.kichCoQuan}</b></span>}
            {goiY.kichCoGiay && <span>{t('Giày')}: <b>{goiY.kichCoGiay}</b></span>}
          </div>
          {NHOM.map(({ khoa, danhMuc, tieuDe }) => {
            if (!goiY[khoa]) return null;
            const ds = sanPham[danhMuc];
            return (
              <div key={danhMuc} style={{ marginTop: 20 }}>
                <h3>{t(tieuDe)}</h3>
                {ds === undefined ? <DangTai /> : ds.length === 0 ? (
                  <p className="nho mo">{t('Hiện chưa có sản phẩm còn hàng ở cỡ này.')}</p>
                ) : (
                  <div className="luoi-sp">{ds.map((sp) => <TheSanPham key={sp.maSanPham} sp={sp} />)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
