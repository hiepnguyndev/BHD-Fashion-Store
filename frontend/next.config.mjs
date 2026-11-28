/** @type {import('next').NextConfig} */
const cauHinh = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Trang gợi ý size riêng đã gộp vào hồ sơ (cần đăng nhập)
  async redirects() {
    return [{ source: '/size-guide', destination: '/account/size', permanent: true }];
  },
};
export default cauHinh;
