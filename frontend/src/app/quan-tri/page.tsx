'use client';
import Link from 'next/link';
import { NhanTrangThai } from '@/components/Common';
import { TrangQuanTri, TrangThaiTai, useTai } from '@/components/AdminCommon';
import { TRANG_THAI_DON, vnd } from '@/lib/format';

export default function TongQuan() {
  const tk = useTai<any>('/api/quan-tri/thong-ke');
  const thap = useTai<any[]>('/api/quan-tri/kho/ton-thap?nguong=5');
  const t = tk.du;
  const toiDa = Math.max(1, ...(t?.doanhThuTheoNgay ?? []).map((x: any) => Number(x.doanhThu)));
  return (
    <TrangQuanTri tieuDe="Tổng quan">
      <TrangThaiTai dang={tk.dang} loi={tk.loi} coDuLieu={!!t}>
        {t && (
          <>
            <div className="so-lieu">
              <div><b>{vnd(t.tongQuan.doanhThu24Gio)}</b><span>Doanh thu 24 giờ</span></div>
              <div><b>{vnd(t.tongQuan.doanhThu7Ngay)}</b><span>Doanh thu 7 ngày</span></div>
              <div><b>{vnd(t.tongQuan.doanhThu30Ngay)}</b><span>Doanh thu 30 ngày ({t.tongQuan.soDon30Ngay} đơn)</span></div>
              <div><Link href="/quan-tri/doi-tra"><b>{t.doiTraChoDuyet}</b></Link><span>Đổi/trả chờ duyệt</span></div>
            </div>
            <p className="nho mo">Doanh thu tính trên đơn đã xác nhận, đang giao và đã giao.</p>
            <div className="the cach">
              <h3>Doanh thu 30 ngày gần nhất</h3>
              {t.doanhThuTheoNgay.length === 0 ? <p className="mo">Chưa có dữ liệu.</p> : (
                <div className="cot-bieu-do" role="img" aria-label="Biểu đồ doanh thu theo ngày">
                  {t.doanhThuTheoNgay.map((x: any) => <div key={x.ngay} style={{ height: Math.max(2, (Number(x.doanhThu) / toiDa) * 100) + '%' }}><span>{String(x.ngay).slice(0, 10)}: {vnd(x.doanhThu)} · {x.soDon} đơn</span></div>)}
                </div>
              )}
            </div>
            <div className="luoi-2 cach" style={{ gap: 16 }}>
              <div className="the"><h3>Đơn theo trạng thái</h3>
                {t.theoTrangThai.map((x: any) => <div key={x.trangThai} className="hang giua-hang" style={{ padding: '6px 0' }}><NhanTrangThai ma={x.trangThai} ten={TRANG_THAI_DON[x.trangThai]} /><Link className="nut-chu" href={'/quan-tri/don-hang?trangThai=' + x.trangThai}>{x.soDon} đơn</Link></div>)}
              </div>
              <div className="the"><h3>Bán chạy (30 ngày)</h3>
                {t.banChay.length === 0 && <p className="mo">Chưa có dữ liệu.</p>}
                {t.banChay.map((x: any) => <div key={x.maSanPham} className="hang giua-hang" style={{ padding: '6px 0' }}><span>{x.tenSanPham}</span><span className="mo nho">{x.daBan} cái · {vnd(x.doanhThu)}</span></div>)}
              </div>
            </div>
          </>
        )}
      </TrangThaiTai>
      <div className="the cach">
        <h3>Sắp hết hàng (còn ≤ 5)</h3>
        {thap.du && thap.du.length === 0 && <p className="mo">Không có biến thể nào sắp hết.</p>}
        {thap.du && thap.du.length > 0 && (
          <div className="bang-boc"><table className="bang"><thead><tr><th>Sản phẩm</th><th>Mã hàng</th><th>Size/Màu</th><th>Còn lại</th></tr></thead>
            <tbody>{thap.du.slice(0, 15).map((x: any) => <tr key={x.maBienThe}><td>{x.tenSanPham}</td><td>{x.maHang}</td><td>{x.kichCo} · {x.mauSac}</td><td><b style={{ color: x.conLai <= 0 ? 'var(--do)' : undefined }}>{x.conLai}</b></td></tr>)}</tbody></table></div>
        )}
      </div>
    </TrangQuanTri>
  );
}
