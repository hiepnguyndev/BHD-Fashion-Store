<?php

use App\Http\Controllers\DichVuController;
use App\Http\Middleware\KhoaNoiBo;
use App\Http\Middleware\XacThucJwt;
use Illuminate\Support\Facades\Route;

Route::get('/health', [DichVuController::class, 'suckhoe']);

// Dịch vụ khác gọi (cần khóa nội bộ)
Route::prefix('noi-bo')->middleware(KhoaNoiBo::class)->group(function () {
    Route::post('/gui-email', [DichVuController::class, 'guiEmail']);
    Route::post('/thong-bao', [DichVuController::class, 'taoThongBao']);
});

// Người dùng đăng nhập (JWT)
Route::prefix('api/thong-bao')->middleware(XacThucJwt::class)->group(function () {
    Route::get('/', [DichVuController::class, 'danhSach']);
    Route::post('/da-doc-tat-ca', [DichVuController::class, 'daDocTatCa']);
    Route::post('/{id}/da-doc', [DichVuController::class, 'daDoc'])->whereNumber('id');
});

// Quản trị viên
Route::prefix('api/quan-tri/nhat-ky-gui')->middleware(XacThucJwt::class.':QuanTri')->group(function () {
    Route::get('/', [DichVuController::class, 'nhatKy']);
    Route::post('/{id}/gui-lai', [DichVuController::class, 'guiLai'])->whereNumber('id');
});
