// Bộ biểu tượng nét đường (stroke) cùng một phong cách, thay cho emoji; màu theo currentColor nên đổi theo giao diện sáng/tối.
import type { ReactNode, SVGProps } from 'react';

function Icon({ children, size = 24, ...p }: { children: ReactNode; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>
      {children}
    </svg>
  );
}
type P = { size?: number };

export const IconUser = (p: P) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c.8-3.8 4-6 8-6s7.2 2.2 8 6" /></Icon>;
export const IconBag = (p: P) => <Icon {...p}><path d="M5 8h14l-1.1 11.2a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Icon>;
export const IconBell = (p: P) => <Icon {...p}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" /><path d="M10 21a2.2 2.2 0 0 0 4 0" /></Icon>;
export const IconSun = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></Icon>;
export const IconMoon = (p: P) => <Icon {...p}><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" /></Icon>;
export const IconGlobe = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" /></Icon>;
export const IconMenu = (p: P) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const IconSearch = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.2-4.2" /></Icon>;
export const IconEye = (p: P) => <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const IconEyeOff = (p: P) => <Icon {...p}><path d="M3 3l18 18" /><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>;
