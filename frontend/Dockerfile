# Giao diện Next.js (cửa hàng + quản trị + BFF). Dựng 3 tầng, chạy bằng người dùng không phải root.
FROM node:22-alpine AS cai
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:22-alpine AS dung
WORKDIR /app
ARG NEXT_PUBLIC_TEN_CUA_HANG="BHD Fashion Store"
ENV NEXT_PUBLIC_TEN_CUA_HANG=$NEXT_PUBLIC_TEN_CUA_HANG
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=cai /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS chay
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup -S ung && adduser -S ung -G ung
COPY --from=dung --chown=ung:ung /app/.next/standalone ./
COPY --from=dung --chown=ung:ung /app/.next/static ./.next/static
COPY --from=dung --chown=ung:ung /app/public ./public
USER ung
EXPOSE 3000
CMD ["node", "server.js"]
