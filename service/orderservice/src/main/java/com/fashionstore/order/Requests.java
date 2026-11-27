package com.fashionstore.order;

import java.util.List;

/** Các bản ghi dữ liệu gửi lên từ giao diện. */
public final class Requests {
    private Requests() {
    }

    public record Dong(Integer maBienThe, Integer soLuong) {
    }

    public record DatHang(String email, String tenNguoiNhan, String soDienThoai, String diaChiGiao,
                          String maPhuongXa, String phuongXa, String maTinhThanh, String tinhThanh,
                          String phuongThuc, String maGiamGia, String ghiChu, List<Dong> dong) {
    }

    public record KiemTraPhieu(String maCode, Long tongTienHang, String email) {
    }

    public record Huy(String lyDo, String email) {
    }

    public record DongDoiTra(Integer maChiTietDon, Integer soLuong, Integer maBienTheMoi) {
    }

    public record DoiTra(String hinhThuc, String lyDo, List<DongDoiTra> dong) {
    }

    public record DoiTrangThai(String trangThai, String ghiChu, String donViVanChuyen, String maVanDon) {
    }

    public record GhiChuNoiBo(String ghiChu) {
    }

    public record PhieuGiamGia(String maCode, String moTa, String loaiGiam, Long giaTriGiam, Long giamToiDa,
                               Long donToiThieu, Integer soLuong, Integer gioiHanMoiNguoi,
                               String ngayBatDau, String ngayKetThuc, Boolean hoatDong, Boolean congKhai) {
    }

    public record DuyetDoiTra(String trangThai, String ghiChuAdmin, Long soTienHoan) {
    }

    public record DaThanhToan(Integer maThanhToan, Long soTien, String kenh) {
    }
}
