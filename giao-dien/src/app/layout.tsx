import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';

const ten = process.env.NEXT_PUBLIC_TEN_CUA_HANG || 'BHD Fashion Store';
export const metadata: Metadata = {
  title: { default: `${ten} — Thời trang`, template: `%s · ${ten}` },
  description: `${ten}: thời trang tối giản, chất liệu dễ chịu, giao hàng toàn quốc.`,
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#d9480f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
