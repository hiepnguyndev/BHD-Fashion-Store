<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Kiểm tra JWT RS256 do UserService phát (khóa công khai ở volume dùng chung).
 * Dùng: ->middleware('jwt') cho người dùng; 'jwt:QuanTri' cho quản trị.
 */
class JwtAuth
{
    private static function giaiMaBase64Url(string $s): string|false
    {
        return base64_decode(strtr($s, '-_', '+/'), true);
    }

    public function handle(Request $request, Closure $next, ?string $vaiTro = null)
    {
        $tieuDe = (string) $request->header('Authorization', '');
        if (! preg_match('/^Bearer\s+(\S+)$/i', $tieuDe, $m)) {
            return response()->json(['loi' => 'Bạn chưa đăng nhập.'], 401);
        }
        $phan = explode('.', $m[1]);
        if (count($phan) !== 3) {
            return response()->json(['loi' => 'Phiên đăng nhập không hợp lệ.'], 401);
        }
        $dauDe = json_decode((string) self::giaiMaBase64Url($phan[0]), true);
        $noiDung = json_decode((string) self::giaiMaBase64Url($phan[1]), true);
        $chuKy = self::giaiMaBase64Url($phan[2]);
        $duongKhoa = rtrim(config('shop.thu_muc_khoa'), '/').'/public.pem';
        if (! is_array($dauDe) || ! is_array($noiDung) || $chuKy === false || ! is_file($duongKhoa)) {
            return response()->json(['loi' => 'Phiên đăng nhập không hợp lệ.'], 401);
        }
        // chỉ chấp nhận RS256 (chặn tấn công đổi thuật toán)
        if (($dauDe['alg'] ?? '') !== 'RS256') {
            return response()->json(['loi' => 'Phiên đăng nhập không hợp lệ.'], 401);
        }
        $khoa = openssl_pkey_get_public((string) file_get_contents($duongKhoa));
        if ($khoa === false || openssl_verify($phan[0].'.'.$phan[1], $chuKy, $khoa, OPENSSL_ALGO_SHA256) !== 1) {
            return response()->json(['loi' => 'Phiên đăng nhập không hợp lệ.'], 401);
        }
        if (($noiDung['iss'] ?? '') !== 'thoitrang-nguoidung' || (int) ($noiDung['exp'] ?? 0) < time() || ! isset($noiDung['sub'])) {
            return response()->json(['loi' => 'Phiên đăng nhập đã hết hạn.'], 401);
        }
        if ($vaiTro !== null && ($noiDung['vai_tro'] ?? '') !== $vaiTro) {
            return response()->json(['loi' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
        }
        $request->attributes->set('maNguoiDung', (int) $noiDung['sub']);

        return $next($request);
    }
}
