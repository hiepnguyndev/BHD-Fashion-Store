'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HopThoai } from './Common';
import { useAuth, useT } from './Providers';
import { goi, LoiApi } from '@/lib/api';

type Buoc = 'chon' | 'dang-xu-ly' | 'xong' | 'loi';

// Thử đồ bằng AI: tải ảnh lên hoặc chụp từ camera, dịch vụ `thudo` ghép áo của sản phẩm lên ảnh.
export default function ThuDo({ slug, mau, ten }: { slug: string; mau?: string; ten: string }) {
  const { nguoiDung } = useAuth();
  const t = useT();
  const [mo, setMo] = useState(false);
  const [nguon, setNguon] = useState<'tai-len' | 'camera'>('tai-len');
  const [tep, setTep] = useState<Blob | null>(null);
  const [xem, setXem] = useState<string | null>(null);
  const [dongY, setDongY] = useState(false);
  const [buoc, setBuoc] = useState<Buoc>('chon');
  const [thongDiep, setThongDiep] = useState('');
  const [ma, setMa] = useState<string | null>(null);
  const [conLai, setConLai] = useState<number | null>(null);
  const [camLoi, setCamLoi] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const luong = useRef<MediaStream | null>(null);
  const dung = useRef(false);

  const tatCamera = useCallback(() => {
    luong.current?.getTracks().forEach((t) => t.stop());
    luong.current = null;
  }, []);
  const dong = () => { dung.current = true; tatCamera(); setMo(false); };
  useEffect(() => () => { dung.current = true; luong.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => () => { if (xem) URL.revokeObjectURL(xem); }, [xem]);

  const datAnh = (b: Blob) => { setTep(b); setXem(URL.createObjectURL(b)); };

  async function batCamera() {
    setCamLoi('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      luong.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
    } catch {
      setCamLoi(t('Không mở được camera. Hãy cho phép trình duyệt dùng camera hoặc chọn tải ảnh lên.'));
    }
  }
  useEffect(() => {
    if (mo && nguon === 'camera' && !xem && buoc === 'chon') batCamera();
    else tatCamera();
  }, [mo, nguon, xem, buoc, tatCamera]);

  function chup() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) { datAnh(b); tatCamera(); } }, 'image/jpeg', 0.92);
  }

  async function gui() {
    if (!tep) return;
    setBuoc('dang-xu-ly'); setThongDiep(t('Đang gửi ảnh…')); dung.current = false;
    try {
      const f = new FormData();
      f.append('anh', tep, 'anh.jpg'); f.append('slug', slug); if (mau) f.append('mau', mau); f.append('dongY', 'true');
      const r = await goi<{ maThuDo: string; trangThai: string; conLai: number }>('/api/thu-do', { method: 'POST', form: f });
      setMa(r.maThuDo); setConLai(r.conLai);
      await cho(r.maThuDo);
    } catch (e) {
      setBuoc('loi'); setThongDiep(e instanceof LoiApi ? e.message : t('Có lỗi xảy ra. Vui lòng thử lại.'));
    }
  }

  async function cho(maThuDo: string) {
    const batDau = Date.now();
    while (!dung.current && Date.now() - batDau < 6 * 60 * 1000) {
      const s = await goi<{ trangThai: string; viTri: number; thongDiep?: string | null }>('/api/thu-do/' + maThuDo);
      if (s.trangThai === 'xong') { setBuoc('xong'); return; }
      if (s.trangThai === 'loi') { setBuoc('loi'); setThongDiep(s.thongDiep || t('Không thử được. Vui lòng thử lại.')); return; }
      setThongDiep(s.trangThai === 'cho' ? t('Đang xếp hàng (vị trí {n})…', { n: s.viTri }) : t('AI đang mặc thử cho bạn, thường mất 30–90 giây…'));
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!dung.current) { setBuoc('loi'); setThongDiep(t('Quá lâu chưa có kết quả. Dịch vụ miễn phí có thể đang quá tải, bạn thử lại sau nhé.')); }
  }

  async function lamLai() {
    if (ma) goi('/api/thu-do/' + ma, { method: 'DELETE' }).catch(() => {});
    setMa(null); setTep(null); setXem(null); setBuoc('chon'); setThongDiep('');
  }
  async function xoaVaDong() {
    if (ma) await goi('/api/thu-do/' + ma, { method: 'DELETE' }).catch(() => {});
    dong();
  }

  return (
    <>
      <button type="button" className="nut vien rong cach" style={{ marginTop: 10 }} onClick={() => setMo(true)}>{t('✨ Thử đồ bằng AI')}</button>
      {mo && (
        <HopThoai tieuDe={t('Thử đồ: {ten}', { ten })} dong={dong} rong>
          {!nguoiDung ? (
            <p>{t('Bạn cần đăng nhập để thử đồ.')} <Link className="nut-chu" href={'/login?tiep=' + encodeURIComponent('/products/' + slug)}>{t('Đăng nhập')}</Link></p>
          ) : buoc === 'chon' ? (
            <div className="thudo">
              <div className="hang" role="tablist">
                <button type="button" className={'chip' + (nguon === 'tai-len' ? ' dang' : '')} onClick={() => { setNguon('tai-len'); setTep(null); setXem(null); }}>{t('Tải ảnh lên')}</button>
                <button type="button" className={'chip' + (nguon === 'camera' ? ' dang' : '')} onClick={() => { setNguon('camera'); setTep(null); setXem(null); }}>{t('Dùng camera')}</button>
              </div>
              <div className="thudo-khung">
                {xem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={xem} alt="Ảnh của bạn" />
                ) : nguon === 'camera' ? (
                  <>
                    <video ref={video} playsInline muted style={{ transform: 'scaleX(-1)' }} />
                    {camLoi && <p className="nho" style={{ padding: 12 }}>{camLoi}</p>}
                  </>
                ) : (
                  <label className="thudo-chon">
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && datAnh(e.target.files[0])} />
                    <span>{t('Chọn ảnh toàn thân hoặc nửa người, đứng thẳng, rõ nét')}</span>
                  </label>
                )}
              </div>
              {nguon === 'camera' && !xem && <button type="button" className="nut rong" onClick={chup} disabled={!!camLoi}>{t('Chụp ảnh')}</button>}
              {xem && <button type="button" className="nut-chu nho" onClick={() => { setTep(null); setXem(null); }}>{t('Chọn ảnh khác')}</button>}
              <ul className="nho mo thudo-meo">
                <li>{t('Hiện hỗ trợ áo. Mặc áo ôm sát hoặc áo ngắn tay cho kết quả tốt hơn.')}</li>
                <li>{t('Chỉ một người trong ảnh, nền đơn giản, đủ sáng, nhìn thẳng.')}</li>
                <li>{t('Kết quả mang tính minh họa, không thay thế bảng size.')}</li>
              </ul>
              <label className="chon-dong">
                <input type="checkbox" checked={dongY} onChange={(e) => setDongY(e.target.checked)} />
                <span className="nho">{t('Tôi đồng ý gửi ảnh này tới dịch vụ AI công khai (Hugging Face) để thử đồ. Cửa hàng không lưu ảnh gốc; ảnh kết quả tự xóa sau 30 phút.')}</span>
              </label>
              <button type="button" className="nut rong" disabled={!tep || !dongY} onClick={gui}>{t('Thử đồ')}</button>
            </div>
          ) : buoc === 'dang-xu-ly' ? (
            <div className="giua thudo-cho"><div className="vong-quay" aria-hidden /><p>{thongDiep}</p><p className="nho mo">{t('Vui lòng giữ cửa sổ này mở.')}</p></div>
          ) : buoc === 'xong' && ma ? (
            <div>
              <div className="thudo-ket-qua">
                {xem && <figure><img src={xem} alt="Ảnh gốc" /><figcaption className="nho mo">{t('Ảnh của bạn')}</figcaption></figure>}
                <figure><img src={`/api/thu-do/${ma}/anh`} alt={`Kết quả thử ${ten}`} /><figcaption className="nho mo">{t('Kết quả AI')}</figcaption></figure>
              </div>
              <p className="nho mo">{t('Kết quả mang tính minh họa.')} {conLai != null && t('Bạn còn {n} lượt hôm nay.', { n: conLai })}</p>
              <div className="hang"><button className="nut vien" onClick={lamLai}>{t('Thử ảnh khác')}</button><button className="nut" onClick={xoaVaDong}>{t('Xong, xóa ảnh')}</button></div>
            </div>
          ) : (
            <div className="giua">
              <p style={{ color: 'var(--do)' }}>{thongDiep}</p>
              <button className="nut vien" onClick={lamLai}>{t('Thử lại')}</button>
            </div>
          )}
        </HopThoai>
      )}
    </>
  );
}
