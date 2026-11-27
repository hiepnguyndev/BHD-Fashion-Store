<?php

namespace App\Http\Controllers;

use App\Services\GuiEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class DichVuController extends Controller
{
    public function suckhoe(): JsonResponse
    {
        DB::select('SELECT 1 AS x');

        return response()->json(['trangThai' => 'ok']);
    }

    // ------------------------------------------------------------ nội bộ
    public function guiEmail(Request $r): JsonResponse
    {
        $mau = (string) $r->input('mau');
        $den = trim((string) $r->input('den'));
        $du = $r->input('duLieu');
        if (! isset(GuiEmail::MAU[$mau])) {
            return response()->json(['loi' => 'Mẫu email không tồn tại.'], 422);
        }
        if (! filter_var($den, FILTER_VALIDATE_EMAIL) || strlen($den) > 150) {
            return response()->json(['loi' => 'Địa chỉ email không hợp lệ.'], 422);
        }
        if (! is_array($du)) {
            return response()->json(['loi' => 'Thiếu dữ liệu email.'], 422);
        }
        foreach (GuiEmail::MAU[$mau]['bat_buoc'] as $khoa) {
            if (! array_key_exists($khoa, $du) || $du[$khoa] === null || $du[$khoa] === '') {
                return response()->json(['loi' => "Thiếu trường $khoa."], 422);
            }
        }
        if (! GuiEmail::lienKetHopLe($du['lienKet'] ?? null)) {
            return response()->json(['loi' => 'Liên kết phải thuộc website của cửa hàng.'], 422);
        }
        $trangThai = GuiEmail::tao($mau, $den, $du, $r->input('maThamChieu'));

        return response()->json(['trangThai' => $trangThai], $trangThai === 'Loi' ? 502 : 202);
    }

    public function taoThongBao(Request $r): JsonResponse
    {
        $ma = (int) $r->input('maNguoiDung');
        $tieuDe = trim((string) $r->input('tieuDe'));
        if ($ma <= 0 || $tieuDe === '') {
            return response()->json(['loi' => 'Thiếu dữ liệu.'], 422);
        }
        $lienKet = $r->input('lienKet');
        if ($lienKet !== null && (! is_string($lienKet) || ! str_starts_with($lienKet, '/') || str_starts_with($lienKet, '//'))) {
            return response()->json(['loi' => 'Liên kết phải là đường dẫn nội bộ.'], 422);
        }
        DB::table('ThongBao')->insert([
            'MaNguoiDung' => $ma,
            'TieuDe' => mb_substr($tieuDe, 0, 200),
            'NoiDung' => $r->filled('noiDung') ? mb_substr((string) $r->input('noiDung'), 0, 1000) : null,
            'LienKet' => $lienKet ? substr($lienKet, 0, 300) : null,
        ]);

        return response()->json(['thongBao' => 'OK'], 201);
    }

    // ------------------------------------------------------------ người dùng
    private static function dongThongBao(object $d): array
    {
        return [
            'maThongBao' => $d->MaThongBao, 'tieuDe' => $d->TieuDe, 'noiDung' => $d->NoiDung, 'lienKet' => $d->LienKet,
            'daDoc' => (bool) $d->DaDoc, 'ngayTao' => str_replace(' ', 'T', substr($d->NgayTao, 0, 19)).'Z',
        ];
    }

    public function danhSach(Request $r): JsonResponse
    {
        $ma = $r->attributes->get('maNguoiDung');
        $ds = DB::table('ThongBao')->where('MaNguoiDung', $ma)->orderByDesc('MaThongBao')->limit(30)->get();

        return response()->json([
            'chuaDoc' => DB::table('ThongBao')->where('MaNguoiDung', $ma)->where('DaDoc', 0)->count(),
            'danhSach' => $ds->map(fn ($d) => self::dongThongBao($d))->all(),
        ]);
    }

    public function daDoc(Request $r, int $id): JsonResponse
    {
        DB::table('ThongBao')->where('MaThongBao', $id)->where('MaNguoiDung', $r->attributes->get('maNguoiDung'))->update(['DaDoc' => 1]);

        return response()->json(['thongBao' => 'OK']);
    }

    public function daDocTatCa(Request $r): JsonResponse
    {
        DB::table('ThongBao')->where('MaNguoiDung', $r->attributes->get('maNguoiDung'))->where('DaDoc', 0)->update(['DaDoc' => 1]);

        return response()->json(['thongBao' => 'OK']);
    }

    // ------------------------------------------------------------ quản trị
    public function nhatKy(Request $r): JsonResponse
    {
        $q = DB::table('NhatKyGui')->select('MaNhatKy', 'KenhGui', 'NguoiNhan', 'MaMauCode', 'TieuDe', 'MaThamChieu', 'TrangThai', 'SoLanThu', 'LoiCuoi', 'NgayTao', 'NgayGui');
        if (in_array($r->query('trangThai'), ['ChoGui', 'DaGui', 'Loi'], true)) {
            $q->where('TrangThai', $r->query('trangThai'));
        }
        $ds = $q->orderByDesc('MaNhatKy')->limit(100)->get()->map(function ($d) {
            $m = (array) $d;
            $m = array_combine(array_map(fn ($k) => lcfirst($k), array_keys($m)), array_values($m));
            foreach (['ngayTao', 'ngayGui'] as $k) {
                if (! empty($m[$k])) {
                    $m[$k] = str_replace(' ', 'T', substr($m[$k], 0, 19)).'Z';
                }
            }

            return $m;
        })->all();

        return response()->json(['danhSach' => $ds]);
    }

    public function guiLai(int $id): JsonResponse
    {
        $dong = DB::table('NhatKyGui')->where('MaNhatKy', $id)->first();
        if (! $dong) {
            return response()->json(['loi' => 'Không tìm thấy.'], 404);
        }
        if ($dong->TrangThai === 'DaGui') {
            return response()->json(['loi' => 'Email này đã được gửi.'], 409);
        }
        $ok = GuiEmail::thuLai($dong);

        return response()->json(['thongBao' => $ok ? 'Đã gửi.' : 'Gửi lại vẫn lỗi, xem cột lỗi.'], $ok ? 200 : 502);
    }
}
