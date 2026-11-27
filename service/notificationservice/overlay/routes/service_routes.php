<?php

use App\Http\Controllers\NotificationController;
use App\Http\Middleware\InternalKey;
use App\Http\Middleware\JwtAuth;
use Illuminate\Support\Facades\Route;

Route::get('/health', [NotificationController::class, 'suckhoe']);

// Dịch vụ khác gọi (cần khóa nội bộ)
Route::prefix('noi-bo')->middleware(InternalKey::class)->group(function () {
    Route::post('/gui-email', [NotificationController::class, 'guiEmail']);
    Route::post('/thong-bao', [NotificationController::class, 'taoThongBao']);
});

// Người dùng đăng nhập (JWT)
Route::prefix('api/thong-bao')->middleware(JwtAuth::class)->group(function () {
    Route::get('/', [NotificationController::class, 'danhSach']);
    Route::post('/da-doc-tat-ca', [NotificationController::class, 'daDocTatCa']);
    Route::post('/{id}/da-doc', [NotificationController::class, 'daDoc'])->whereNumber('id');
});

// Quản trị viên
Route::prefix('api/quan-tri/nhat-ky-gui')->middleware(JwtAuth::class.':QuanTri')->group(function () {
    Route::get('/', [NotificationController::class, 'nhatKy']);
    Route::post('/{id}/gui-lai', [NotificationController::class, 'guiLai'])->whereNumber('id');
});
