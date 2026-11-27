'use client';
import { useT } from './Providers';

// Văn bản dịch dùng được cả trong component máy chủ lẫn máy khách.
export default function T({ k, p }: { k: string; p?: Record<string, string | number> }) {
  return <>{useT()(k, p)}</>;
}
