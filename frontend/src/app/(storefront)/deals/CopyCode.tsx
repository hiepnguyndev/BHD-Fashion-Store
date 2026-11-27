'use client';
import { useState } from 'react';
import { useT } from '@/components/Providers';

export default function CopyCode({ ma }: { ma: string }) {
  const [da, setDa] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      className={'ma' + (da ? ' da-chep' : '')}
      title={t('Bấm để sao chép mã')}
      onClick={async () => {
        try { await navigator.clipboard.writeText(ma); } catch { /* trình duyệt chặn: vẫn báo để khách tự chép */ }
        setDa(true);
        setTimeout(() => setDa(false), 1800);
      }}
    >
      {da ? t('Đã chép') + ' ✓' : ma}
    </button>
  );
}
