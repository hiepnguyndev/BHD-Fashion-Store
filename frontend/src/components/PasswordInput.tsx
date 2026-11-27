'use client';
// Ô nhập mật khẩu có nút hiện/ẩn (con mắt). Nhận mọi thuộc tính của <input>.
import { useState, type InputHTMLAttributes } from 'react';
import { useT } from './Providers';
import { IconEye, IconEyeOff } from './Icons';

export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const t = useT();
  const [hien, setHien] = useState(false);
  const nhan = hien ? t('Ẩn mật khẩu') : t('Hiện mật khẩu');
  return (
    <span className="o-mat-khau">
      <input {...props} type={hien ? 'text' : 'password'} />
      <button type="button" className="nut-xem-mk" onClick={() => setHien((h) => !h)} aria-label={nhan} title={nhan} aria-pressed={hien}>
        {hien ? <IconEyeOff size={20} /> : <IconEye size={20} />}
      </button>
    </span>
  );
}
