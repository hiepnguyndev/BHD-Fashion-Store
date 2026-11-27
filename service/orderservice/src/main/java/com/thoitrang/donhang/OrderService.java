package com.thoitrang.donhang;

import com.thoitrang.donhang.ApiError.LoiNghiepVu;
import com.thoitrang.donhang.Requests.DatHang;
import com.thoitrang.donhang.Requests.Dong;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final SecureRandom NGAU_NHIEN = new SecureRandom();
    private static final String BANG_CHU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm: 0 O 1 I L
    private static final Pattern RE_EMAIL = Pattern.compile("^[^@\\s]{1,64}@[^@\\s]+\\.[^@\\s]{2,}$");
    private static final Pattern RE_SDT = Pattern.compile("^(0|\\+84)\\d{9,10}$");
    private static final Set<String> PHUONG_THUC = Set.of("COD", "SePayGateway", "VietQR");

    /** Bảng chuyển trạng thái hợp lệ. */
    private static final Map<String, Set<String>> CHUYEN = Map.of(
            "ChoThanhToan", Set.of("ChoXacNhan", "DaHuy"),
            "ChoXacNhan", Set.of("DaXacNhan", "DaHuy"),
            "DaXacNhan", Set.of("DangGiao", "DaHuy"),
            "DangGiao", Set.of("DaGiao", "DaHuy"),
            "DaGiao", Set.of(),
            "DaHuy", Set.of());

    private static final Map<String, String> TEN_TRANG_THAI = Map.of(
            "ChoThanhToan", "Chờ thanh toán", "ChoXacNhan", "Chờ xác nhận", "DaXacNhan", "Đã xác nhận",
            "DangGiao", "Đang giao hàng", "DaGiao", "Đã giao thành công", "DaHuy", "Đã hủy");

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final AppConfig cau;
    private final ExternalServices ngoai;

    public OrderService(JdbcTemplate jdbc, TransactionTemplate tx, AppConfig cau, ExternalServices ngoai) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.cau = cau;
        this.ngoai = ngoai;
    }

    // ================================================================= tiện ích
    public static Map<String, Object> camel(Map<String, Object> dong) {
        Map<String, Object> kq = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : dong.entrySet()) {
            String k = e.getKey();
            Object v = e.getValue();
            if (v instanceof Timestamp t) v = t.toInstant().toString();
            kq.put(Character.toLowerCase(k.charAt(0)) + k.substring(1), v);
        }
        return kq;
    }

    private static List<Map<String, Object>> camelDs(List<Map<String, Object>> ds) {
        return ds.stream().map(OrderService::camel).toList();
    }

    private static String chuoi(Object o) {
        return o == null ? null : o.toString().trim();
    }

    private static long tien(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static String maNgauNhien(int dai) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < dai; i++) sb.append(BANG_CHU.charAt(NGAU_NHIEN.nextInt(BANG_CHU.length())));
        return sb.toString();
    }

    private static String taoMaDon() {
        return "DH" + LocalDate.now(ZoneOffset.ofHours(7)).format(DateTimeFormatter.ofPattern("yyMMdd")) + maNgauNhien(5);
    }

    private static void bat(boolean ok, String noiDung) {
        if (!ok) throw new LoiNghiepVu(422, noiDung);
    }

    private static String cat(String s, int toiDa) {
        return s == null ? null : (s.length() > toiDa ? s.substring(0, toiDa) : s);
    }

    // ================================================================= phiếu giảm giá
    /** Tính tiền giảm theo phiếu (chỉ kiểm tra, chưa trừ lượt dùng). Trả về dòng phiếu + tienGiam. */
    public Map<String, Object> tinhPhieu(String maCode, long tongTienHang, Integer maNguoiDung, String email) {
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT * FROM dbo.PhieuGiamGia WHERE MaCode = ?", maCode.trim().toUpperCase());
        if (ds.isEmpty()) throw new LoiNghiepVu(422, "Mã giảm giá không tồn tại.");
        Map<String, Object> p = ds.get(0);
        Integer dem = jdbc.queryForObject(
                "SELECT COUNT(*) FROM dbo.PhieuGiamGia WHERE MaPhieuGiamGia = ? AND HoatDong = 1 "
                        + "AND NgayBatDau <= SYSUTCDATETIME() AND NgayKetThuc >= SYSUTCDATETIME()",
                Integer.class, p.get("MaPhieuGiamGia"));
        if (dem == null || dem == 0) throw new LoiNghiepVu(422, "Mã giảm giá đã hết hạn hoặc chưa có hiệu lực.");
        if (p.get("SoLuong") != null && ((Number) p.get("DaDung")).intValue() >= ((Number) p.get("SoLuong")).intValue())
            throw new LoiNghiepVu(422, "Mã giảm giá đã hết lượt sử dụng.");
        if (tongTienHang < tien(p.get("DonToiThieu")))
            throw new LoiNghiepVu(422, "Đơn hàng chưa đạt tối thiểu " + String.format("%,d", tien(p.get("DonToiThieu"))).replace(',', '.') + "đ để dùng mã này.");
        int gioiHan = ((Number) p.get("GioiHanMoiNguoi")).intValue();
        Integer daDung;
        if (maNguoiDung != null) {
            daDung = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.LuotDungPhieu WHERE MaPhieuGiamGia = ? AND (MaNguoiDung = ? OR Email = ?)",
                    Integer.class, p.get("MaPhieuGiamGia"), maNguoiDung, email == null ? "" : email.toLowerCase());
        } else {
            daDung = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.LuotDungPhieu WHERE MaPhieuGiamGia = ? AND Email = ?",
                    Integer.class, p.get("MaPhieuGiamGia"), email == null ? "" : email.toLowerCase());
        }
        if (daDung != null && daDung >= gioiHan) throw new LoiNghiepVu(422, "Bạn đã dùng hết số lần cho mã giảm giá này.");

        long giam;
        long giaTri = tien(p.get("GiaTriGiam"));
        if ("PhanTram".equals(p.get("LoaiGiam"))) {
            giam = tongTienHang * giaTri / 100;
            if (p.get("GiamToiDa") != null) giam = Math.min(giam, tien(p.get("GiamToiDa")));
        } else {
            giam = giaTri;
        }
        giam = Math.max(0, Math.min(giam, tongTienHang));
        Map<String, Object> kq = new HashMap<>();
        kq.put("maPhieuGiamGia", p.get("MaPhieuGiamGia"));
        kq.put("maCode", p.get("MaCode"));
        kq.put("tienGiam", giam);
        return kq;
    }

    // ================================================================= đặt hàng
    public Map<String, Object> datHang(DatHang d, Integer maNguoiDung) {
        // ---- kiểm tra dữ liệu
        bat(d != null && d.dong() != null && !d.dong().isEmpty(), "Giỏ hàng trống.");
        bat(d.dong().size() <= 30, "Mỗi đơn tối đa 30 dòng sản phẩm.");
        String email = chuoi(d.email());
        bat(email != null && email.length() <= 150 && RE_EMAIL.matcher(email).matches(), "Email không hợp lệ.");
        String ten = chuoi(d.tenNguoiNhan());
        bat(ten != null && ten.length() >= 2 && ten.length() <= 100, "Vui lòng nhập tên người nhận (2–100 ký tự).");
        String sdt = chuoi(d.soDienThoai());
        bat(sdt != null && RE_SDT.matcher(sdt).matches(), "Số điện thoại không hợp lệ.");
        String diaChi = chuoi(d.diaChiGiao());
        bat(diaChi != null && diaChi.length() >= 3 && diaChi.length() <= 255, "Vui lòng nhập địa chỉ giao hàng.");
        bat(chuoi(d.phuongXa()) != null && chuoi(d.tinhThanh()) != null, "Vui lòng chọn tỉnh/thành và phường/xã.");
        bat(d.phuongThuc() != null && PHUONG_THUC.contains(d.phuongThuc()), "Phương thức thanh toán không hợp lệ.");

        Map<Integer, Integer> soLuongTheoBienThe = new LinkedHashMap<>();
        for (Dong dong : d.dong()) {
            bat(dong != null && dong.maBienThe() != null && dong.soLuong() != null, "Dòng sản phẩm không hợp lệ.");
            bat(dong.soLuong() >= 1 && dong.soLuong() <= 99, "Số lượng mỗi sản phẩm từ 1 đến 99.");
            soLuongTheoBienThe.merge(dong.maBienThe(), dong.soLuong(), Integer::sum);
        }
        bat(soLuongTheoBienThe.values().stream().allMatch(v -> v <= 99), "Số lượng mỗi sản phẩm tối đa 99.");

        // ---- giá do máy chủ quyết định, không tin giá từ trình duyệt
        Map<Integer, Map<String, Object>> thongTin = ngoai.layBienThe(new ArrayList<>(soLuongTheoBienThe.keySet()));
        long tongTienHang = 0;
        List<Map<String, Object>> dongDon = new ArrayList<>();
        List<Map<String, Object>> dongKho = new ArrayList<>();
        for (Map.Entry<Integer, Integer> e : soLuongTheoBienThe.entrySet()) {
            Map<String, Object> b = thongTin.get(e.getKey());
            if (b == null || !Boolean.TRUE.equals(b.get("hienThi")) || !"DangBan".equals(b.get("trangThaiSanPham")))
                throw new LoiNghiepVu(409, "Một sản phẩm trong giỏ hiện không còn bán. Vui lòng kiểm tra lại giỏ hàng.");
            int conLai = ((Number) b.get("conLai")).intValue();
            if (conLai < e.getValue())
                throw new LoiNghiepVu(409, "Sản phẩm \"" + b.get("tenSanPham") + "\" (" + b.get("kichCo") + ", " + b.get("mauSac")
                        + ") chỉ còn " + Math.max(conLai, 0) + ".");
            long gia = tien(b.get("gia"));
            tongTienHang += gia * e.getValue();
            Map<String, Object> dd = new HashMap<>(b);
            dd.put("soLuongDat", e.getValue());
            dongDon.add(dd);
            dongKho.add(Map.of("maBienThe", e.getKey(), "soLuong", e.getValue()));
        }

        // ---- phí vận chuyển, giảm giá, tổng
        long phiVanChuyen = tongTienHang >= cau.mienPhiVanChuyenTu() ? 0 : cau.phiVanChuyen();
        long tienGiam = 0;
        Integer maPhieu = null;
        if (d.maGiamGia() != null && !d.maGiamGia().isBlank()) {
            Map<String, Object> p = tinhPhieu(d.maGiamGia(), tongTienHang, maNguoiDung, email);
            tienGiam = (Long) p.get("tienGiam");
            maPhieu = ((Number) p.get("maPhieuGiamGia")).intValue();
        }
        long tongThanhToan = Math.max(0, tongTienHang + phiVanChuyen - tienGiam);
        boolean truc = !"COD".equals(d.phuongThuc());
        String trangThai = truc ? "ChoThanhToan" : "ChoXacNhan";

        // ---- giữ hàng (mã đơn dùng làm mã tham chiếu kho)
        String maDon = null;
        Integer maDonHang = null;
        for (int lan = 0; lan < 5 && maDonHang == null; lan++) {
            maDon = taoMaDon();
            if (jdbc.queryForObject("SELECT COUNT(*) FROM dbo.DonHang WHERE MaDonHienThi = ?", Integer.class, maDon) == 0) break;
        }
        ngoai.giuCho(maDon, dongKho);

        final String maDonCuoi = maDon;
        final long fTongTienHang = tongTienHang;
        final long fPhi = phiVanChuyen;
        final long fGiam = tienGiam;
        final long fTong = tongThanhToan;
        final Integer fPhieu = maPhieu;
        try {
            maDonHang = tx.execute(st -> {
                if (fPhieu != null) {
                    int n = jdbc.update("UPDATE dbo.PhieuGiamGia SET DaDung = DaDung + 1 WHERE MaPhieuGiamGia = ? AND HoatDong = 1 "
                            + "AND NgayBatDau <= SYSUTCDATETIME() AND NgayKetThuc >= SYSUTCDATETIME() AND (SoLuong IS NULL OR DaDung < SoLuong)", fPhieu);
                    if (n == 0) throw new LoiNghiepVu(422, "Mã giảm giá đã hết lượt sử dụng.");
                }
                Integer id = jdbc.queryForObject(
                        "INSERT INTO dbo.DonHang (MaDonHienThi, MaNguoiDung, Email, TenNguoiNhan, SoDienThoai, DiaChiGiao, MaPhuongXa, PhuongXa, "
                                + "MaTinhThanh, TinhThanh, TongTienHang, PhiVanChuyen, TienGiam, TongThanhToan, MaPhieuGiamGia, PhuongThucThanhToan, "
                                + "TrangThai, HetHanThanhToanLuc, GhiChuKhach) OUTPUT INSERTED.MaDonHang "
                                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "
                                + (truc ? "DATEADD(MINUTE, " + cau.hanThanhToanPhut() + ", SYSUTCDATETIME())" : "NULL") + ", ?)",
                        Integer.class, maDonCuoi, maNguoiDung, email.toLowerCase(), ten, sdt, diaChi, cat(chuoi(d.maPhuongXa()), 20),
                        chuoi(d.phuongXa()), cat(chuoi(d.maTinhThanh()), 20), chuoi(d.tinhThanh()), fTongTienHang, fPhi, fGiam, fTong,
                        fPhieu, d.phuongThuc(), trangThai, cat(chuoi(d.ghiChu()), 500));
                for (Map<String, Object> dd : dongDon) {
                    jdbc.update("INSERT INTO dbo.ChiTietDonHang (MaDonHang, MaBienThe, MaSanPham, TenSanPham, KichCo, MauSac, MaHang, DuongDanAnh, DonGia, SoLuong) "
                                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            id, dd.get("maBienThe"), dd.get("maSanPham"), dd.get("tenSanPham"), dd.get("kichCo"), dd.get("mauSac"),
                            dd.get("maHang"), dd.get("duongDanAnh"), tien(dd.get("gia")), dd.get("soLuongDat"));
                }
                if (fPhieu != null) {
                    jdbc.update("INSERT INTO dbo.LuotDungPhieu (MaPhieuGiamGia, MaDonHang, MaNguoiDung, Email) VALUES (?, ?, ?, ?)",
                            fPhieu, id, maNguoiDung, email.toLowerCase());
                }
                jdbc.update("INSERT INTO dbo.LichSuTrangThaiDon (MaDonHang, TrangThaiCu, TrangThaiMoi, GhiChu, NguoiThucHien) VALUES (?, NULL, ?, N'Khách đặt hàng', ?)",
                        id, trangThai, maNguoiDung);
                return id;
            });
        } catch (RuntimeException e) {
            ngoai.nhaGiuCho(maDonCuoi); // giao dịch lỗi: trả lại hàng đã giữ
            if (e instanceof DuplicateKeyException) throw new LoiNghiepVu(503, "Hệ thống đang bận, vui lòng thử lại.");
            throw e;
        }

        // ---- tạo giao dịch thanh toán; lỗi thì hủy đơn để không giữ hàng vô ích
        Map<String, Object> thanhToan;
        try {
            Map<String, Object> yc = new HashMap<>();
            yc.put("maDonHang", maDonHang);
            yc.put("maDonHienThi", maDonCuoi);
            yc.put("kenh", d.phuongThuc());
            yc.put("soTien", tongThanhToan);
            yc.put("email", email.toLowerCase());
            yc.put("hetHanLuc", truc ? java.time.Instant.now().plusSeconds(cau.hanThanhToanPhut() * 60L).toString() : null);
            thanhToan = ngoai.taoThanhToan(yc);
        } catch (RuntimeException e) {
            try {
                huyNoiBo(maDonHang, "Không tạo được giao dịch thanh toán", null, true);
            } catch (RuntimeException e2) {
                log.error("Hủy đơn {} sau lỗi thanh toán cũng lỗi: {}", maDonCuoi, e2.getMessage());
            }
            throw e;
        }

        // ---- thông báo
        Map<String, Object> chiTiet = layChiTietTheoMa(maDonCuoi);
        ngoai.guiEmail("XacNhanDon", email.toLowerCase(), duLieuEmailDon(chiTiet), maDonCuoi);
        if (maNguoiDung != null)
            ngoai.thongBaoTrongApp(maNguoiDung, "Đã nhận đơn " + maDonCuoi,
                    truc ? "Vui lòng thanh toán trong " + cau.hanThanhToanPhut() + " phút để giữ hàng." : "Cửa hàng sẽ sớm xác nhận đơn của bạn.",
                    "/don-hang/" + maDonCuoi);

        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("maDonHang", maDonHang);
        kq.put("maDonHienThi", maDonCuoi);
        kq.put("trangThai", trangThai);
        kq.put("tongThanhToan", tongThanhToan);
        kq.put("phuongThuc", d.phuongThuc());
        kq.put("thanhToan", thanhToan);
        return kq;
    }

    private Map<String, Object> duLieuEmailDon(Map<String, Object> don) {
        Map<String, Object> du = new HashMap<>();
        du.put("maDon", don.get("maDonHienThi"));
        du.put("ten", don.get("tenNguoiNhan"));
        du.put("dong", ((List<?>) don.get("dong")).stream().map(o -> {
            @SuppressWarnings("unchecked") Map<String, Object> m = (Map<String, Object>) o;
            Map<String, Object> r = new HashMap<>();
            r.put("ten", m.get("tenSanPham"));
            r.put("kichCo", m.get("kichCo"));
            r.put("mauSac", m.get("mauSac"));
            r.put("soLuong", m.get("soLuong"));
            r.put("thanhTien", tien(m.get("donGia")) * ((Number) m.get("soLuong")).longValue());
            return r;
        }).toList());
        du.put("tongTienHang", don.get("tongTienHang"));
        du.put("phiVanChuyen", don.get("phiVanChuyen"));
        du.put("tienGiam", don.get("tienGiam"));
        du.put("tongThanhToan", don.get("tongThanhToan"));
        du.put("phuongThuc", don.get("phuongThucThanhToan"));
        du.put("diaChi", don.get("diaChiGiao") + ", " + don.get("phuongXa") + ", " + don.get("tinhThanh"));
        du.put("lienKet", cau.webUrl() + "/tra-cuu-don-hang?ma=" + don.get("maDonHienThi"));
        return du;
    }

    // ================================================================= truy vấn đơn
    private Map<String, Object> layDon(String maDonHienThi) {
        List<Map<String, Object>> ds = jdbc.queryForList("SELECT * FROM dbo.DonHang WHERE MaDonHienThi = ?", maDonHienThi);
        if (ds.isEmpty()) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
        return ds.get(0);
    }

    /** Chi tiết đơn đầy đủ (không kiểm tra quyền; nơi gọi tự kiểm tra). */
    public Map<String, Object> layChiTietTheoMa(String maDonHienThi) {
        Map<String, Object> don = camel(layDon(maDonHienThi));
        int id = ((Number) don.get("maDonHang")).intValue();
        don.remove("ghiChuNoiBo");
        don.put("dong", camelDs(jdbc.queryForList("SELECT * FROM dbo.ChiTietDonHang WHERE MaDonHang = ? ORDER BY MaChiTietDon", id)));
        don.put("lichSu", camelDs(jdbc.queryForList(
                "SELECT TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao FROM dbo.LichSuTrangThaiDon WHERE MaDonHang = ? ORDER BY MaLichSu", id)));
        don.put("vanChuyen", camelDs(jdbc.queryForList(
                "SELECT DonViVanChuyen, MaVanDon, TrangThai, NgayDuKienGiao, NgayTao FROM dbo.VanChuyen WHERE MaDonHang = ? ORDER BY MaVanChuyen", id)));
        don.put("doiTra", layDoiTra(id));
        don.put("tenTrangThai", TEN_TRANG_THAI.get(don.get("trangThai")));
        don.put("coTheDoiTra", coTheDoiTra(id, (String) don.get("trangThai")));
        return don;
    }

    public Map<String, Object> chiTietChoNguoiDung(String ma, int maNguoiDung, boolean quanTri) {
        Map<String, Object> don = layChiTietTheoMa(ma);
        Object chu = don.get("maNguoiDung");
        if (!quanTri && (chu == null || ((Number) chu).intValue() != maNguoiDung))
            throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
        int id = ((Number) don.get("maDonHang")).intValue();
        don.put("thanhToan", ngoai.thanhToanCuaDon(id));
        if (quanTri) don.put("ghiChuNoiBo", jdbc.queryForObject("SELECT GhiChuNoiBo FROM dbo.DonHang WHERE MaDonHang = ?", String.class, id));
        return don;
    }

    /** Tra cứu cho khách không đăng nhập: cần đúng mã đơn + email đặt hàng. */
    public Map<String, Object> traCuuKhach(String ma, String email) {
        if (ma == null || email == null) throw new LoiNghiepVu(422, "Vui lòng nhập mã đơn và email.");
        Map<String, Object> don;
        try {
            don = layChiTietTheoMa(ma.trim().toUpperCase());
        } catch (LoiNghiepVu e) {
            throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng với thông tin này.");
        }
        if (!email.trim().equalsIgnoreCase((String) don.get("email")))
            throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng với thông tin này.");
        don.put("thanhToan", ngoai.thanhToanCuaDon(((Number) don.get("maDonHang")).intValue()));
        return don;
    }

    public Map<String, Object> danhSachCuaToi(int maNguoiDung, int trang, int kichThuoc) {
        int bd = (Math.max(trang, 1) - 1) * kichThuoc;
        Integer tong = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.DonHang WHERE MaNguoiDung = ?", Integer.class, maNguoiDung);
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT d.MaDonHienThi, d.TrangThai, d.TongThanhToan, d.PhuongThucThanhToan, d.NgayDat, "
                        + "(SELECT COUNT(*) FROM dbo.ChiTietDonHang c WHERE c.MaDonHang = d.MaDonHang) AS SoDong, "
                        + "(SELECT TOP 1 c.TenSanPham FROM dbo.ChiTietDonHang c WHERE c.MaDonHang = d.MaDonHang ORDER BY c.MaChiTietDon) AS TenSanPhamDau, "
                        + "(SELECT TOP 1 c.DuongDanAnh FROM dbo.ChiTietDonHang c WHERE c.MaDonHang = d.MaDonHang ORDER BY c.MaChiTietDon) AS AnhDau "
                        + "FROM dbo.DonHang d WHERE d.MaNguoiDung = ? ORDER BY d.NgayDat DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                maNguoiDung, bd, kichThuoc);
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("tong", tong);
        kq.put("trang", Math.max(trang, 1));
        kq.put("kichThuoc", kichThuoc);
        kq.put("danhSach", camelDs(ds));
        return kq;
    }

    public Map<String, Object> daMua(int maNguoiDung, int maSanPham) {
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT TOP 1 d.MaDonHang FROM dbo.DonHang d JOIN dbo.ChiTietDonHang c ON c.MaDonHang = d.MaDonHang "
                        + "WHERE d.MaNguoiDung = ? AND c.MaSanPham = ? AND d.TrangThai = 'DaGiao' ORDER BY d.NgayDat DESC",
                maNguoiDung, maSanPham);
        Map<String, Object> kq = new HashMap<>();
        kq.put("daMua", !ds.isEmpty());
        kq.put("maDonHang", ds.isEmpty() ? null : ds.get(0).get("MaDonHang"));
        return kq;
    }

    // ================================================================= chuyển trạng thái
    /** Chuyển trạng thái nguyên tử: chỉ thành công nếu đơn vẫn đang ở trạng thái cũ. */
    private void ghiTrangThai(int maDonHang, String cu, String moi, String ghiChu, Integer nguoi) {
        int n = jdbc.update("UPDATE dbo.DonHang SET TrangThai = ?, NgayCapNhat = SYSUTCDATETIME() WHERE MaDonHang = ? AND TrangThai = ?",
                moi, maDonHang, cu);
        if (n == 0) throw new LoiNghiepVu(409, "Đơn hàng vừa được cập nhật ở nơi khác. Vui lòng tải lại.");
        jdbc.update("INSERT INTO dbo.LichSuTrangThaiDon (MaDonHang, TrangThaiCu, TrangThaiMoi, GhiChu, NguoiThucHien) VALUES (?, ?, ?, ?, ?)",
                maDonHang, cu, moi, cat(ghiChu, 300), nguoi);
    }

    /** Khách hủy đơn của chính mình (hoặc khách vãng lai kèm email). */
    public Map<String, Object> khachHuy(String ma, String lyDo, Integer maNguoiDung, String email) {
        Map<String, Object> don = layDon(ma);
        Object chu = don.get("MaNguoiDung");
        boolean dungChu = maNguoiDung != null
                ? chu != null && ((Number) chu).intValue() == maNguoiDung
                : chu == null && email != null && email.trim().equalsIgnoreCase((String) don.get("Email"));
        if (!dungChu) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
        String tt = (String) don.get("TrangThai");
        if (!tt.equals("ChoThanhToan") && !tt.equals("ChoXacNhan"))
            throw new LoiNghiepVu(409, "Đơn hàng đã được xử lý, không thể tự hủy. Vui lòng liên hệ cửa hàng.");
        huyNoiBo(((Number) don.get("MaDonHang")).intValue(), lyDo == null || lyDo.isBlank() ? "Khách hủy đơn" : lyDo.trim(), maNguoiDung, false);
        return layChiTietTheoMa(ma);
    }

    /**
     * Hủy đơn: trả hàng/kho, trả lượt dùng phiếu, hủy giao dịch thanh toán.
     * Thứ tự: đổi trạng thái nguyên tử trước (chặn hủy hai lần), rồi mới đụng các dịch vụ khác.
     */
    public void huyNoiBo(int maDonHang, String lyDo, Integer nguoi, boolean khongThongBao) {
        Map<String, Object> don = jdbc.queryForMap("SELECT * FROM dbo.DonHang WHERE MaDonHang = ?", maDonHang);
        String cu = (String) don.get("TrangThai");
        if (!CHUYEN.getOrDefault(cu, Set.of()).contains("DaHuy"))
            throw new LoiNghiepVu(409, "Đơn hàng ở trạng thái hiện tại không thể hủy.");
        String maDon = (String) don.get("MaDonHienThi");
        tx.executeWithoutResult(st -> {
            ghiTrangThai(maDonHang, cu, "DaHuy", lyDo, nguoi);
            jdbc.update("UPDATE dbo.DonHang SET LyDoHuy = ? WHERE MaDonHang = ?", cat(lyDo, 300), maDonHang);
            Object phieu = don.get("MaPhieuGiamGia");
            if (phieu != null) {
                int xoa = jdbc.update("DELETE FROM dbo.LuotDungPhieu WHERE MaDonHang = ? AND MaPhieuGiamGia = ?", maDonHang, phieu);
                if (xoa > 0) jdbc.update("UPDATE dbo.PhieuGiamGia SET DaDung = CASE WHEN DaDung > 0 THEN DaDung - 1 ELSE 0 END WHERE MaPhieuGiamGia = ?", phieu);
            }
        });
        // các bước dưới đều idempotent nên có thể chạy lại nếu một bước lỗi
        if (cu.equals("ChoThanhToan") || cu.equals("ChoXacNhan")) ngoai.nhaGiuCho(maDon);
        else ngoai.hoanKho(maDon, null);
        try {
            ngoai.huyThanhToan(maDonHang);
        } catch (RuntimeException e) {
            log.error("Đơn {} đã hủy nhưng chưa hủy được thanh toán: {}", maDon, e.getMessage());
        }
        if (!khongThongBao) thongBaoTrangThai(don, "DaHuy", lyDo);
    }

    /** Quản trị chuyển trạng thái. */
    public Map<String, Object> quanTriDoiTrangThai(String ma, Requests.DoiTrangThai d, int maQuanTri) {
        Map<String, Object> don = layDon(ma);
        int id = ((Number) don.get("MaDonHang")).intValue();
        String cu = (String) don.get("TrangThai");
        String moi = d.trangThai();
        if (moi == null || !CHUYEN.containsKey(moi)) throw new LoiNghiepVu(422, "Trạng thái không hợp lệ.");
        if (!CHUYEN.get(cu).contains(moi)) throw new LoiNghiepVu(409, "Không thể chuyển từ \"" + TEN_TRANG_THAI.get(cu) + "\" sang \"" + TEN_TRANG_THAI.get(moi) + "\".");
        String maDon = (String) don.get("MaDonHienThi");
        switch (moi) {
            case "DaHuy" -> huyNoiBo(id, d.ghiChu() == null || d.ghiChu().isBlank() ? "Cửa hàng hủy đơn" : d.ghiChu().trim(), maQuanTri, false);
            case "DaXacNhan" -> {
                ngoai.xacNhanBan(maDon);
                tx.executeWithoutResult(st -> ghiTrangThai(id, cu, moi, d.ghiChu(), maQuanTri));
                thongBaoTrangThai(don, moi, d.ghiChu());
            }
            case "DangGiao" -> {
                String donVi = chuoi(d.donViVanChuyen());
                if (donVi == null || donVi.isEmpty() || donVi.length() > 30) throw new LoiNghiepVu(422, "Vui lòng nhập đơn vị vận chuyển (tối đa 30 ký tự).");
                String maVanDon = chuoi(d.maVanDon());
                boolean cod = "COD".equals(don.get("PhuongThucThanhToan"));
                try {
                    tx.executeWithoutResult(st -> {
                        ghiTrangThai(id, cu, moi, d.ghiChu(), maQuanTri);
                        jdbc.update("INSERT INTO dbo.VanChuyen (MaDonHang, DonViVanChuyen, MaVanDon, PhiVanChuyen, TienThuHo, TrangThai) VALUES (?, ?, ?, ?, ?, 'DangGiao')",
                                id, donVi, maVanDon == null || maVanDon.isEmpty() ? null : maVanDon, don.get("PhiVanChuyen"), cod ? don.get("TongThanhToan") : 0);
                    });
                } catch (DuplicateKeyException e) {
                    throw new LoiNghiepVu(409, "Mã vận đơn này đã tồn tại.");
                }
                thongBaoTrangThai(don, moi, "Đơn vị vận chuyển: " + donVi + (maVanDon == null ? "" : " — Mã vận đơn: " + maVanDon));
            }
            case "DaGiao" -> {
                if ("COD".equals(don.get("PhuongThucThanhToan"))) ngoai.codDaThu(id);
                tx.executeWithoutResult(st -> {
                    ghiTrangThai(id, cu, moi, d.ghiChu(), maQuanTri);
                    jdbc.update("UPDATE dbo.VanChuyen SET TrangThai = 'DaGiao', NgayCapNhat = SYSUTCDATETIME() WHERE MaDonHang = ? AND TrangThai = 'DangGiao'", id);
                });
                thongBaoTrangThai(don, moi, d.ghiChu());
            }
            default -> throw new LoiNghiepVu(409, "Chuyển trạng thái này do hệ thống tự thực hiện khi khách thanh toán.");
        }
        return layChiTietTheoMa(ma);
    }

    /** Thanh toán báo về: đơn chờ thanh toán -> chờ xác nhận. */
    public String thanhToanThanhCong(int maDonHang, Requests.DaThanhToan d) {
        List<Map<String, Object>> ds = jdbc.queryForList("SELECT * FROM dbo.DonHang WHERE MaDonHang = ?", maDonHang);
        if (ds.isEmpty()) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
        Map<String, Object> don = ds.get(0);
        String cu = (String) don.get("TrangThai");
        if (cu.equals("DaHuy")) return "donDaHuy";
        if (!cu.equals("ChoThanhToan")) return "ok"; // đã được xử lý trước đó (idempotent)
        try {
            tx.executeWithoutResult(st -> ghiTrangThai(maDonHang, "ChoThanhToan", "ChoXacNhan", "Đã nhận thanh toán", null));
        } catch (LoiNghiepVu e) {
            Integer tt = jdbc.queryForObject("SELECT CASE WHEN TrangThai = 'DaHuy' THEN 1 ELSE 0 END FROM dbo.DonHang WHERE MaDonHang = ?", Integer.class, maDonHang);
            if (tt != null && tt == 1) return "donDaHuy";
            if (e.ma() != 409) throw e;
        }
        thongBaoTrangThai(don, "ChoXacNhan", "Cửa hàng đã nhận thanh toán của bạn và sẽ sớm xác nhận đơn.");
        return "ok";
    }

    private void thongBaoTrangThai(Map<String, Object> don, String trangThaiMoi, String ghiChu) {
        String maDon = (String) don.get("MaDonHienThi");
        Map<String, Object> du = new HashMap<>();
        du.put("maDon", maDon);
        du.put("ten", don.get("TenNguoiNhan"));
        du.put("trangThai", TEN_TRANG_THAI.get(trangThaiMoi));
        du.put("ghiChu", ghiChu);
        du.put("lienKet", cau.webUrl() + "/tra-cuu-don-hang?ma=" + maDon);
        ngoai.guiEmail("CapNhatDonHang", (String) don.get("Email"), du, maDon);
        Object nd = don.get("MaNguoiDung");
        if (nd != null)
            ngoai.thongBaoTrongApp(((Number) nd).intValue(), "Đơn " + maDon + ": " + TEN_TRANG_THAI.get(trangThaiMoi), ghiChu, "/don-hang/" + maDon);
    }

    // ================================================================= hết hạn thanh toán (chạy định kỳ)
    public void xuLyHetHan() {
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT TOP 50 MaDonHang, MaDonHienThi FROM dbo.DonHang WHERE TrangThai = 'ChoThanhToan' AND HetHanThanhToanLuc < SYSUTCDATETIME()");
        for (Map<String, Object> d : ds) {
            int id = ((Number) d.get("MaDonHang")).intValue();
            try {
                // Phòng khi webhook về chậm: nếu tiền đã vào thì chuyển tiếp thay vì hủy
                Map<String, Object> tt = ngoai.thanhToanCuaDon(id);
                if (tt != null && "DaThanhToan".equals(tt.get("trangThai"))) {
                    thanhToanThanhCong(id, null);
                } else {
                    huyNoiBo(id, "Hết hạn thanh toán", null, false);
                }
            } catch (RuntimeException e) {
                log.warn("Xử lý hết hạn đơn {} lỗi: {}", d.get("MaDonHienThi"), e.getMessage());
            }
        }
    }

    // ================================================================= đổi trả
    private List<Map<String, Object>> layDoiTra(int maDonHang) {
        List<Map<String, Object>> ds = camelDs(jdbc.queryForList("SELECT * FROM dbo.DoiTra WHERE MaDonHang = ? ORDER BY MaDoiTra DESC", maDonHang));
        for (Map<String, Object> d : ds) {
            d.put("dong", camelDs(jdbc.queryForList(
                    "SELECT t.MaChiTietDoiTra, t.MaChiTietDon, t.SoLuong, t.MaBienTheMoi, c.TenSanPham, c.KichCo, c.MauSac "
                            + "FROM dbo.ChiTietDoiTra t JOIN dbo.ChiTietDonHang c ON c.MaChiTietDon = t.MaChiTietDon WHERE t.MaDoiTra = ?", d.get("maDoiTra"))));
        }
        return ds;
    }

    private boolean coTheDoiTra(int maDonHang, String trangThai) {
        if (!"DaGiao".equals(trangThai)) return false;
        Integer con = jdbc.queryForObject(
                "SELECT COUNT(*) FROM dbo.LichSuTrangThaiDon WHERE MaDonHang = ? AND TrangThaiMoi = 'DaGiao' "
                        + "AND NgayTao >= DATEADD(DAY, ?, SYSUTCDATETIME())", Integer.class, maDonHang, -cau.soNgayDoiTra());
        return con != null && con > 0;
    }

    public Map<String, Object> yeuCauDoiTra(String ma, int maNguoiDung, Requests.DoiTra d) {
        Map<String, Object> don = layDon(ma);
        Object chu = don.get("MaNguoiDung");
        if (chu == null || ((Number) chu).intValue() != maNguoiDung) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
        int id = ((Number) don.get("MaDonHang")).intValue();
        if (!coTheDoiTra(id, (String) don.get("TrangThai")))
            throw new LoiNghiepVu(409, "Đơn hàng không còn trong thời hạn đổi trả (" + cau.soNgayDoiTra() + " ngày kể từ khi nhận hàng).");
        bat(d != null && ("DoiHang".equals(d.hinhThuc()) || "TraHang".equals(d.hinhThuc())), "Hình thức phải là đổi hàng hoặc trả hàng.");
        String lyDo = chuoi(d.lyDo());
        bat(lyDo != null && lyDo.length() >= 5 && lyDo.length() <= 500, "Vui lòng nhập lý do (5–500 ký tự).");
        bat(d.dong() != null && !d.dong().isEmpty(), "Vui lòng chọn sản phẩm cần đổi/trả.");

        Map<Integer, Integer> daYeuCau = new HashMap<>();
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT t.MaChiTietDon, SUM(t.SoLuong) AS Tong FROM dbo.ChiTietDoiTra t JOIN dbo.DoiTra x ON x.MaDoiTra = t.MaDoiTra "
                        + "WHERE x.MaDonHang = ? AND x.TrangThai <> 'TuChoi' GROUP BY t.MaChiTietDon", id))
            daYeuCau.put(((Number) r.get("MaChiTietDon")).intValue(), ((Number) r.get("Tong")).intValue());
        Map<Integer, Map<String, Object>> dongDon = new HashMap<>();
        for (Map<String, Object> r : jdbc.queryForList("SELECT * FROM dbo.ChiTietDonHang WHERE MaDonHang = ?", id))
            dongDon.put(((Number) r.get("MaChiTietDon")).intValue(), r);

        long soTienHoan = 0;
        Set<Integer> daChon = new java.util.HashSet<>();
        for (Requests.DongDoiTra x : d.dong()) {
            bat(x != null && x.maChiTietDon() != null && x.soLuong() != null && x.soLuong() > 0, "Dòng đổi/trả không hợp lệ.");
            bat(daChon.add(x.maChiTietDon()), "Mỗi sản phẩm chỉ chọn một lần.");
            Map<String, Object> c = dongDon.get(x.maChiTietDon());
            bat(c != null, "Sản phẩm không thuộc đơn hàng này.");
            int mua = ((Number) c.get("SoLuong")).intValue();
            int conLai = mua - daYeuCau.getOrDefault(x.maChiTietDon(), 0);
            bat(x.soLuong() <= conLai, "Số lượng đổi/trả vượt quá số đã mua (còn " + Math.max(conLai, 0) + ").");
            soTienHoan += tien(c.get("DonGia")) * x.soLuong();
        }
        final long hoan = "TraHang".equals(d.hinhThuc()) ? soTienHoan : 0;
        Integer maDoiTra = tx.execute(st -> {
            Integer dt = jdbc.queryForObject("INSERT INTO dbo.DoiTra (MaDonHang, HinhThuc, LyDo, SoTienHoan) OUTPUT INSERTED.MaDoiTra VALUES (?, ?, ?, ?)",
                    Integer.class, id, d.hinhThuc(), lyDo, hoan);
            for (Requests.DongDoiTra x : d.dong())
                jdbc.update("INSERT INTO dbo.ChiTietDoiTra (MaDoiTra, MaChiTietDon, SoLuong, MaBienTheMoi) VALUES (?, ?, ?, ?)",
                        dt, x.maChiTietDon(), x.soLuong(), "DoiHang".equals(d.hinhThuc()) ? x.maBienTheMoi() : null);
            return dt;
        });
        return Map.of("maDoiTra", maDoiTra, "thongBao", "Đã gửi yêu cầu. Cửa hàng sẽ phản hồi sớm.");
    }

    public Map<String, Object> quanTriDuyetDoiTra(int maDoiTra, Requests.DuyetDoiTra d) {
        List<Map<String, Object>> ds = jdbc.queryForList("SELECT x.*, o.MaDonHienThi, o.Email, o.TenNguoiNhan, o.MaNguoiDung FROM dbo.DoiTra x JOIN dbo.DonHang o ON o.MaDonHang = x.MaDonHang WHERE x.MaDoiTra = ?", maDoiTra);
        if (ds.isEmpty()) throw new LoiNghiepVu(404, "Không tìm thấy yêu cầu đổi trả.");
        Map<String, Object> x = ds.get(0);
        String cu = (String) x.get("TrangThai");
        String moi = d.trangThai();
        Map<String, Set<String>> hopLe = Map.of("ChoDuyet", Set.of("DaDuyet", "TuChoi"), "DaDuyet", Set.of("DaNhanHang"),
                "DaNhanHang", Set.of("DaHoanTat"), "TuChoi", Set.of(), "DaHoanTat", Set.of());
        if (moi == null || !hopLe.containsKey(moi) || !hopLe.get(cu).contains(moi))
            throw new LoiNghiepVu(409, "Không thể chuyển trạng thái đổi trả này.");
        String maDon = (String) x.get("MaDonHienThi");
        List<Map<String, Object>> dong = jdbc.queryForList(
                "SELECT t.MaChiTietDon, t.SoLuong, t.MaBienTheMoi, c.MaBienThe FROM dbo.ChiTietDoiTra t JOIN dbo.ChiTietDonHang c ON c.MaChiTietDon = t.MaChiTietDon WHERE t.MaDoiTra = ?", maDoiTra);
        String thamChieuDoi = "DT" + maDoiTra;
        boolean doiHang = "DoiHang".equals(x.get("HinhThuc"));

        if (moi.equals("DaDuyet") && doiHang) {
            List<Map<String, Object>> moiDong = dong.stream().filter(r -> r.get("MaBienTheMoi") != null)
                    .map(r -> Map.<String, Object>of("maBienThe", ((Number) r.get("MaBienTheMoi")).intValue(), "soLuong", ((Number) r.get("SoLuong")).intValue())).toList();
            if (!moiDong.isEmpty()) ngoai.giuChoDoiHang(thamChieuDoi, moiDong); // giữ hàng thay thế; hết hàng -> 409
        }
        if (moi.equals("DaNhanHang")) {
            List<Map<String, Object>> tra = dong.stream()
                    .map(r -> Map.<String, Object>of("maBienThe", ((Number) r.get("MaBienThe")).intValue(), "soLuong", ((Number) r.get("SoLuong")).intValue())).toList();
            ngoai.hoanKho(maDon, tra); // hàng khách trả về kho
            if (doiHang && dong.stream().anyMatch(r -> r.get("MaBienTheMoi") != null)) ngoai.xacNhanBan(thamChieuDoi);
        }
        tx.executeWithoutResult(st -> {
            int n = jdbc.update("UPDATE dbo.DoiTra SET TrangThai = ?, GhiChuAdmin = COALESCE(?, GhiChuAdmin), SoTienHoan = COALESCE(?, SoTienHoan), NgayCapNhat = SYSUTCDATETIME() WHERE MaDoiTra = ? AND TrangThai = ?",
                    moi, cat(chuoi(d.ghiChuAdmin()), 500), d.soTienHoan(), maDoiTra, cu);
            if (n == 0) throw new LoiNghiepVu(409, "Yêu cầu vừa được cập nhật ở nơi khác. Vui lòng tải lại.");
        });
        Map<String, Object> du = new HashMap<>();
        du.put("maDon", maDon);
        du.put("ten", x.get("TenNguoiNhan"));
        du.put("trangThai", "Đổi/trả: " + Map.of("DaDuyet", "đã được duyệt", "TuChoi", "bị từ chối", "DaNhanHang", "đã nhận lại hàng", "DaHoanTat", "đã hoàn tất").get(moi));
        du.put("ghiChu", d.ghiChuAdmin());
        du.put("lienKet", cau.webUrl() + "/tra-cuu-don-hang?ma=" + maDon);
        ngoai.guiEmail("CapNhatDonHang", (String) x.get("Email"), du, maDon);
        return Map.of("thongBao", "Đã cập nhật yêu cầu đổi trả.");
    }

    // ================================================================= quản trị: danh sách, thống kê, phiếu
    public Map<String, Object> quanTriDanhSach(String trangThai, String tuKhoa, int trang, int kichThuoc) {
        List<Object> tham = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (trangThai != null && !trangThai.isBlank()) {
            where.append(" AND d.TrangThai = ?");
            tham.add(trangThai);
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            String m = "%" + tuKhoa.trim().replace("[", "[[]").replace("%", "[%]").replace("_", "[_]") + "%";
            where.append(" AND (d.MaDonHienThi LIKE ? OR d.Email LIKE ? OR d.SoDienThoai LIKE ? OR d.TenNguoiNhan LIKE ?)");
            tham.add(m);
            tham.add(m);
            tham.add(m);
            tham.add(m);
        }
        Integer tong = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.DonHang d" + where, Integer.class, tham.toArray());
        List<Object> thamTrang = new ArrayList<>(tham);
        thamTrang.add((Math.max(trang, 1) - 1) * kichThuoc);
        thamTrang.add(kichThuoc);
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT d.MaDonHienThi, d.TenNguoiNhan, d.Email, d.SoDienThoai, d.TongThanhToan, d.PhuongThucThanhToan, d.TrangThai, d.NgayDat, "
                        + "(SELECT COUNT(*) FROM dbo.DoiTra x WHERE x.MaDonHang = d.MaDonHang AND x.TrangThai = 'ChoDuyet') AS DoiTraChoDuyet "
                        + "FROM dbo.DonHang d" + where + " ORDER BY d.NgayDat DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", thamTrang.toArray());
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("tong", tong);
        kq.put("trang", Math.max(trang, 1));
        kq.put("kichThuoc", kichThuoc);
        kq.put("danhSach", camelDs(ds));
        return kq;
    }

    public Map<String, Object> thongKe() {
        String ngayVn = "CAST(DATEADD(HOUR, 7, d.NgayDat) AS DATE)";
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("theoTrangThai", camelDs(jdbc.queryForList("SELECT TrangThai, COUNT(*) AS SoDon FROM dbo.DonHang GROUP BY TrangThai")));
        kq.put("doanhThuTheoNgay", camelDs(jdbc.queryForList(
                "SELECT " + ngayVn + " AS Ngay, COUNT(*) AS SoDon, SUM(d.TongThanhToan) AS DoanhThu FROM dbo.DonHang d "
                        + "WHERE d.TrangThai IN ('DaXacNhan', 'DangGiao', 'DaGiao') AND d.NgayDat >= DATEADD(DAY, -30, SYSUTCDATETIME()) "
                        + "GROUP BY " + ngayVn + " ORDER BY Ngay")));
        kq.put("tongQuan", camel(jdbc.queryForMap(
                "SELECT ISNULL(SUM(CASE WHEN d.NgayDat >= DATEADD(DAY, -1, SYSUTCDATETIME()) THEN d.TongThanhToan END), 0) AS DoanhThu24Gio, "
                        + "ISNULL(SUM(CASE WHEN d.NgayDat >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN d.TongThanhToan END), 0) AS DoanhThu7Ngay, "
                        + "ISNULL(SUM(d.TongThanhToan), 0) AS DoanhThu30Ngay, COUNT(*) AS SoDon30Ngay "
                        + "FROM dbo.DonHang d WHERE d.TrangThai IN ('DaXacNhan', 'DangGiao', 'DaGiao') AND d.NgayDat >= DATEADD(DAY, -30, SYSUTCDATETIME())")));
        kq.put("banChay", camelDs(jdbc.queryForList(
                "SELECT TOP 8 c.MaSanPham, MAX(c.TenSanPham) AS TenSanPham, SUM(c.SoLuong) AS DaBan, SUM(c.SoLuong * c.DonGia) AS DoanhThu "
                        + "FROM dbo.ChiTietDonHang c JOIN dbo.DonHang d ON d.MaDonHang = c.MaDonHang "
                        + "WHERE d.TrangThai IN ('DaXacNhan', 'DangGiao', 'DaGiao') AND d.NgayDat >= DATEADD(DAY, -30, SYSUTCDATETIME()) "
                        + "GROUP BY c.MaSanPham ORDER BY DaBan DESC")));
        kq.put("doiTraChoDuyet", jdbc.queryForObject("SELECT COUNT(*) FROM dbo.DoiTra WHERE TrangThai = 'ChoDuyet'", Integer.class));
        return kq;
    }

    public Map<String, Object> quanTriDanhSachDoiTra(String trangThai) {
        List<Map<String, Object>> ds = jdbc.queryForList(
                "SELECT x.MaDoiTra, x.MaDonHang, o.MaDonHienThi, o.TenNguoiNhan, o.Email, x.HinhThuc, x.LyDo, x.TrangThai, x.SoTienHoan, x.GhiChuAdmin, x.NgayTao "
                        + "FROM dbo.DoiTra x JOIN dbo.DonHang o ON o.MaDonHang = x.MaDonHang WHERE (? IS NULL OR x.TrangThai = ?) ORDER BY x.MaDoiTra DESC",
                trangThai == null || trangThai.isBlank() ? null : trangThai, trangThai == null || trangThai.isBlank() ? null : trangThai);
        List<Map<String, Object>> kq = camelDs(ds);
        for (Map<String, Object> r : kq)
            r.put("dong", camelDs(jdbc.queryForList(
                    "SELECT t.MaChiTietDoiTra, t.SoLuong, t.MaBienTheMoi, c.TenSanPham, c.KichCo, c.MauSac FROM dbo.ChiTietDoiTra t "
                            + "JOIN dbo.ChiTietDonHang c ON c.MaChiTietDon = t.MaChiTietDon WHERE t.MaDoiTra = ?", r.get("maDoiTra"))));
        return Map.of("danhSach", kq);
    }

    public void quanTriGhiChu(String ma, String ghiChu) {
        int n = jdbc.update("UPDATE dbo.DonHang SET GhiChuNoiBo = ?, NgayCapNhat = SYSUTCDATETIME() WHERE MaDonHienThi = ?", cat(chuoi(ghiChu), 500), ma);
        if (n == 0) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng.");
    }

    public List<Map<String, Object>> quanTriDsPhieu() {
        return camelDs(jdbc.queryForList("SELECT * FROM dbo.PhieuGiamGia ORDER BY MaPhieuGiamGia DESC"));
    }

    /** Phiếu được đánh dấu công khai, còn hiệu lực và còn lượt dùng — hiển thị ở trang Ưu đãi (không lộ số lượt dùng). */
    public List<Map<String, Object>> dsPhieuCongKhai() {
        return camelDs(jdbc.queryForList(
                "SELECT MaCode, MoTa, LoaiGiam, GiaTriGiam, GiamToiDa, DonToiThieu, NgayKetThuc FROM dbo.PhieuGiamGia "
                        + "WHERE CongKhai = 1 AND HoatDong = 1 AND NgayBatDau <= SYSUTCDATETIME() AND NgayKetThuc >= SYSUTCDATETIME() "
                        + "AND (SoLuong IS NULL OR DaDung < SoLuong) ORDER BY NgayKetThuc, MaPhieuGiamGia"));
    }

    private void kiemTraPhieu(Requests.PhieuGiamGia p) {
        bat(p != null && p.maCode() != null && p.maCode().trim().matches("^[A-Za-z0-9_-]{3,30}$"), "Mã phiếu gồm 3–30 ký tự chữ, số, gạch.");
        bat("PhanTram".equals(p.loaiGiam()) || "SoTien".equals(p.loaiGiam()), "Loại giảm phải là phần trăm hoặc số tiền.");
        bat(p.giaTriGiam() != null && p.giaTriGiam() > 0, "Giá trị giảm phải lớn hơn 0.");
        bat(!"PhanTram".equals(p.loaiGiam()) || p.giaTriGiam() <= 100, "Phần trăm giảm tối đa 100.");
        bat(p.ngayBatDau() != null && p.ngayKetThuc() != null, "Vui lòng nhập thời gian hiệu lực.");
    }

    public Map<String, Object> quanTriTaoPhieu(Requests.PhieuGiamGia p) {
        kiemTraPhieu(p);
        try {
            Integer id = jdbc.queryForObject(
                    "INSERT INTO dbo.PhieuGiamGia (MaCode, MoTa, LoaiGiam, GiaTriGiam, GiamToiDa, DonToiThieu, SoLuong, GioiHanMoiNguoi, NgayBatDau, NgayKetThuc, HoatDong, CongKhai) "
                            + "OUTPUT INSERTED.MaPhieuGiamGia VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS DATETIME2(0)), CAST(? AS DATETIME2(0)), ?, ?)",
                    Integer.class, p.maCode().trim().toUpperCase(), p.moTa(), p.loaiGiam(), p.giaTriGiam(), p.giamToiDa(),
                    p.donToiThieu() == null ? 0 : p.donToiThieu(), p.soLuong(), p.gioiHanMoiNguoi() == null ? 1 : p.gioiHanMoiNguoi(),
                    p.ngayBatDau(), p.ngayKetThuc(), p.hoatDong() == null || p.hoatDong(), p.congKhai() != null && p.congKhai());
            return Map.of("maPhieuGiamGia", id);
        } catch (DuplicateKeyException e) {
            throw new LoiNghiepVu(409, "Mã phiếu đã tồn tại.");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new LoiNghiepVu(422, "Dữ liệu phiếu không hợp lệ (kiểm tra ngày, số lượng).");
        }
    }

    public void quanTriSuaPhieu(int ma, Requests.PhieuGiamGia p) {
        kiemTraPhieu(p);
        try {
            int n = jdbc.update("UPDATE dbo.PhieuGiamGia SET MoTa = ?, LoaiGiam = ?, GiaTriGiam = ?, GiamToiDa = ?, DonToiThieu = ?, SoLuong = ?, GioiHanMoiNguoi = ?, "
                            + "NgayBatDau = CAST(? AS DATETIME2(0)), NgayKetThuc = CAST(? AS DATETIME2(0)), HoatDong = ?, CongKhai = ? WHERE MaPhieuGiamGia = ?",
                    p.moTa(), p.loaiGiam(), p.giaTriGiam(), p.giamToiDa(), p.donToiThieu() == null ? 0 : p.donToiThieu(), p.soLuong(),
                    p.gioiHanMoiNguoi() == null ? 1 : p.gioiHanMoiNguoi(), p.ngayBatDau(), p.ngayKetThuc(), p.hoatDong() == null || p.hoatDong(), p.congKhai() != null && p.congKhai(), ma);
            if (n == 0) throw new LoiNghiepVu(404, "Không tìm thấy phiếu.");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new LoiNghiepVu(422, "Dữ liệu phiếu không hợp lệ (số lượng không được nhỏ hơn số đã dùng, ngày kết thúc phải sau ngày bắt đầu).");
        }
    }

}
