@extends('email._layout')
@php($vnd = fn ($n) => number_format((float) $n, 0, ',', '.') . ' đ')
@section('noidung')
<p>Xin chào {{ $d['ten'] }},</p>
<p>Chúng tôi đã nhận đơn hàng <strong>{{ $d['maDon'] }}</strong> của bạn.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
  @foreach (($d['dong'] ?? []) as $x)
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee">{{ $x['ten'] ?? '' }}@if (!empty($x['kichCo']) || !empty($x['mauSac']))<br><span style="color:#8a8279;font-size:12px">{{ $x['kichCo'] ?? '' }} {{ $x['mauSac'] ?? '' }}</span>@endif</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">x{{ $x['soLuong'] ?? 1 }}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">{{ $vnd($x['thanhTien'] ?? 0) }}</td>
  </tr>
  @endforeach
</table>
<table style="width:100%;font-size:14px;margin-top:12px">
  <tr><td>Tiền hàng</td><td style="text-align:right">{{ $vnd($d['tongTienHang'] ?? 0) }}</td></tr>
  <tr><td>Phí vận chuyển</td><td style="text-align:right">{{ $vnd($d['phiVanChuyen'] ?? 0) }}</td></tr>
  @if (!empty($d['tienGiam']))<tr><td>Giảm giá</td><td style="text-align:right">-{{ $vnd($d['tienGiam']) }}</td></tr>@endif
  <tr><td style="padding-top:8px"><strong>Tổng thanh toán</strong></td><td style="text-align:right;padding-top:8px"><strong>{{ $vnd($d['tongThanhToan']) }}</strong></td></tr>
</table>
@if (!empty($d['phuongThuc']))<p style="font-size:14px">Thanh toán: {{ $d['phuongThuc'] }}</p>@endif
@if (!empty($d['diaChi']))<p style="font-size:14px">Giao tới: {{ $d['diaChi'] }}</p>@endif
@if (!empty($d['lienKet']))<p style="margin:24px 0"><a href="{{ $d['lienKet'] }}" style="background:#1f1b16;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block">Xem đơn hàng</a></p>@endif
@endsection
