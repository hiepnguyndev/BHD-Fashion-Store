import fs from 'node:fs';
import jwt from 'jsonwebtoken';

const DUONG_KHOA = `${process.env.THU_MUC_KHOA || '/khoa'}/public.pem`;
let khoaCong;

export async function napKhoaCong() {
  for (let i = 0; i < 60 && !fs.existsSync(DUONG_KHOA); i++) await new Promise((r) => setTimeout(r, 1000));
  khoaCong = fs.readFileSync(DUONG_KHOA, 'utf8');
}

function giaiMa(tieuDe) {
  if (!tieuDe || !/^bearer /i.test(tieuDe)) return null;
  try {
    const t = jwt.verify(tieuDe.slice(7).trim(), khoaCong, { algorithms: ['RS256'], issuer: 'thoitrang-nguoidung' });
    const ma = Number(t.sub);
    return Number.isInteger(ma) ? { ma, vaiTro: t.vai_tro } : null;
  } catch {
    return null;
  }
}

/** Có token hợp lệ thì gắn req.nguoiDung; token sai thì 401 (không âm thầm coi là khách). */
export function tuyChon(req, res, next) {
  if (req.headers.authorization) {
    const nd = giaiMa(req.headers.authorization);
    if (!nd) return res.status(401).json({ loi: 'Phiên đăng nhập đã hết hạn.' });
    req.nguoiDung = nd;
  }
  next();
}

export function batBuocDangNhap(req, res, next) {
  if (!req.nguoiDung) return res.status(401).json({ loi: 'Bạn chưa đăng nhập.' });
  next();
}
