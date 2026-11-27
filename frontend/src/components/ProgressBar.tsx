'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Thanh tiến trình mảnh phía trên: chạy khi bấm liên kết nội bộ, kết thúc khi trang mới hiện ra.
export default function ProgressBar() {
  const duongDan = usePathname();
  const tim = useSearchParams();
  const [trangThai, setTrangThai] = useState<'' | 'chay' | 'xong'>('');
  const truoc = useRef(duongDan + '?' + tim.toString());

  useEffect(() => {
    const khoa = duongDan + '?' + tim.toString();
    if (khoa !== truoc.current) {
      truoc.current = khoa;
      setTrangThai('xong');
      const t = setTimeout(() => setTrangThai(''), 700);
      return () => clearTimeout(t);
    }
  }, [duongDan, tim]);

  useEffect(() => {
    const bam = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      setTrangThai('');
      requestAnimationFrame(() => requestAnimationFrame(() => setTrangThai('chay')));
    };
    document.addEventListener('click', bam);
    return () => document.removeEventListener('click', bam);
  }, []);

  return <div className={'tien-trinh' + (trangThai ? ' ' + trangThai : '')} aria-hidden />;
}
