'use client';
import { useState } from 'react';

export default function SaoChepMa({ ma }: { ma: string }) {
  const [da, setDa] = useState(false);
  return (
    <button
      type="button"
      className={'ma' + (da ? ' da-chep' : '')}
      title="Bấm để sao chép mã"
      onClick={async () => {
        try { await navigator.clipboard.writeText(ma); } catch { /* trình duyệt chặn: vẫn báo để khách tự chép */ }
        setDa(true);
        setTimeout(() => setDa(false), 1800);
      }}
    >
      {da ? 'Đã chép ✓' : ma}
    </button>
  );
}
