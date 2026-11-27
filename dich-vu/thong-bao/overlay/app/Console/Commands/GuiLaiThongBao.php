<?php

namespace App\Console\Commands;

use App\Services\GuiEmail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GuiLaiThongBao extends Command
{
    protected $signature = 'thong-bao:gui-lai';

    protected $description = 'Gửi lại các email chưa gửi được (khoảng cách tăng dần: 1, 2, 4, 8, 16 phút...)';

    public function handle(): int
    {
        $ds = DB::table('NhatKyGui')
            ->where('KenhGui', 'Email')->where('TrangThai', 'ChoGui')
            ->where('SoLanThu', '<', GuiEmail::SO_LAN_TOI_DA)
            ->whereNotNull('DuLieuJson')
            ->whereRaw('NgayTao > DATEADD(DAY, -2, SYSUTCDATETIME())')
            ->orderBy('MaNhatKy')->limit(50)->get();
        $daGui = 0;
        foreach ($ds as $dong) {
            $tuoiPhut = (time() - strtotime($dong->NgayTao.' UTC')) / 60;
            if ($tuoiPhut < 2 ** $dong->SoLanThu) {
                continue; // chưa đến lượt thử lại
            }
            if (GuiEmail::thuLai($dong)) {
                $daGui++;
            }
        }
        $this->info("Đã gửi lại $daGui email.");

        return self::SUCCESS;
    }
}
