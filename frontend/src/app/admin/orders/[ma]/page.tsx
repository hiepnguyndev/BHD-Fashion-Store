'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import OrderDetail from '@/components/OrderDetail';
import { TrangQuanTri, TrangThaiTai, Truong, useTai, useThucHien } from '@/components/AdminCommon';
import { goi } from '@/lib/api';
import { CHUYEN_DON, TRANG_THAI_DON } from '@/lib/format';

const DON_VI = ['GHN', 'GHTK', 'ViettelPost', 'JT', 'TuGiao'];

export default function ChiTietDonQT() {
  const { ma } = useParams<{ ma: string }>();
  const { du: don, dang, loi, tai } = useTai<any>('/api/quan-tri/don-hang/' + encodeURIComponent(ma));
  const thucHien = useThucHien();
  const [trangThai, setTrangThai] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [donVi, setDonVi] = useState('GHN');
  const [maVanDon, setMaVanDon] = useState('');
  const [noiBo, setNoiBo] = useState<string | null>(null);
  const tiep = don ? CHUYEN_DON[don.trangThai] || [] : [];

  async function doi(e: React.FormEvent) {
    e.preventDefault();
    if (!trangThai) return;
    if (trangThai === 'DaHuy' && !confirm('Hủy đơn này? Hàng sẽ được trả về kho.')) return;
    const ok = await thucHien(() => goi(`/api/quan-tri/don-hang/${ma}/trang-thai`, { method: 'PATCH', body: { trangThai, ghiChu: ghiChu.trim() || null, donViVanChuyen: trangThai === 'DangGiao' ? donVi : null, maVanDon: trangThai === 'DangGiao' ? maVanDon.trim() || null : null } }), 'Đã cập nhật trạng thái.');
    if (ok) { setTrangThai(''); setGhiChu(''); tai(); }
  }
  return (
    <TrangQuanTri tieuDe={'Đơn ' + ma} hanhDong={<Link className="nut vien nho" href="/admin/orders">← Danh sách</Link>}>
      <TrangThaiTai dang={dang} loi={loi} coDuLieu={!!don}>
        {don && (
          <div className="luoi">
            {tiep.length > 0 && (
              <form className="the" onSubmit={doi}>
                <h3>Cập nhật trạng thái</h3>
                <div className="luoi-2">
                  <Truong nhan="Chuyển sang"><select value={trangThai} onChange={(e) => setTrangThai(e.target.value)} required><option value="">— Chọn —</option>{tiep.map((t) => <option key={t} value={t}>{TRANG_THAI_DON[t]}</option>)}</select></Truong>
                  <Truong nhan="Ghi chú gửi kèm (khách thấy)"><input value={ghiChu} maxLength={300} onChange={(e) => setGhiChu(e.target.value)} /></Truong>
                </div>
                {trangThai === 'DangGiao' && (
                  <div className="luoi-2">
                    <Truong nhan="Đơn vị vận chuyển"><select value={donVi} onChange={(e) => setDonVi(e.target.value)}>{DON_VI.map((d) => <option key={d}>{d}</option>)}</select></Truong>
                    <Truong nhan="Mã vận đơn"><input value={maVanDon} maxLength={50} onChange={(e) => setMaVanDon(e.target.value)} /></Truong>
                  </div>
                )}
                <button className={'nut' + (trangThai === 'DaHuy' ? ' do' : '')} disabled={!trangThai}>Cập nhật</button>
                <p className="nho mo cach">Khách sẽ nhận email và thông báo khi trạng thái thay đổi. Đơn COD chuyển “Đã giao” sẽ ghi nhận đã thu tiền.</p>
              </form>
            )}
            <OrderDetail don={don} choPhepDoiTra={false} taiLai={tai} huyDon={async () => {}} />
            <div className="the">
              <h3>Ghi chú nội bộ (khách không thấy)</h3>
              <textarea className="o" maxLength={500} value={noiBo ?? don.ghiChuNoiBo ?? ''} onChange={(e) => setNoiBo(e.target.value)} />
              <button className="nut vien cach" onClick={async () => { if (await thucHien(() => goi(`/api/quan-tri/don-hang/${ma}/ghi-chu`, { method: 'PATCH', body: { ghiChu: noiBo ?? don.ghiChuNoiBo ?? '' } }), 'Đã lưu ghi chú.')) tai(); }}>Lưu ghi chú</button>
            </div>
          </div>
        )}
      </TrangThaiTai>
    </TrangQuanTri>
  );
}
