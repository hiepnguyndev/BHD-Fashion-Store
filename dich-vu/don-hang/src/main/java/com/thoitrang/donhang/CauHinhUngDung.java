package com.thoitrang.donhang;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ung-dung")
public record CauHinhUngDung(
        String khoaNoiBo,
        String thuMucKhoa,
        String sanPhamUrl,
        String thanhToanUrl,
        String thongBaoUrl,
        String webUrl,
        String tenCuaHang,
        long phiVanChuyen,
        long mienPhiVanChuyenTu,
        int hanThanhToanPhut,
        int soNgayDoiTra) {
}
