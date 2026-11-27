package com.thoitrang.donhang;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API cho quản trị viên (đã được BaoMat chặn: chỉ vai trò QuanTri). */
@RestController
@RequestMapping("/api/quan-tri")
public class QuanTriController {
    private final DonHangService dv;

    public QuanTriController(DonHangService dv) {
        this.dv = dv;
    }

    @GetMapping("/don-hang")
    public Map<String, Object> danhSach(@RequestParam(required = false) String trangThai,
                                        @RequestParam(required = false) String tuKhoa,
                                        @RequestParam(defaultValue = "1") int trang,
                                        @RequestParam(defaultValue = "20") int kichThuoc) {
        return dv.quanTriDanhSach(trangThai, tuKhoa, trang, Math.max(1, Math.min(kichThuoc, 100)));
    }

    @GetMapping("/don-hang/{ma}")
    public Map<String, Object> chiTiet(@PathVariable String ma) {
        // quản trị được xem cả ghi chú nội bộ và thông tin thanh toán
        return dv.chiTietChoNguoiDung(ma.toUpperCase(), 0, true);
    }

    @PatchMapping("/don-hang/{ma}/trang-thai")
    public Map<String, Object> doiTrangThai(@PathVariable String ma, @RequestBody YeuCau.DoiTrangThai yc, @AuthenticationPrincipal Jwt jwt) {
        return dv.quanTriDoiTrangThai(ma.toUpperCase(), yc, Integer.parseInt(jwt.getSubject()));
    }

    @PatchMapping("/don-hang/{ma}/ghi-chu")
    public Map<String, String> ghiChu(@PathVariable String ma, @RequestBody YeuCau.GhiChuNoiBo yc) {
        dv.quanTriGhiChu(ma.toUpperCase(), yc.ghiChu());
        return Map.of("thongBao", "Đã lưu ghi chú.");
    }

    @GetMapping("/thong-ke")
    public Map<String, Object> thongKe() {
        return dv.thongKe();
    }

    @GetMapping("/phieu-giam-gia")
    public List<Map<String, Object>> dsPhieu() {
        return dv.quanTriDsPhieu();
    }

    @PostMapping("/phieu-giam-gia")
    public ResponseEntity<Map<String, Object>> taoPhieu(@RequestBody YeuCau.PhieuGiamGia yc) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dv.quanTriTaoPhieu(yc));
    }

    @PutMapping("/phieu-giam-gia/{ma}")
    public Map<String, String> suaPhieu(@PathVariable int ma, @RequestBody YeuCau.PhieuGiamGia yc) {
        dv.quanTriSuaPhieu(ma, yc);
        return Map.of("thongBao", "Đã cập nhật phiếu.");
    }

    @GetMapping("/doi-tra")
    public Map<String, Object> dsDoiTra(@RequestParam(required = false) String trangThai) {
        return dv.quanTriDanhSachDoiTra(trangThai);
    }

    @PatchMapping("/doi-tra/{ma}")
    public Map<String, Object> duyetDoiTra(@PathVariable int ma, @RequestBody YeuCau.DuyetDoiTra yc) {
        return dv.quanTriDuyetDoiTra(ma, yc);
    }
}
