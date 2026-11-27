'use client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { DangTai, NhanTrangThai } from '@/components/Chung';
import { goi, LoiApi } from '@/lib/api';
import { TEN_TT_THANH_TOAN, vnd } from '@/lib/dinh-dang';

function SaoChep({ nhan, giaTri, hienThi }: { nhan: string; giaTri: string; hienThi?: string }) {
  const [da, setDa] = useState(false);
  return (
    <div className="sao-chep">
      <div><div className="nho mo">{nhan}</div><b>{hienThi ?? giaTri}</b></div>
      <button type="button" className="nut vien nho" onClick={async () => { try { await navigator.clipboard.writeText(giaTri); setDa(true); setTimeout(() => setDa(false), 1500); } catch { /* bỏ qua */ } }}>{da ? 'Đã chép' : 'Sao chép'}</button>
    </div>
  );
}

function QR({ noiDung }: { noiDung: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) QRCode.toCanvas(ref.current, noiDung, { width: 260, margin: 1, errorCorrectionLevel: 'M' }).catch(() => {}); }, [noiDung]);
  return <div className="khung-qr"><canvas ref={ref} width={260} height={260} aria-label="Mã QR chuyển khoản" /></div>;
}

function DemNguoc({ den, batDau }: { den: string; batDau?: number }) {
  const [con, setCon] = useState(0);
  const tong = useRef(0);
  useEffect(() => {
    const dich = new Date(den.endsWith('Z') ? den : den + 'Z').getTime();
    tong.current = Math.max(1, dich - (batDau ?? Date.now()));
    const t = () => setCon(Math.max(0, dich - Date.now()));
    t(); const i = setInterval(t, 1000); return () => clearInterval(i);
  }, [den, batDau]);
  const giay = Math.floor(con / 1000);
  return (
    <div>
      <div className="hang giua-hang nho"><span>Còn lại để thanh toán</span><b>{String(Math.floor(giay / 60)).padStart(2, '0')}:{String(giay % 60).padStart(2, '0')}</b></div>
      <div className="dong-thanh-toan" style={{ marginTop: 6 }}><div style={{ width: Math.min(100, (con / tong.current) * 100) + '%' }} /></div>
    </div>
  );
}

function CongSePay({ ma, gateway }: { ma: string; gateway: { action: string; truong: { ten: string; giaTri: string }[] } }) {
  const form = useRef<HTMLFormElement>(null);
  const [daChuyen, setDaChuyen] = useState(false);
  useEffect(() => {
    // Chỉ tự chuyển sang cổng một lần cho mỗi giao dịch, để khách bấm "quay lại" không bị đẩy đi lặp lại
    const khoa = 'da-chuyen-' + ma;
    try { if (sessionStorage.getItem(khoa)) { setDaChuyen(true); return; } sessionStorage.setItem(khoa, '1'); } catch { /* bỏ qua */ }
    const t = setTimeout(() => form.current?.submit(), 900);
    return () => clearTimeout(t);
  }, [ma]);
  return (
    <form ref={form} method="POST" action={gateway.action}>
      {gateway.truong.map((t) => <input key={t.ten} type="hidden" name={t.ten} value={t.giaTri} />)}
      <p className="mo">{daChuyen ? 'Bạn chưa hoàn tất thanh toán trên cổng SePay.' : 'Đang chuyển bạn sang cổng thanh toán SePay…'}</p>
      <button className="nut lon rong">{daChuyen ? 'Thanh toán lại trên SePay' : 'Mở cổng thanh toán ngay'}</button>
    </form>
  );
}

function NoiDung() {
  const { ma } = useParams<{ ma: string }>();
  const sp = useSearchParams();
  const [tt, setTt] = useState<any>(null);
  const [loi, setLoi] = useState('');
  const batDau = useRef(Date.now());

  const tai = useCallback(async () => {
    try { setTt(await goi('/api/thanh-toan/trang-thai?ma=' + encodeURIComponent(ma))); setLoi(''); }
    catch (e) { setLoi(e instanceof LoiApi ? e.message : 'Không tải được thông tin thanh toán.'); }
  }, [ma]);
  useEffect(() => { tai(); }, [tai]);
  useEffect(() => {
    if (!tt || tt.trangThai !== 'ChoThanhToan' || tt.kenh === 'COD') return;
    const i = setInterval(tai, 4000);
    return () => clearInterval(i);
  }, [tt, tai]);

  if (loi && !tt) return <div className="xac-thuc-khung"><div className="thong-bao-loi">{loi}</div><Link className="nut vien" href="/">Về trang chủ</Link></div>;
  if (!tt) return <DangTai />;

  const lienKetDon = `/tra-cuu-don-hang?ma=${tt.maDonHienThi}`;
  const hd = tt.huongDan;

  if (tt.trangThai === 'DaThanhToan' || (tt.kenh === 'COD' && tt.trangThai !== 'HetHan')) {
    const cod = tt.kenh === 'COD' && tt.trangThai !== 'DaThanhToan';
    return (
      <div className="xac-thuc-khung giua">
        <div className="dau-tick">✓</div>
        <h1>{cod ? 'Đặt hàng thành công!' : 'Thanh toán thành công!'}</h1>
        <p className="mo">Mã đơn hàng của bạn: <b>{tt.maDonHienThi}</b>. Chúng tôi đã gửi email xác nhận.</p>
        {cod && <p>Bạn sẽ thanh toán <b>{vnd(tt.soTien)}</b> cho nhân viên giao hàng khi nhận hàng.</p>}
        <div className="hang" style={{ justifyContent: 'center' }}>
          <Link className="nut" href={lienKetDon}>Xem đơn hàng</Link>
          <Link className="nut vien" href="/san-pham">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }
  if (tt.trangThai === 'HetHan') {
    return (
      <div className="xac-thuc-khung giua">
        <h1>Giao dịch đã hết hạn</h1>
        <p className="mo">Đơn <b>{tt.maDonHienThi}</b> chưa được thanh toán trong thời gian quy định nên đã bị hủy. Nếu bạn đã chuyển tiền, cửa hàng sẽ kiểm tra và hoàn lại.</p>
        <Link className="nut" href="/san-pham">Mua sắm lại</Link>
      </div>
    );
  }
  if (tt.trangThai === 'CanXuLy' || tt.trangThai === 'DaHoan') {
    return (
      <div className="xac-thuc-khung giua">
        <h1>{tt.trangThai === 'DaHoan' ? 'Giao dịch đã được hoàn tiền' : 'Giao dịch đang được kiểm tra'}</h1>
        <p className="mo">Đơn <b>{tt.maDonHienThi}</b>: {TEN_TT_THANH_TOAN[tt.trangThai]}. Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng và cung cấp mã đơn hàng.</p>
        <Link className="nut vien" href={lienKetDon}>Xem đơn hàng</Link>
      </div>
    );
  }

  return (
    <div className="xac-thuc-khung">
      <h1 className="giua">Thanh toán đơn {tt.maDonHienThi}</h1>
      {sp.get('kq') === 'huy' && <div className="thong-bao-tin">Bạn đã hủy thanh toán. Đơn hàng vẫn được giữ trong thời gian còn lại.</div>}
      {sp.get('kq') === 'loi' && <div className="thong-bao-loi">Thanh toán chưa thành công. Bạn có thể thử lại.</div>}
      <div className="the">
        <div className="hang giua-hang"><span className="mo">Số tiền cần thanh toán</span><b style={{ fontSize: '1.4rem' }}>{vnd(tt.soTien)}</b></div>
        {tt.hetHanLuc && <div className="cach"><DemNguoc den={tt.hetHanLuc} batDau={batDau.current} /></div>}
        <hr style={{ border: 0, borderTop: '1px solid var(--vien)', margin: '18px 0' }} />
        {tt.kenh === 'VietQR' && hd && (
          <>
            <div className="giua"><QR noiDung={hd.qrPayload} /></div>
            <p className="giua nho mo cach">Mở app ngân hàng, chọn quét QR. Hệ thống tự xác nhận trong vài giây sau khi tiền về.</p>
            <div className="cach">
              <SaoChep nhan="Ngân hàng" giaTri={hd.nganHang} />
              <SaoChep nhan="Số tài khoản" giaTri={hd.soTaiKhoan} />
              <SaoChep nhan="Chủ tài khoản" giaTri={hd.tenChuTaiKhoan} />
              <SaoChep nhan="Số tiền" giaTri={String(hd.soTien)} hienThi={vnd(hd.soTien)} />
              <SaoChep nhan="Nội dung chuyển khoản (bắt buộc)" giaTri={hd.noiDung} />
            </div>
            <div className="thong-bao-tin">{hd.luuY}</div>
            <div className="hang giua nho mo" style={{ justifyContent: 'center' }}><span className="xoay" /> Đang chờ tiền về…</div>
          </>
        )}
        {tt.kenh === 'SePayGateway' && hd?.gateway && <CongSePay ma={ma} gateway={hd.gateway} />}
      </div>
      <p className="giua nho mo cach">Đã thanh toán mà trang chưa cập nhật? <button className="nut-chu" onClick={tai}>Kiểm tra lại</button> · <Link className="nut-chu" href={lienKetDon}>Xem đơn hàng</Link></p>
    </div>
  );
}

export default function TrangThanhToan() {
  return <Suspense fallback={<DangTai />}><NoiDung /></Suspense>;
}
