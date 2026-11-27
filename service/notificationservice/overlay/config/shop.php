<?php

return [
    'khoa_noi_bo' => env('KHOA_NOI_BO'),
    'web_url' => rtrim(env('WEB_URL', 'http://localhost:8080'), '/'),
    'ten_cua_hang' => env('TEN_CUA_HANG', 'BHD Fashion Store'),
    'thu_muc_khoa' => env('THU_MUC_KHOA', '/khoa'),
];
