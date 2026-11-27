'use client';
import { useState } from 'react';

// Chưa có hộp thư nhận tin trên máy chủ: biểu mẫu soạn sẵn thư và mở ứng dụng email của khách.
export default function ContactForm({ email, tenCuaHang }: { email: string; tenCuaHang: string }) {
  const [f, setF] = useState({ ten: '', email: '', chuDe: '', noiDung: '' });
  const dat = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="the"
      onSubmit={(e) => {
        e.preventDefault();
        const than = `${f.noiDung}\n\n— ${f.ten}${f.email ? ' (' + f.email + ')' : ''}`;
        location.href = `mailto:${email}?subject=${encodeURIComponent(f.chuDe || 'Liên hệ ' + tenCuaHang)}&body=${encodeURIComponent(than)}`;
      }}
    >
      <h2>Gửi tin nhắn</h2>
      <div className="luoi-2">
        <div className="truong"><label htmlFor="lh-ten">Họ tên</label><input id="lh-ten" required maxLength={80} value={f.ten} onChange={(e) => dat('ten', e.target.value)} /></div>
        <div className="truong"><label htmlFor="lh-email">Email của bạn</label><input id="lh-email" type="email" maxLength={120} value={f.email} onChange={(e) => dat('email', e.target.value)} /></div>
      </div>
      <div className="truong"><label htmlFor="lh-cd">Chủ đề</label><input id="lh-cd" maxLength={120} value={f.chuDe} onChange={(e) => dat('chuDe', e.target.value)} /></div>
      <div className="truong"><label htmlFor="lh-nd">Nội dung</label><textarea id="lh-nd" required rows={5} maxLength={2000} value={f.noiDung} onChange={(e) => dat('noiDung', e.target.value)} /></div>
      <button className="nut lon">Soạn email gửi cửa hàng</button>
      <p className="nho mo cach">Nút trên sẽ mở ứng dụng email trên thiết bị của bạn với nội dung đã điền sẵn.</p>
    </form>
  );
}
