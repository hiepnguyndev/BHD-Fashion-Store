<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GuiEmail
{
    /** Mẫu email hợp lệ. bi_mat = chứa liên kết có mã bí mật: không lưu nội dung vào CSDL để gửi lại. */
    public const MAU = [
        'XacThucEmail' => ['bi_mat' => true, 'bat_buoc' => ['ten', 'lienKet']],
        'DatLaiMatKhau' => ['bi_mat' => true, 'bat_buoc' => ['ten', 'lienKet']],
        'XacNhanDon' => ['bi_mat' => false, 'bat_buoc' => ['maDon', 'ten', 'dong', 'tongThanhToan']],
        'CapNhatDonHang' => ['bi_mat' => false, 'bat_buoc' => ['maDon', 'ten', 'trangThai']],
    ];

    public const SO_LAN_TOI_DA = 6;

    public static function tieuDe(string $mau, array $d): string
    {
        $ten = config('thoitrang.ten_cua_hang');

        return match ($mau) {
            'XacThucEmail' => "Xác thực email tài khoản $ten",
            'DatLaiMatKhau' => "Đặt lại mật khẩu $ten",
            'XacNhanDon' => "Đã nhận đơn hàng {$d['maDon']}",
            'CapNhatDonHang' => "Đơn {$d['maDon']}: {$d['trangThai']}",
        };
    }

    public static function dung(string $mau, array $d): string
    {
        return view("email.$mau", ['d' => $d, 'tenCuaHang' => config('thoitrang.ten_cua_hang'), 'webUrl' => config('thoitrang.web_url')])->render();
    }

    public static function guiNgay(string $den, string $tieuDe, string $html): void
    {
        Mail::html($html, function ($m) use ($den, $tieuDe) {
            $m->to($den)->subject($tieuDe);
        });
    }

    /** Liên kết trong email chỉ được trỏ về chính website của cửa hàng. */
    public static function lienKetHopLe(?string $lk): bool
    {
        $goc = config('thoitrang.web_url');

        return $lk === null || $lk === '' || $lk === $goc || str_starts_with($lk, $goc.'/');
    }

    /** Ghi nhật ký rồi gửi ngay. Trả về trạng thái: DaGui | ChoGui (sẽ thử lại) | Loi. */
    public static function tao(string $mau, string $den, array $duLieu, ?string $maThamChieu): string
    {
        $cauHinh = self::MAU[$mau];
        $tieuDe = self::tieuDe($mau, $duLieu);
        $id = DB::table('NhatKyGui')->insertGetId([
            'KenhGui' => 'Email',
            'NguoiNhan' => $den,
            'MaMauCode' => $mau,
            'TieuDe' => $tieuDe,
            'MaThamChieu' => $maThamChieu !== null ? mb_substr($maThamChieu, 0, 50) : null,
            'TrangThai' => 'ChoGui',
            'SoLanThu' => 0,
            'DuLieuJson' => $cauHinh['bi_mat'] ? null : json_encode($duLieu, JSON_UNESCAPED_UNICODE),
        ], 'MaNhatKy');

        try {
            self::guiNgay($den, $tieuDe, self::dung($mau, $duLieu));
            DB::table('NhatKyGui')->where('MaNhatKy', $id)->update([
                'TrangThai' => 'DaGui', 'SoLanThu' => 1, 'LoiCuoi' => null, 'NgayGui' => DB::raw('SYSUTCDATETIME()'),
            ]);

            return 'DaGui';
        } catch (\Throwable $e) {
            Log::warning("Gửi email $mau tới $den lỗi: ".$e->getMessage());
            $conThu = ! $cauHinh['bi_mat'];
            DB::table('NhatKyGui')->where('MaNhatKy', $id)->update([
                'TrangThai' => $conThu ? 'ChoGui' : 'Loi', 'SoLanThu' => 1, 'LoiCuoi' => mb_substr($e->getMessage(), 0, 500),
            ]);

            return $conThu ? 'ChoGui' : 'Loi';
        }
    }

    /** Thử gửi lại một dòng nhật ký (dùng cho lịch tự động và nút "Gửi lại" của quản trị). */
    public static function thuLai(object $dong): bool
    {
        $du = $dong->DuLieuJson ? json_decode($dong->DuLieuJson, true) : null;
        if (! is_array($du) || ! isset(self::MAU[$dong->MaMauCode])) {
            DB::table('NhatKyGui')->where('MaNhatKy', $dong->MaNhatKy)->update(['TrangThai' => 'Loi', 'LoiCuoi' => 'Không có dữ liệu để gửi lại']);

            return false;
        }
        $lan = $dong->SoLanThu + 1;
        try {
            self::guiNgay($dong->NguoiNhan, $dong->TieuDe ?: self::tieuDe($dong->MaMauCode, $du), self::dung($dong->MaMauCode, $du));
            DB::table('NhatKyGui')->where('MaNhatKy', $dong->MaNhatKy)->update([
                'TrangThai' => 'DaGui', 'SoLanThu' => $lan, 'LoiCuoi' => null, 'NgayGui' => DB::raw('SYSUTCDATETIME()'),
            ]);

            return true;
        } catch (\Throwable $e) {
            DB::table('NhatKyGui')->where('MaNhatKy', $dong->MaNhatKy)->update([
                'TrangThai' => $lan >= self::SO_LAN_TOI_DA ? 'Loi' : 'ChoGui', 'SoLanThu' => $lan, 'LoiCuoi' => mb_substr($e->getMessage(), 0, 500),
            ]);

            return false;
        }
    }
}
