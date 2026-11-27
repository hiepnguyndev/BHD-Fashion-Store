'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import ChiTietDon from '@/components/ChiTietDon';
import { DangTai } from '@/components/Chung';
import { goi, LoiApi } from '@/lib/api';

function Noi() {
  const sp = useSearchParams();
  const [ma, setMa] = useState((sp.get('ma') || '').toUpperCase());
  const [email, setEmail] = useState('');
  const [don, setDon] = useState<any>(null);
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(false);

  async function tra(e?: React.FormEvent) {
    e?.preventDefault();
    setLoi(''); setDang(true);
    try { setDon(await goi('/api/don-hang/tra-cuu?ma=' + encodeURIComponent(ma.trim()) + '&email=' + encodeURIComponent(email.trim()))); }
    catch (err) { setDon(null); setLoi(err instanceof LoiApi ? err.message : 'Không tra cứu được đơn hàng.'); }
    finally { setDang(false); }
  }
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>Tra cứu đơn hàng</h1>
      <form className="the" onSubmit={tra}>
        <div className="luoi-2">
          <div className="truong"><label htmlFor="ma">Mã đơn hàng</label><input id="ma" required value={ma} onChange={(e) => setMa(e.target.value.toUpperCase())} placeholder="DH260101ABCDE" /></div>
          <div className="truong"><label htmlFor="em">Email đặt hàng</label><input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <button className="nut" disabled={dang}>{dang ? 'Đang tra…' : 'Tra cứu'}</button>
        {loi && <div className="thong-bao-loi cach">{loi}</div>}
      </form>
      {don && (
        <div className="cach-lon">
          <ChiTietDon don={don} choPhepDoiTra={false} taiLai={tra}
            huyDon={async (lyDo) => { await goi('/api/don-hang/tra-cuu/huy?ma=' + encodeURIComponent(don.maDonHienThi), { method: 'POST', body: { lyDo, email: email.trim() } }); }} />
        </div>
      )}
    </div>
  );
}
export default function TraCuu() { return <Suspense fallback={<DangTai />}><Noi /></Suspense>; }
