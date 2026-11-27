#!/usr/bin/env bash
# Tạo file .env từ .env.example, thay các chỗ giữ chỗ bằng giá trị ngẫu nhiên.
set -euo pipefail
cd "$(dirname "$0")"
if [ -f .env ]; then
  echo ".env đã tồn tại, không ghi đè. Xóa .env nếu muốn tạo lại."
  exit 0
fi
command -v openssl >/dev/null || { echo "Cần cài openssl"; exit 1; }
: > .env
while IFS= read -r dong || [ -n "$dong" ]; do
  case "$dong" in
    *__MAT_KHAU__*) dong="${dong/__MAT_KHAU__/Aa1_$(openssl rand -hex 16)}" ;;
    *__KHOA__*)     dong="${dong/__KHOA__/$(openssl rand -hex 32)}" ;;
    *__APP_KEY__*)  dong="${dong/__APP_KEY__/base64:$(openssl rand -base64 32)}" ;;
  esac
  printf '%s\n' "$dong" >> .env
done < .env.example
echo "Đã tạo .env. Hãy mở và điền thông tin ngân hàng (NGAN_HANG_*) trước khi chạy."
