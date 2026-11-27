@extends('email._layout')
@section('noidung')
<p>Xin chào {{ $d['ten'] }},</p>
<p>Đơn hàng <strong>{{ $d['maDon'] }}</strong> vừa được cập nhật: <strong>{{ $d['trangThai'] }}</strong>.</p>
@if (!empty($d['ghiChu']))<p style="font-size:14px;color:#6b645b">Ghi chú: {{ $d['ghiChu'] }}</p>@endif
@if (!empty($d['lienKet']))<p style="margin:24px 0"><a href="{{ $d['lienKet'] }}" style="background:#1f1b16;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">Xem đơn hàng</a></p>@endif
@endsection
