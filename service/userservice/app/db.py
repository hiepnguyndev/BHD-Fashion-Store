"""Truy cập SQL Server bằng pymssql. Mọi truy vấn đều tham số hóa (chống SQL injection)."""
import contextlib
from datetime import datetime

import pymssql

from . import config as ch


@contextlib.contextmanager
def ket_noi():
    """Một kết nối = một giao dịch: thoát bình thường thì commit, có lỗi thì rollback."""
    con = pymssql.connect(
        server=ch.DB_HOST, port=ch.DB_PORT, user=ch.DB_USER, password=ch.DB_PASSWORD,
        database=ch.DB_NAME, charset="UTF-8", login_timeout=10, as_dict=True, autocommit=False,
    )
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def lay_mot(con, sql: str, *tham_so):
    cur = con.cursor()
    cur.execute(sql, tham_so)
    dong = cur.fetchone()
    cur.close()
    return dong


def lay_nhieu(con, sql: str, *tham_so):
    cur = con.cursor()
    cur.execute(sql, tham_so)
    ds = cur.fetchall()
    cur.close()
    return ds


def thuc_thi(con, sql: str, *tham_so) -> int:
    cur = con.cursor()
    cur.execute(sql, tham_so)
    so_dong = cur.rowcount
    cur.close()
    return so_dong


def camel(dong: dict) -> dict:
    """Đổi khóa cột PascalCase (MaNguoiDung) sang camelCase (maNguoiDung) cho JSON."""
    return {k[0].lower() + k[1:]: (v.isoformat() + "Z" if isinstance(v, datetime) else v)
            for k, v in dong.items()}
