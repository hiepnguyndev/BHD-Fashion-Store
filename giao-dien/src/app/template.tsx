import { Suspense, type ReactNode } from 'react';
import TienTrinh from '@/components/TienTrinh';

// template.tsx được dựng lại ở mỗi lần chuyển trang → chạy hiệu ứng vào trang.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><TienTrinh /></Suspense>
      <div className="chuyen-trang">{children}</div>
    </>
  );
}
