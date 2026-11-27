@extends('email._layout')
@section('noidung')
<p>Xin chào {{ $d['ten'] }},</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Liên kết có hiệu lực trong thời gian ngắn.</p>
<p style="margin:24px 0"><a href="{{ $d['lienKet'] }}" style="background:#1f1b16;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">Đặt lại mật khẩu</a></p>
<p style="font-size:13px;color:#6b645b">Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn.</p>
@endsection
