<!doctype html>
<html lang="vi">
<body style="margin:0;padding:24px;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1f1b16">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <div style="font-size:22px;font-weight:700;letter-spacing:1px;margin-bottom:20px">{{ $tenCuaHang }}</div>
    {{ $slot ?? '' }}
    @yield('noidung')
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px">
    <div style="font-size:12px;color:#8a8279">Email tự động từ {{ $tenCuaHang }}. Vui lòng không trả lời email này.</div>
  </div>
</body>
</html>
