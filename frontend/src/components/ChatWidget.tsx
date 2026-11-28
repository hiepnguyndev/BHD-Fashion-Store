'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { goi, LoiApi } from '@/lib/api';
import { vnd } from '@/lib/format';
import { Anh } from './Common';
import { useT } from './Providers';

type The = { slug: string; ten: string; gia: number; giaGoc?: number; anh?: string | null; conHang?: boolean };
type Tin = { role: 'user' | 'assistant'; content: string; products?: The[]; links?: { ten: string; url: string }[] };

const KHOA = 'tro-ly-chat';
const CHAO: Tin = { role: 'assistant', content: 'Chào bạn! Mình là trợ lý của cửa hàng. Mình gợi ý sản phẩm, tư vấn size và giải đáp về đổi trả, vận chuyển. Bạn cần gì ạ?' };
const GOI_Y = ['Áo thun nam dưới 300k', 'Váy nữ đang giảm giá', 'Mình cao 1m70 nặng 65kg mặc size nào?', 'Chính sách đổi trả'];

export default function ChatWidget() {
  const t = useT();
  const [mo, setMo] = useState(false);
  const [tin, setTin] = useState<Tin[]>([CHAO]);
  const [nhap, setNhap] = useState('');
  const [dang, setDang] = useState(false);
  const [daGan, setDaGan] = useState(false);
  const cuoi = useRef<HTMLDivElement>(null);

  useEffect(() => setDaGan(true), []);

  useEffect(() => {
    try {
      const luu = sessionStorage.getItem(KHOA);
      if (luu) setTin(JSON.parse(luu));
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KHOA, JSON.stringify(tin.slice(-30))); } catch {}
    cuoi.current?.scrollIntoView({ block: 'end' });
  }, [tin, dang, mo]);
  useEffect(() => {
    if (!mo) return;
    const dong = (e: KeyboardEvent) => e.key === 'Escape' && setMo(false);
    window.addEventListener('keydown', dong);
    return () => window.removeEventListener('keydown', dong);
  }, [mo]);

  async function gui(noiDung: string) {
    const nd = noiDung.trim().slice(0, 600);
    if (!nd || dang) return;
    const moi: Tin[] = [...tin, { role: 'user', content: nd }];
    setTin(moi); setNhap(''); setDang(true);
    try {
      const r = await goi<any>('/api/tro-ly/chat', { method: 'POST', body: { messages: moi.slice(-10).map(({ role, content }) => ({ role, content })) } });
      setTin([...moi, { role: 'assistant', content: r.reply, products: r.products, links: r.links }]);
    } catch (e) {
      const m = e instanceof LoiApi && e.status === 429 ? e.message : t('Xin lỗi, trợ lý đang bận. Bạn thử lại sau ít phút hoặc dùng trang Liên hệ nhé.');
      setTin([...moi, { role: 'assistant', content: m }]);
    } finally { setDang(false); }
  }

  // Dựng thẳng vào <body>: nếu để trong cây trang, hiệu ứng chuyển trang (transform) sẽ biến vùng này thành
  // hệ quy chiếu của position: fixed và nút chat trôi theo trang.
  if (!daGan) return null;
  return createPortal(
    <>
      <button type="button" className="chat-nut" onClick={() => setMo(!mo)} aria-label={mo ? t('Đóng trợ lý') : t('Mở trợ lý tư vấn')} aria-expanded={mo}>
        {mo ? '✕' : '💬'}
      </button>
      {mo && (
        <section className="chat-khung" role="dialog" aria-label={t('Trợ lý tư vấn')}>
          <header><b>{t('Trợ lý tư vấn')}</b><span className="nho">{t('Trả lời tự động bằng AI, có thể chưa chính xác')}</span></header>
          <div className="chat-ds" aria-live="polite">
            {tin.map((m, i) => (
              <div key={i} className={'chat-tin ' + m.role}>
                <p>{m.role === 'assistant' && m.content === CHAO.content ? t(m.content) : m.content}</p>
                {!!m.products?.length && (
                  <div className="chat-sp">
                    {m.products.map((p) => (
                      <Link key={p.slug} href={`/products/${p.slug}`} className="chat-the" onClick={() => setMo(false)}>
                        <Anh src={p.anh} alt={p.ten} />
                        <span className="t">{p.ten}</span>
                        <span className="g">{vnd(p.gia)}{p.giaGoc && p.giaGoc > p.gia ? <s>{vnd(p.giaGoc)}</s> : null}</span>
                        {p.conHang === false && <em>{t('Hết hàng')}</em>}
                      </Link>
                    ))}
                  </div>
                )}
                {m.links?.map((l) => <Link key={l.url} href={l.url} className="chat-lk" onClick={() => setMo(false)}>{l.ten} →</Link>)}
              </div>
            ))}
            {dang && <div className="chat-tin assistant"><p className="chat-go"><i /><i /><i /></p></div>}
            {tin.length <= 1 && !dang && <div className="chat-goi-y">{GOI_Y.map((g) => <button key={g} type="button" className="chip" onClick={() => gui(g)}>{t(g)}</button>)}</div>}
            <div ref={cuoi} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); gui(nhap); }}>
            <input value={nhap} onChange={(e) => setNhap(e.target.value)} maxLength={600} placeholder={t('Nhập câu hỏi…')} aria-label={t('Câu hỏi')} disabled={dang} />
            <button className="nut" disabled={dang || !nhap.trim()}>{t('Gửi')}</button>
          </form>
        </section>
      )}
    </>,
    document.body,
  );
}
