import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';
import { layNgonNgu } from '@/lib/i18n-server';
import { MA_GIAO_DIEN } from '@/lib/i18n';

const ten = process.env.NEXT_PUBLIC_TEN_CUA_HANG || 'BHD Fashion Store';
export const metadata: Metadata = {
  title: { default: `${ten} — Thời trang`, template: `%s · ${ten}` },
  description: `${ten}: thời trang tối giản, chất liệu dễ chịu, giao hàng toàn quốc.`,
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#d9480f', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await layNgonNgu();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MA_GIAO_DIEN }} />
      </head>
      <body>
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
