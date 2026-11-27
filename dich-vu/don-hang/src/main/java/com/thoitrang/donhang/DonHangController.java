package com.thoitrang.donhang;

import com.thoitrang.donhang.Loi.LoiNghiepVu;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API cho khách hàng (qua giao diện Next.js). */
@RestController
@RequestMapping("/api")
public class DonHangController {
    private final DonHangService dv;

    public DonHangController(DonHangService dv) {
        this.dv = dv;
    }

    private static Integer maNguoiDung(Jwt jwt) {
        return jwt == null ? null : Integer.valueOf(jwt.getSubject());
    }

    private static int batBuoc(Jwt jwt) {
        if (jwt == null) throw new LoiNghiepVu(401, "Bạn chưa đăng nhập.");
        return Integer.parseInt(jwt.getSubject());
    }

    @GetMapping("/phieu-giam-gia/cong-khai")
    public List<Map<String, Object>> phieuCongKhai() {
        return dv.dsPhieuCongKhai();
    }

    @PostMapping("/phieu-giam-gia/kiem-tra")
    public Map<String, Object> kiemTraPhieu(@RequestBody YeuCau.KiemTraPhieu yc, @AuthenticationPrincipal Jwt jwt) {
        if (yc.maCode() == null || yc.maCode().isBlank() || yc.tongTienHang() == null || yc.tongTienHang() < 0)
            throw new LoiNghiepVu(422, "Vui lòng nhập mã giảm giá.");
        Map<String, Object> kq = dv.tinhPhieu(yc.maCode(), yc.tongTienHang(), maNguoiDung(jwt), yc.email());
        return Map.of("hopLe", true, "maCode", kq.get("maCode"), "tienGiam", kq.get("tienGiam"));
    }

    @PostMapping("/don-hang")
    public ResponseEntity<Map<String, Object>> datHang(@RequestBody YeuCau.DatHang yc, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dv.datHang(yc, maNguoiDung(jwt)));
    }

    @GetMapping("/don-hang/tra-cuu")
    public Map<String, Object> traCuu(@RequestParam String ma, @RequestParam String email) {
        return dv.traCuuKhach(ma, email);
    }

    @PostMapping("/don-hang/tra-cuu/huy")
    public Map<String, Object> huyKhach(@RequestParam String ma, @RequestBody YeuCau.Huy yc) {
        return dv.khachHuy(ma.trim().toUpperCase(), yc.lyDo(), null, yc.email());
    }

    @GetMapping("/don-hang")
    public Map<String, Object> cuaToi(@AuthenticationPrincipal Jwt jwt,
                                      @RequestParam(defaultValue = "1") int trang,
                                      @RequestParam(defaultValue = "10") int kichThuoc) {
        return dv.danhSachCuaToi(batBuoc(jwt), trang, Math.max(1, Math.min(kichThuoc, 50)));
    }

    @GetMapping("/don-hang/{ma}")
    public Map<String, Object> chiTiet(@PathVariable String ma, @AuthenticationPrincipal Jwt jwt, Authentication xacThuc) {
        boolean quanTri = xacThuc != null && xacThuc.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_QuanTri"));
        return dv.chiTietChoNguoiDung(ma.toUpperCase(), batBuoc(jwt), quanTri);
    }

    @PostMapping("/don-hang/{ma}/huy")
    public Map<String, Object> huy(@PathVariable String ma, @RequestBody(required = false) YeuCau.Huy yc, @AuthenticationPrincipal Jwt jwt) {
        return dv.khachHuy(ma.toUpperCase(), yc == null ? null : yc.lyDo(), batBuoc(jwt), null);
    }

    @PostMapping("/don-hang/{ma}/doi-tra")
    public ResponseEntity<Map<String, Object>> doiTra(@PathVariable String ma, @RequestBody YeuCau.DoiTra yc, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dv.yeuCauDoiTra(ma.toUpperCase(), batBuoc(jwt), yc));
    }
}
