/** CartService (Node.js · Express): giỏ hàng của khách vãng lai (X-Phien-Khach) và người dùng đăng nhập. */
import express from 'express';
import { sql, truyVan, layHoBoi } from './db.js';
import { napKhoaCong, tuyChon, batBuocDangNhap } from './auth.js';

const SAN_PHAM_URL = (process.env.SAN_PHAM_URL || 'http://sanpham:8080').replace(/\/$/, '');
const KHOA_NOI_BO = process.env.KHOA_NOI_BO;
const TOI_DA_MOI_DONG = 99;
const RE_PHIEN = /^[A-Za-z0-9_-]{16,64}$/;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

class LoiNghiepVu extends Error {
  constructor(ma, noiDung, them) { super(noiDung); this.ma = ma; this.them = them; }
}
const boc = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/health', boc(async (_req, res) => {
  await layHoBoi();
  await truyVan('SELECT 1 AS x');
  res.json({ trangThai: 'ok' });
}));

app.use('/api/gio-hang', tuyChon);

/** Xác định chủ giỏ: người dùng đăng nhập hoặc phiên khách. */
function chuGio(req, { baoGomKhach = true } = {}) {
  if (req.nguoiDung) return { maNguoiDung: req.nguoiDung.ma, maPhienKhach: null };
  const phien = req.headers['x-phien-khach'];
  if (baoGomKhach && typeof phien === 'string' && RE_PHIEN.test(phien)) return { maNguoiDung: null, maPhienKhach: phien };
  throw new LoiNghiepVu(400, 'Thiếu phiên giỏ hàng (X-Phien-Khach) hoặc chưa đăng nhập.');
}

async function timGio(chu) {
  const dong = chu.maNguoiDung
    ? await truyVan('SELECT MaGioHang FROM dbo.GioHang WHERE MaNguoiDung = @nd', { nd: [sql.Int, chu.maNguoiDung] })
    : await truyVan('SELECT MaGioHang FROM dbo.GioHang WHERE MaPhienKhach = @pk', { pk: [sql.VarChar(64), chu.maPhienKhach] });
  return dong[0]?.MaGioHang ?? null;
}

async function layHoacTaoGio(chu) {
  const co = await timGio(chu);
  if (co) return co;
  try {
    const kq = await truyVan(
      'INSERT INTO dbo.GioHang (MaNguoiDung, MaPhienKhach) OUTPUT INSERTED.MaGioHang VALUES (@nd, @pk)',
      { nd: [sql.Int, chu.maNguoiDung], pk: [sql.VarChar(64), chu.maPhienKhach] });
    return kq[0].MaGioHang;
  } catch (e) {
    if (e.number === 2601 || e.number === 2627) return timGio(chu); // hai yêu cầu cùng lúc tạo giỏ
    throw e;
  }
}

async function thongTinBienThe(ids) {
  if (ids.length === 0) return new Map();
  let kq;
  try {
    kq = await fetch(`${SAN_PHAM_URL}/noi-bo/bien-the/lay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Khoa-Noi-Bo': KHOA_NOI_BO },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new LoiNghiepVu(503, 'Chưa tải được thông tin sản phẩm. Vui lòng thử lại.');
  }
  if (!kq.ok) throw new LoiNghiepVu(503, 'Chưa tải được thông tin sản phẩm. Vui lòng thử lại.');
  return new Map((await kq.json()).map((b) => [b.maBienThe, b]));
}

async function dungGio(maGioHang) {
  const dong = await truyVan(
    'SELECT MaChiTiet, MaBienThe, SoLuong FROM dbo.ChiTietGioHang WHERE MaGioHang = @g ORDER BY MaChiTiet DESC',
    { g: [sql.Int, maGioHang] });
  const thongTin = await thongTinBienThe([...new Set(dong.map((d) => d.MaBienThe))]);
  let tongSoLuong = 0;
  let tamTinh = 0;
  const ds = dong.map((d) => {
    const b = thongTin.get(d.MaBienThe);
    const khaDung = !!b && b.hienThi && b.trangThaiSanPham === 'DangBan';
    let canhBao = null;
    if (!khaDung) canhBao = 'Sản phẩm này hiện không còn bán.';
    else if (b.conLai <= 0) canhBao = 'Sản phẩm đã hết hàng.';
    else if (b.conLai < d.SoLuong) canhBao = `Chỉ còn ${b.conLai} sản phẩm.`;
    const mua = khaDung && b.conLai >= d.SoLuong;
    const gia = khaDung ? Number(b.gia) : 0;
    if (mua) { tongSoLuong += d.SoLuong; tamTinh += gia * d.SoLuong; }
    return {
      maChiTiet: d.MaChiTiet, maBienThe: d.MaBienThe, soLuong: d.SoLuong,
      maSanPham: b?.maSanPham ?? null, tenSanPham: b?.tenSanPham ?? 'Sản phẩm không còn tồn tại',
      duongDan: b?.duongDan ?? null, kichCo: b?.kichCo ?? null, mauSac: b?.mauSac ?? null,
      duongDanAnh: b?.duongDanAnh ?? null, gia, conLai: b?.conLai ?? 0,
      thanhTien: gia * d.SoLuong, khaDung, coTheMua: mua, canhBao,
    };
  });
  return { dong: ds, tongSoLuong, tamTinh };
}

const gioRong = { dong: [], tongSoLuong: 0, tamTinh: 0 };

function soLuongHopLe(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > TOI_DA_MOI_DONG) throw new LoiNghiepVu(422, `Số lượng phải từ 1 đến ${TOI_DA_MOI_DONG}.`);
  return n;
}
function maHopLe(v, ten) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new LoiNghiepVu(422, `${ten} không hợp lệ.`);
  return n;
}

app.get('/api/gio-hang', boc(async (req, res) => {
  const g = await timGio(chuGio(req));
  res.json(g ? await dungGio(g) : gioRong);
}));

app.post('/api/gio-hang/them', boc(async (req, res) => {
  const chu = chuGio(req);
  const maBienThe = maHopLe(req.body?.maBienThe, 'Mã biến thể');
  const soLuong = soLuongHopLe(req.body?.soLuong ?? 1);
  const b = (await thongTinBienThe([maBienThe])).get(maBienThe);
  if (!b || !b.hienThi || b.trangThaiSanPham !== 'DangBan') throw new LoiNghiepVu(404, 'Sản phẩm không còn bán.');
  const g = await layHoacTaoGio(chu);
  const hienCo = (await truyVan('SELECT SoLuong FROM dbo.ChiTietGioHang WHERE MaGioHang = @g AND MaBienThe = @b',
    { g: [sql.Int, g], b: [sql.Int, maBienThe] }))[0]?.SoLuong ?? 0;
  if (hienCo + soLuong > b.conLai) {
    throw new LoiNghiepVu(409, b.conLai <= 0 ? 'Sản phẩm đã hết hàng.'
      : `Chỉ còn ${b.conLai} sản phẩm${hienCo ? `, bạn đã có ${hienCo} trong giỏ` : ''}.`);
  }
  await truyVan(
    `MERGE dbo.ChiTietGioHang WITH (HOLDLOCK) AS t
     USING (SELECT @g AS MaGioHang, @b AS MaBienThe) AS s ON t.MaGioHang = s.MaGioHang AND t.MaBienThe = s.MaBienThe
     WHEN MATCHED THEN UPDATE SET SoLuong = CASE WHEN t.SoLuong + @sl > ${TOI_DA_MOI_DONG} THEN ${TOI_DA_MOI_DONG} ELSE t.SoLuong + @sl END
     WHEN NOT MATCHED THEN INSERT (MaGioHang, MaBienThe, SoLuong) VALUES (@g, @b, @sl);
     UPDATE dbo.GioHang SET NgayCapNhat = SYSUTCDATETIME() WHERE MaGioHang = @g;`,
    { g: [sql.Int, g], b: [sql.Int, maBienThe], sl: [sql.Int, soLuong] });
  res.status(201).json(await dungGio(g));
}));

app.put('/api/gio-hang/chi-tiet/:ma', boc(async (req, res) => {
  const chu = chuGio(req);
  const g = await timGio(chu);
  if (!g) throw new LoiNghiepVu(404, 'Giỏ hàng trống.');
  const ma = maHopLe(req.params.ma, 'Mã dòng');
  const soLuong = soLuongHopLe(req.body?.soLuong);
  const dong = (await truyVan('SELECT MaBienThe FROM dbo.ChiTietGioHang WHERE MaChiTiet = @m AND MaGioHang = @g',
    { m: [sql.Int, ma], g: [sql.Int, g] }))[0];
  if (!dong) throw new LoiNghiepVu(404, 'Không tìm thấy dòng trong giỏ.');
  const b = (await thongTinBienThe([dong.MaBienThe])).get(dong.MaBienThe);
  if (!b || !b.hienThi || b.trangThaiSanPham !== 'DangBan') throw new LoiNghiepVu(404, 'Sản phẩm không còn bán.');
  if (soLuong > b.conLai) throw new LoiNghiepVu(409, b.conLai <= 0 ? 'Sản phẩm đã hết hàng.' : `Chỉ còn ${b.conLai} sản phẩm.`);
  await truyVan('UPDATE dbo.ChiTietGioHang SET SoLuong = @sl WHERE MaChiTiet = @m AND MaGioHang = @g; UPDATE dbo.GioHang SET NgayCapNhat = SYSUTCDATETIME() WHERE MaGioHang = @g;',
    { sl: [sql.Int, soLuong], m: [sql.Int, ma], g: [sql.Int, g] });
  res.json(await dungGio(g));
}));

app.delete('/api/gio-hang/chi-tiet/:ma', boc(async (req, res) => {
  const g = await timGio(chuGio(req));
  if (!g) return res.json(gioRong);
  await truyVan('DELETE FROM dbo.ChiTietGioHang WHERE MaChiTiet = @m AND MaGioHang = @g',
    { m: [sql.Int, maHopLe(req.params.ma, 'Mã dòng')], g: [sql.Int, g] });
  res.json(await dungGio(g));
}));

app.delete('/api/gio-hang', boc(async (req, res) => {
  const g = await timGio(chuGio(req));
  if (g) await truyVan('DELETE FROM dbo.ChiTietGioHang WHERE MaGioHang = @g', { g: [sql.Int, g] });
  res.json(gioRong);
}));

/** Sau khi khách đăng nhập: gộp giỏ khách vào giỏ tài khoản rồi xóa giỏ khách. */
app.post('/api/gio-hang/gop', batBuocDangNhap, boc(async (req, res) => {
  const phien = req.headers['x-phien-khach'];
  const chuNguoi = { maNguoiDung: req.nguoiDung.ma, maPhienKhach: null };
  if (typeof phien === 'string' && RE_PHIEN.test(phien)) {
    const gKhach = await timGio({ maNguoiDung: null, maPhienKhach: phien });
    if (gKhach) {
      const gNguoi = await layHoacTaoGio(chuNguoi);
      await truyVan(
        `MERGE dbo.ChiTietGioHang WITH (HOLDLOCK) AS t
         USING (SELECT MaBienThe, SoLuong FROM dbo.ChiTietGioHang WHERE MaGioHang = @khach) AS s
           ON t.MaGioHang = @nguoi AND t.MaBienThe = s.MaBienThe
         WHEN MATCHED THEN UPDATE SET SoLuong = CASE WHEN t.SoLuong + s.SoLuong > ${TOI_DA_MOI_DONG} THEN ${TOI_DA_MOI_DONG} ELSE t.SoLuong + s.SoLuong END
         WHEN NOT MATCHED BY TARGET THEN INSERT (MaGioHang, MaBienThe, SoLuong) VALUES (@nguoi, s.MaBienThe, s.SoLuong);
         DELETE FROM dbo.ChiTietGioHang WHERE MaGioHang = @khach;
         DELETE FROM dbo.GioHang WHERE MaGioHang = @khach;
         UPDATE dbo.GioHang SET NgayCapNhat = SYSUTCDATETIME() WHERE MaGioHang = @nguoi;`,
        { khach: [sql.Int, gKhach], nguoi: [sql.Int, gNguoi] });
    }
  }
  const g = await timGio(chuNguoi);
  res.json(g ? await dungGio(g) : gioRong);
}));

app.use((_req, res) => res.status(404).json({ loi: 'Không tìm thấy.' }));
// eslint-disable-next-line no-unused-vars
app.use((e, _req, res, _next) => {
  if (e instanceof LoiNghiepVu) return res.status(e.ma).json(e.them ?? { loi: e.message });
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ loi: 'Dữ liệu gửi lên không đúng định dạng.' });
  console.error(e);
  res.status(500).json({ loi: 'Có lỗi hệ thống. Vui lòng thử lại sau.' });
});

// dọn giỏ khách bỏ quên quá 30 ngày (mỗi 6 giờ)
setInterval(() => {
  truyVan(
    `DELETE c FROM dbo.ChiTietGioHang c JOIN dbo.GioHang g ON g.MaGioHang = c.MaGioHang
       WHERE g.MaNguoiDung IS NULL AND g.NgayCapNhat < DATEADD(DAY, -30, SYSUTCDATETIME());
     DELETE FROM dbo.GioHang WHERE MaNguoiDung IS NULL AND NgayCapNhat < DATEADD(DAY, -30, SYSUTCDATETIME());`
  ).catch((e) => console.error('Dọn giỏ lỗi:', e.message));
}, 6 * 3600 * 1000).unref();

if (!KHOA_NOI_BO) throw new Error('Thiếu KHOA_NOI_BO');
await napKhoaCong();
app.listen(3000, () => console.log('CartService chạy ở cổng 3000'));
