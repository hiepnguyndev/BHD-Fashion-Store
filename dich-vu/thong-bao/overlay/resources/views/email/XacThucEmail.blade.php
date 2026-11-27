@extends('email._khung')
@section('noidung')
<p>Xin chào {{ $d['ten'] }},</p>
<p>Cảm ơn bạn đã đăng ký. Vui lòng bấm nút bên dưới để xác thực địa chỉ email của bạn.</p>
<p style="margin:24px 0"><a href="{{ $d['lienKet'] }}" style="background:#1f1b16;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">Xác thực email</a></p>
<p style="font-size:13px;color:#6b645b">Nếu nút không hoạt động, hãy sao chép liên kết sau vào trình duyệt:<br>{{ $d['lienKet'] }}</p>
<p style="font-size:13px;color:#6b645b">Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>
@endsection
