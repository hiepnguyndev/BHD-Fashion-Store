<?php

// Chỉ dùng SQL Server (CSDL ThoiTrang_ThongBao). Không chạy migrate: bảng đã được tạo bởi script SQL.
return [
    'default' => env('DB_CONNECTION', 'sqlsrv'),
    'connections' => [
        'sqlsrv' => [
            'driver' => 'sqlsrv',
            'host' => env('DB_HOST', 'sqlserver'),
            'port' => env('DB_PORT', '1433'),
            'database' => env('DB_DATABASE', 'ThoiTrang_ThongBao'),
            'username' => env('DB_USERNAME', 'dv_thongbao'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'encrypt' => 'yes',
            'trust_server_certificate' => env('DB_TRUST_SERVER_CERTIFICATE', 'true'),
        ],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
];
