<?php

use Illuminate\Support\Facades\Schedule;

// Mỗi phút thử gửi lại các email đã lỗi (tăng dần khoảng cách giữa các lần thử)
Schedule::command('thong-bao:gui-lai')->everyMinute()->withoutOverlapping();
