import { Suspense, type ReactNode } from 'react';
import ProgressBar from '@/components/ProgressBar';

// template.tsx được dựng lại ở mỗi lần chuyển trang → chạy hiệu ứng vào trang.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><ProgressBar /></Suspense>
      <div className="chuyen-trang">{children}</div>
    </>
  );
}
