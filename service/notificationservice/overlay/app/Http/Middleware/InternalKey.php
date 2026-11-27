<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Chỉ cho các dịch vụ khác gọi (kèm khóa nội bộ). */
class InternalKey
{
    public function handle(Request $request, Closure $next)
    {
        $khoa = (string) config('shop.khoa_noi_bo');
        $gui = (string) $request->header('X-Khoa-Noi-Bo', '');
        if ($khoa === '' || ! hash_equals($khoa, $gui)) {
            return response()->json(['loi' => 'Không được phép.'], 401);
        }

        return $next($request);
    }
}
