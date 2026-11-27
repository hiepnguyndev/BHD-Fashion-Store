"""Khởi tạo CSDL: chạy 1 lần khi docker compose up.
- Tạo 6 CSDL + bảng từ 01_create_fashion_db.sql (chỉ cấu trúc, KHÔNG nạp dữ liệu).
- Tạo tài khoản quyền tối thiểu cho từng dịch vụ từ 02_service_accounts.sql.
Chạy lại nhiều lần vẫn an toàn: nếu đã đủ 6 CSDL thì bỏ qua bước 1.
"""
import os
import re
import sys
import time

import pymssql

HOST = os.environ.get("DB_HOST", "sqlserver")
PORT = int(os.environ.get("DB_PORT", "1433"))
MAT_KHAU_SA = os.environ["MSSQL_SA_PASSWORD"]
BIEN_MK = ["MK_NGUOIDUNG", "MK_SANPHAM", "MK_GIOHANG", "MK_DONHANG", "MK_THANHTOAN", "MK_THONGBAO"]


def ket_noi():
    return pymssql.connect(server=HOST, port=PORT, user="sa", password=MAT_KHAU_SA,
                           database="master", autocommit=True, login_timeout=10, charset="UTF-8")


def cho_san_sang():
    for lan in range(1, 61):
        try:
            ket_noi().close()
            print("SQL Server đã sẵn sàng", flush=True)
            return
        except Exception as loi:  # noqa: BLE001
            print(f"Đợi SQL Server ({lan}/60): {str(loi)[:80]}", flush=True)
            time.sleep(3)
    sys.exit("Không kết nối được SQL Server")


def chay_tep(duong_dan, thay_the=None):
    noi_dung = open(duong_dan, encoding="utf-8-sig").read()
    for ten, gia_tri in (thay_the or {}).items():
        noi_dung = noi_dung.replace(f"$({ten})", gia_tri)
    con = ket_noi()
    cur = con.cursor()
    so_batch = 0
    for batch in re.split(r"^\s*GO\s*$", noi_dung, flags=re.M | re.I):
        if batch.strip():
            cur.execute(batch)
            so_batch += 1
    con.close()
    print(f"Đã chạy {duong_dan}: {so_batch} khối lệnh", flush=True)


def main():
    cho_san_sang()
    con = ket_noi()
    cur = con.cursor()
    cur.execute("SELECT COUNT(*) FROM sys.databases WHERE name LIKE 'ThoiTrang[_]%'")
    so_csdl = cur.fetchone()[0]
    con.close()
    if so_csdl >= 6:
        print("Đã có đủ 6 CSDL, bỏ qua bước tạo cấu trúc", flush=True)
    elif so_csdl == 0:
        chay_tep("01_create_fashion_db.sql")
    else:
        sys.exit(f"Chỉ có {so_csdl}/6 CSDL: trạng thái dở dang. Xóa volume sqlserver_du_lieu rồi chạy lại.")
    thieu = [b for b in BIEN_MK if not os.environ.get(b)]
    if thieu:
        sys.exit(f"Thiếu biến môi trường: {', '.join(thieu)}")
    chay_tep("02_service_accounts.sql", {b: os.environ[b].replace("'", "''") for b in BIEN_MK})


if __name__ == "__main__":
    main()
