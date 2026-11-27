'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DangTai, Trong } from '@/components/Chung';
import { useAuth, useGio, useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';
import { TEN_PHUONG_THUC, TINH_THANH_PHO, vnd } from '@/lib/dinh-dang';

// Chỉ để hiển thị tạm tính: số liệu chính thức do dịch vụ đơn hàng tính khi đặt.
const PHI_VAN_CHUYEN = 30000;
const MIEN_PHI_TU = 500000;

export default function TrangDatHang() {
  const router = useRouter();
  const { nguoiDung, dangTai: dangTaiAuth } = useAuth();
  const { gio, dangTai: dangTaiGio } = useGio();
  const toast = useToast();
  const [f, setF] = useState({ email: '', tenNguoiNhan: '', soDienThoai: '', diaChiGiao: '', phuongXa: '', tinhThanh: 'TP. Hồ Chí Minh', ghiChu: '' });
  const [phuongThuc, setPhuongThuc] = useState('COD');
  const [ma, setMa] = useState('');
  const [phieu, setPhieu] = useState<any>(null);
  const [loiPhieu, setLoiPhieu] = useState('');
  const [diaChi, setDiaChi] = useState<any[]>([]);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState('');
  const [dongY, setDongY] = useState(false);

  const muaDuoc = useMemo(() => gio.dong.filter((d) => d.coTheMua), [gio.dong]);
  const tamTinh = muaDuoc.reduce((s, d) => s + d.thanhTien, 0);
  const phiVC = tamTinh >= MIEN_PHI_TU || tamTinh === 0 ? 0 : PHI_VAN_CHUYEN;
  const giam = phieu?.tienGiam ?? 0;
  const tong = Math.max(0, tamTinh + phiVC - giam);
  const dat = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!nguoiDung) return;
    setF((x) => ({ ...x, email: x.email || nguoiDung.email, tenNguoiNhan: x.tenNguoiNhan || nguoiDung.hoTen, soDienThoai: x.soDienThoai || nguoiDung.soDienThoai || '' }));
    goi<any[]>('/api/nguoi-dung/toi/dia-chi').then((ds) => {
      setDiaChi(ds);
      const md = ds.find((d) => d.macDinh) ?? ds[0];
      if (md) chonDiaChi(md);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nguoiDung?.maNguoiDung]);

  function chonDiaChi(d: any) {
    setF((x) => ({ ...x, tenNguoiNhan: d.tenNguoiNhan, soDienThoai: d.soDienThoai, diaChiGiao: d.diaChiCuThe, phuongXa: d.phuongXa, tinhThanh: d.tinhThanh }));
    (window as any).__diaChi = d;
  }

  async function kiemTraPhieu() {
    setLoiPhieu(''); setPhieu(null);
    if (!ma.trim()) return;
    try {
      setPhieu(await goi('/api/phieu-giam-gia/kiem-tra', { method: 'POST', body: { maCode: ma.trim().toUpperCase(), tongTienHang: tamTinh, email: f.email || null } }));
    } catch (e) { setLoiPhieu(e instanceof LoiApi ? e.message : 'Không kiểm tra được mã.'); }
  }

  async function datHang(e: React.FormEvent) {
    e.preventDefault();
    setLoi('');
    if (!dongY) { setLoi('Vui lòng đồng ý với điều khoản mua hàng.'); return; }
    setDangGui(true);
    try {
      const d = (window as any).__diaChi;
      const r = await goi<any>('/api/don-hang', {
        method: 'POST',
        body: {
          email: f.email.trim(), tenNguoiNhan: f.tenNguoiNhan.trim(), soDienThoai: f.soDienThoai.trim(), diaChiGiao: f.diaChiGiao.trim(),
          maPhuongXa: d && d.phuongXa === f.phuongXa ? d.maPhuongXa : null, phuongXa: f.phuongXa.trim(),
          maTinhThanh: d && d.tinhThanh === f.tinhThanh ? d.maTinhThanh : null, tinhThanh: f.tinhThanh,
          phuongThuc, maGiamGia: phieu ? phieu.maCode : null, ghiChu: f.ghiChu.trim() || null,
          dong: muaDuoc.map((x) => ({ maBienThe: x.maBienThe, soLuong: x.soLuong })),
        },
      });
      const maTT = r.thanhToan?.maThanhToanNganHang;
      router.push(maTT ? `/thanh-toan/${maTT}` : `/tra-cuu-don-hang?ma=${r.maDonHienThi}`);
    } catch (e) {
      const m = e instanceof LoiApi ? e.message : 'Không đặt được hàng. Vui lòng thử lại.';
      setLoi(m); toast(m, 'loi');
    } finally { setDangGui(false); }
  }

  if (dangTaiAuth || (dangTaiGio && gio.dong.length === 0)) return <DangTai />;
  if (muaDuoc.length === 0) return <Trong tieuDe="Chưa có sản phẩm để đặt hàng"><Link className="nut" href="/san-pham">Tiếp tục mua sắm</Link></Trong>;

  return (
    <form onSubmit={datHang}>
      <h1>Đặt hàng</h1>
      {!nguoiDung && <div className="thong-bao-tin">Bạn có thể đặt hàng không cần tài khoản. <Link className="nut-chu" href="/dang-nhap?tiep=/dat-hang">Đăng nhập</Link> để lưu địa chỉ và theo dõi đơn dễ hơn.</div>}
      <div className="bo-cuc-gio">
        <div className="luoi">
          <section className="the">
            <h2>Thông tin giao hàng</h2>
            {diaChi.length > 0 && (
              <div className="truong"><label htmlFor="dc">Địa chỉ đã lưu</label>
                <select id="dc" onChange={(e) => { const d = diaChi.find((x) => String(x.maDiaChi) === e.target.value); if (d) chonDiaChi(d); }} defaultValue={(diaChi.find((d) => d.macDinh) ?? diaChi[0]).maDiaChi}>
                  {diaChi.map((d) => <option key={d.maDiaChi} value={d.maDiaChi}>{d.tenNguoiNhan} — {d.diaChiCuThe}, {d.phuongXa}, {d.tinhThanh}</option>)}
                </select></div>
            )}
            <div className="luoi-2">
              <div className="truong"><label htmlFor="ten">Họ tên người nhận</label><input id="ten" required minLength={2} maxLength={100} autoComplete="name" value={f.tenNguoiNhan} onChange={(e) => dat('tenNguoiNhan', e.target.value)} /></div>
              <div className="truong"><label htmlFor="sdt">Số điện thoại</label><input id="sdt" required inputMode="tel" pattern="0[0-9]{9}" title="Số điện thoại 10 chữ số, bắt đầu bằng 0" autoComplete="tel" value={f.soDienThoai} onChange={(e) => dat('soDienThoai', e.target.value)} /></div>
            </div>
            <div className="truong"><label htmlFor="em">Email (nhận xác nhận đơn hàng)</label><input id="em" type="email" required maxLength={150} autoComplete="email" value={f.email} onChange={(e) => dat('email', e.target.value)} /></div>
            <div className="truong"><label htmlFor="dcg">Số nhà, tên đường</label><input id="dcg" required minLength={3} maxLength={255} autoComplete="street-address" value={f.diaChiGiao} onChange={(e) => dat('diaChiGiao', e.target.value)} /></div>
            <div className="luoi-2">
              <div className="truong"><label htmlFor="px">Phường / xã</label><input id="px" required maxLength={100} value={f.phuongXa} onChange={(e) => dat('phuongXa', e.target.value)} /></div>
              <div className="truong"><label htmlFor="tt">Tỉnh / thành phố</label>
                <select id="tt" required value={f.tinhThanh} onChange={(e) => dat('tinhThanh', e.target.value)}>{TINH_THANH_PHO.map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="truong"><label htmlFor="gc">Ghi chú cho cửa hàng (không bắt buộc)</label><textarea id="gc" maxLength={500} value={f.ghiChu} onChange={(e) => dat('ghiChu', e.target.value)} /></div>
          </section>

          <section className="the">
            <h2>Phương thức thanh toán</h2>
            {(['COD', 'VietQR', 'SePayGateway'] as const).map((k) => (
              <label key={k} className={'the-chon' + (phuongThuc === k ? ' dang' : '')}>
                <input type="radio" name="pt" checked={phuongThuc === k} onChange={() => setPhuongThuc(k)} />
                <div><b>{TEN_PHUONG_THUC[k]}</b>
                  <div className="nho mo">{k === 'COD' ? 'Trả tiền mặt cho nhân viên giao hàng.' : k === 'VietQR' ? 'Quét mã QR bằng app ngân hàng, hệ thống tự xác nhận khi tiền về.' : 'Thanh toán bằng thẻ, ví hoặc QR trên cổng của SePay.'}</div></div>
              </label>
            ))}
          </section>
        </div>

        <aside className="the tom-tat">
          <h3>Đơn hàng ({muaDuoc.length} sản phẩm)</h3>
          {muaDuoc.map((d) => <div key={d.maChiTiet} className="dong nho"><span>{d.tenSanPham} <span className="mo">({[d.mauSac, d.kichCo].filter(Boolean).join(', ')}) × {d.soLuong}</span></span><span>{vnd(d.thanhTien)}</span></div>)}
          <div className="truong cach" style={{ marginBottom: 6 }}>
            <label htmlFor="ma">Mã giảm giá</label>
            <div className="hang" style={{ flexWrap: 'nowrap' }}>
              <input id="ma" className="o" value={ma} onChange={(e) => setMa(e.target.value.toUpperCase())} maxLength={30} placeholder="Nhập mã" />
              <button type="button" className="nut vien" onClick={kiemTraPhieu}>Áp dụng</button>
            </div>
            {loiPhieu && <div className="nho" style={{ color: 'var(--do)' }}>{loiPhieu}</div>}
            {phieu && <div className="nho" style={{ color: 'var(--luc)' }}>Đã áp dụng mã {phieu.maCode}: giảm {vnd(phieu.tienGiam)}</div>}
          </div>
          <div className="dong"><span>Tạm tính</span><span>{vnd(tamTinh)}</span></div>
          <div className="dong"><span>Phí vận chuyển (tạm tính)</span><span>{phiVC === 0 ? 'Miễn phí' : vnd(phiVC)}</span></div>
          {giam > 0 && <div className="dong"><span>Giảm giá</span><span>−{vnd(giam)}</span></div>}
          <div className="dong tong"><span>Tổng</span><span>{vnd(tong)}</span></div>
          <p className="nho mo">Số tiền chính thức được tính lại khi đặt hàng.</p>
          <label className="chon-dong cach"><input type="checkbox" checked={dongY} onChange={(e) => setDongY(e.target.checked)} /><span>Tôi đã đọc và đồng ý với <Link className="nut-chu" href="/chinh-sach/dieu-khoan" target="_blank">điều khoản</Link> và <Link className="nut-chu" href="/chinh-sach/doi-tra" target="_blank">chính sách đổi trả</Link>.</span></label>
          {loi && <div className="thong-bao-loi cach">{loi}</div>}
          <button className="nut lon rong cach" disabled={dangGui}>{dangGui ? 'Đang xử lý…' : 'Đặt hàng'}</button>
        </aside>
      </div>
    </form>
  );
}
