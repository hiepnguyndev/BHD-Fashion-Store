import sql from 'mssql';

const cauHinh = {
  server: process.env.DB_HOST || 'sqlserver',
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER || 'dv_giohang',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ThoiTrang_GioHang',
  options: { encrypt: true, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

let hoBoi;
export function layHoBoi() {
  if (!hoBoi) {
    hoBoi = new sql.ConnectionPool(cauHinh).connect().catch((e) => {
      hoBoi = undefined; // lần sau thử kết nối lại
      throw e;
    });
  }
  return hoBoi;
}

/** Chạy truy vấn tham số hóa. thamSo: { ten: [sql.Int, giaTri] } */
export async function truyVan(cauLenh, thamSo = {}) {
  const pool = await layHoBoi();
  const rq = pool.request();
  for (const [ten, [kieu, giaTri]] of Object.entries(thamSo)) rq.input(ten, kieu, giaTri);
  const kq = await rq.query(cauLenh);
  return kq.recordset ?? [];
}

export { sql };
