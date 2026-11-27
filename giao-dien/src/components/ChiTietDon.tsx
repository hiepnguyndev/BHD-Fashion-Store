'use client';
import Link from 'next/link';
import { useState } from 'react';
import { HopThoai, NhanTrangThai } from '@/components/Chung';
import { useToast } from '@/components/Providers';
import { goi, LoiApi } from '@/lib/api';
import { ngayGio, TEN_DOI_TRA, TEN_PHUONG_THUC, TEN_TT_THANH_TOAN, TRANG_THAI_DON, vnd } from '@/lib/dinh-dang';

export default function ChiTietDon({ don, huyDon, taiLai, choPhepDoiTra }: { don: any; huyDon: (lyDo: string) => Promise<void>; taiLai: () => void; choPhepDoiTra: boolean }) {
  const toast = useToast();
  const [moHuy, setMoHuy] = useState(false);
  const [lyDo, setLyDo] = useState('');
  const [dang, setDang] = useState(false);
  const [moDoiTra, setMoDoiTra] = useState(false);
  const coTheHuy = ['ChoThanhToan', 'ChoXacNhan'].includes(don.trangThai);
  const tt = don.thanhToan;

  async function xacNhanHuy() {
    setDang(true);
    try { await huyDon(lyDo.trim() || 'Khách hàng hủy'); setMoHuy(false); toast('Đã hủy đơn hàng.', 'ok'); taiLai(); }
    catch (e) { toast(e instanceof LoiApi ? e.message : 'Không hủy được đơn.', 'loi'); }
    finally { setDang(false); }
  }

  return (
    <div className="luoi">
      <div className="the">
        <div className="hang giua-hang">
          <div><div className="nho mo">Đơn hàng</div><h1 style={{ margin: 0, fontSize: '1.6rem' }}>{don.maDonHienThi}</h1><div className="nho mo">Đặt lúc {ngayGio(don.ngayDat)}</div></div>
          <NhanTrangThai ma={don.trangThai} ten={don.tenTrangThai || TRANG_THAI_DON[don.trangThai]} />
        </div>
        {don.trangThai === 'DaHuy' && don.lyDoHuy && <p className="nho cach mo">Lý do hủy: {don.lyDoHuy}</p>}
        {don.trangThai === 'ChoThanhToan' && tt?.maThanhToanNganHang && tt.trangThai === 'ChoThanhToan' && tt.kenh !== 'COD' && (
          <Link className="nut cach" href={'/thanh-toan/' + tt.maThanhToanNganHang}>Thanh toán ngay</Link>
        )}
      </div>

      <div className="the">
        <h3>Sản phẩm</h3>
        {don.dong.map((d: any) => (
          <div key={d.maChiTietDon} className="hang giua-hang" style={{ padding: '10px 0', borderTop: '1px solid var(--vien)' }}>
            <div><b>{d.tenSanPham}</b><div className="nho mo">{d.mauSac} · {d.kichCo} · × {d.soLuong}</div></div>
            <b>{vnd(d.donGia * d.soLuong)}</b>
          </div>
        ))}
        <div style={{ borderTop: '1.5px dashed var(--vien)', marginTop: 8, paddingTop: 12 }}>
          <div className="hang giua-hang"><span>Tiền hàng</span><span>{vnd(don.tongTienHang)}</span></div>
          <div className="hang giua-hang"><span>Phí vận chuyển</span><span>{vnd(don.phiVanChuyen)}</span></div>
          {don.tienGiam > 0 && <div className="hang giua-hang"><span>Giảm giá</span><span>−{vnd(don.tienGiam)}</span></div>}
          <div className="hang giua-hang" style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 6 }}><span>Tổng thanh toán</span><span>{vnd(don.tongThanhToan)}</span></div>
        </div>
      </div>

      <div className="luoi-2" style={{ gap: 16 }}>
        <div className="the">
          <h3>Giao đến</h3>
          <b>{don.tenNguoiNhan}</b> · {don.soDienThoai}
          <div>{don.diaChiGiao}, {don.phuongXa}, {don.tinhThanh}</div>
          {don.ghiChuKhach && <div className="nho mo cach">Ghi chú: {don.ghiChuKhach}</div>}
          {don.vanChuyen?.map((v: any) => <div key={v.maVanChuyen} className="nho cach"><b>Vận chuyển:</b> {v.donViVanChuyen}{v.maVanDon ? ` · Mã vận đơn ${v.maVanDon}` : ''}</div>)}
        </div>
        <div className="the">
          <h3>Thanh toán</h3>
          <div>{TEN_PHUONG_THUC[don.phuongThucThanhToan] || don.phuongThucThanhToan}</div>
          {tt && <div className="cach"><NhanTrangThai ma={tt.trangThai} ten={TEN_TT_THANH_TOAN[tt.trangThai]} /></div>}
        </div>
      </div>

      {don.lichSu?.length > 0 && (
        <div className="the">
          <h3>Tiến trình đơn hàng</h3>
          <ul className="lich-su">
            {don.lichSu.map((l: any, i: number) => <li key={i}><b>{TRANG_THAI_DON[l.trangThaiMoi] || l.trangThaiMoi}</b><div className="nho mo">{ngayGio(l.ngayTao)}{l.ghiChu ? ' · ' + l.ghiChu : ''}</div></li>)}
          </ul>
        </div>
      )}

      {don.doiTra?.length > 0 && (
        <div className="the">
          <h3>Yêu cầu đổi/trả</h3>
          {don.doiTra.map((d: any) => (
            <div key={d.maDoiTra} style={{ padding: '8px 0', borderTop: '1px solid var(--vien)' }}>
              <div className="hang giua-hang"><b>{d.hinhThuc === 'DoiHang' ? 'Đổi hàng' : 'Trả hàng'}</b><NhanTrangThai ma={d.trangThai} ten={TEN_DOI_TRA[d.trangThai]} /></div>
              <div className="nho mo">{d.lyDo}</div>
              {d.ghiChuAdmin && <div className="nho">Phản hồi: {d.ghiChuAdmin}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="hang">
        {coTheHuy && <button className="nut do vien" onClick={() => setMoHuy(true)}>Hủy đơn hàng</button>}
        {choPhepDoiTra && don.coTheDoiTra && <button className="nut vien" onClick={() => setMoDoiTra(true)}>Yêu cầu đổi/trả</button>}
      </div>

      {moHuy && (
        <HopThoai tieuDe="Hủy đơn hàng" dong={() => setMoHuy(false)}>
          <div className="truong"><label htmlFor="ly-do">Lý do hủy</label><textarea id="ly-do" value={lyDo} maxLength={300} onChange={(e) => setLyDo(e.target.value)} placeholder="Ví dụ: đặt nhầm, muốn đổi sản phẩm khác…" /></div>
          <div className="hang"><button className="nut do" disabled={dang} onClick={xacNhanHuy}>{dang ? 'Đang hủy…' : 'Xác nhận hủy'}</button><button className="nut vien" onClick={() => setMoHuy(false)}>Giữ đơn</button></div>
        </HopThoai>
      )}
      {moDoiTra && <FormDoiTra don={don} dong={() => setMoDoiTra(false)} xong={taiLai} />}
    </div>
  );
}

function FormDoiTra({ don, dong, xong }: { don: any; dong: () => void; xong: () => void }) {
  const toast = useToast();
  const [hinhThuc, setHinhThuc] = useState<'DoiHang' | 'TraHang'>('TraHang');
  const [lyDo, setLyDo] = useState('');
  const [chon, setChon] = useState<Record<number, number>>({});
  const [bienTheMoi, setBienTheMoi] = useState<Record<number, string>>({});
  const [dang, setDang] = useState(false);
  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const dongDT = Object.entries(chon).filter(([, n]) => n > 0).map(([ma, n]) => ({ maChiTietDon: Number(ma), soLuong: n, maBienTheMoi: hinhThuc === 'DoiHang' && bienTheMoi[Number(ma)] ? Number(bienTheMoi[Number(ma)]) : null }));
    if (dongDT.length === 0) { toast('Hãy chọn ít nhất một sản phẩm.', 'loi'); return; }
    setDang(true);
    try { const r = await goi<any>(`/api/don-hang/${don.maDonHienThi}/doi-tra`, { method: 'POST', body: { hinhThuc, lyDo: lyDo.trim(), dong: dongDT } }); toast(r.thongBao, 'ok'); dong(); xong(); }
    catch (err) { toast(err instanceof LoiApi ? err.message : 'Không gửi được yêu cầu.', 'loi'); }
    finally { setDang(false); }
  }
  return (
    <HopThoai tieuDe="Yêu cầu đổi/trả" dong={dong} rong>
      <form onSubmit={gui}>
        <div className="hang" style={{ marginBottom: 12 }}>
          <label className="chon-dong"><input type="radio" checked={hinhThuc === 'TraHang'} onChange={() => setHinhThuc('TraHang')} />Trả hàng, hoàn tiền</label>
          <label className="chon-dong"><input type="radio" checked={hinhThuc === 'DoiHang'} onChange={() => setHinhThuc('DoiHang')} />Đổi sang sản phẩm khác</label>
        </div>
        {don.dong.map((d: any) => (
          <div key={d.maChiTietDon} className="hang giua-hang" style={{ padding: '8px 0', borderTop: '1px solid var(--vien)' }}>
            <div><b>{d.tenSanPham}</b><div className="nho mo">{d.mauSac} · {d.kichCo} · đã mua {d.soLuong}</div></div>
            <div className="hang">
              {hinhThuc === 'DoiHang' && <input className="o" style={{ width: 150 }} inputMode="numeric" placeholder="Mã biến thể mới" value={bienTheMoi[d.maChiTietDon] || ''} onChange={(e) => setBienTheMoi((x) => ({ ...x, [d.maChiTietDon]: e.target.value.replace(/\D/g, '') }))} />}
              <select className="o" style={{ width: 90 }} value={chon[d.maChiTietDon] || 0} onChange={(e) => setChon((x) => ({ ...x, [d.maChiTietDon]: Number(e.target.value) }))}>
                {Array.from({ length: d.soLuong + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        ))}
        {hinhThuc === 'DoiHang' && <p className="nho mo">Để đổi size/màu, nhập mã biến thể mới (xem ở trang sản phẩm hoặc hỏi cửa hàng). Cửa hàng sẽ xác nhận còn hàng.</p>}
        <div className="truong cach"><label htmlFor="ld">Lý do</label><textarea id="ld" required minLength={5} maxLength={500} value={lyDo} onChange={(e) => setLyDo(e.target.value)} /></div>
        <button className="nut" disabled={dang}>{dang ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      </form>
    </HopThoai>
  );
}
