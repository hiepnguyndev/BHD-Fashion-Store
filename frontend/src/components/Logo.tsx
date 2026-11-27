import { tenCuaHang } from '@/lib/api';

// Logo tự thiết kế: huy hiệu bo góc cam chứa chữ lồng + tên cửa hàng viết kiểu có chân, chữ "STORE" tách riêng.
// Chữ lồng: nếu từ đầu của tên viết hoa ≤ 4 ký tự (vd. BHD) thì dùng nó, ngược lại lấy chữ cái đầu của các từ.
function tach(ten: string) {
  const tu = ten.trim().split(/\s+/);
  const dau = tu[0] || '';
  const laVietTat = /^[A-ZĐ]{2,4}$/.test(dau) && tu.length > 1;
  return {
    chuLong: laVietTat ? dau : tu.slice(0, 3).map((t) => t.charAt(0).toUpperCase()).join(''),
    phan: laVietTat ? tu.slice(1) : tu,
  };
}

export function BieuTuongLogo({ chu, kichThuoc = 46 }: { chu: string; kichThuoc?: number }) {
  const co = chu.length >= 3 ? 22 : chu.length === 2 ? 24 : 30;
  return (
    <svg className="logo-hinh" width={kichThuoc} height={kichThuoc} viewBox="0 0 64 64" role="img" aria-label="Logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg-cam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f59a4a" /><stop offset="1" stopColor="#c2410c" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#lg-cam)" />
      <rect x="4.5" y="4.5" width="55" height="55" rx="15" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      <text x="32" y="36" textAnchor="middle" fontSize={co} fontWeight="700" fill="#fff" letterSpacing="0.5" style={{ fontFamily: 'var(--font-tieu-de)' }}>{chu}</text>
      <path d="M17 45.5h12M35 45.5h12" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m32 42.7 2.8 2.8-2.8 2.8-2.8-2.8Z" fill="#ffe2c6" />
    </svg>
  );
}

export default function Logo({ sang = false }: { sang?: boolean }) {
  const { chuLong, phan } = tach(tenCuaHang);
  const cuoi = phan.length > 1 ? phan[phan.length - 1] : '';
  const dauPhan = phan.length > 1 ? phan.slice(0, -1).join(' ') : phan.join(' ');
  return (
    <span className={'logo-khoi' + (sang ? ' sang' : '')}>
      <BieuTuongLogo chu={chuLong} />
      <span className="logo-chu">
        <b>{dauPhan}</b>
        {cuoi && <small>{cuoi}</small>}
      </span>
    </span>
  );
}
