package main

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func phanTrang(c *gin.Context) (trang, kt, bd int) {
	trang, _ = strconv.Atoi(c.DefaultQuery("trang", "1"))
	kt, _ = strconv.Atoi(c.DefaultQuery("kichThuoc", "20"))
	if trang < 1 {
		trang = 1
	}
	if kt < 1 || kt > 100 {
		kt = 20
	}
	return trang, kt, (trang - 1) * kt
}

func thoatLike(s string) string {
	return strings.NewReplacer("[", "[[]", "%", "[%]", "_", "[_]").Replace(s)
}

func qtDsThanhToan(c *gin.Context) {
	trang, kt, bd := phanTrang(c)
	dk := "1 = 1"
	tham := []any{}
	them := func(cauLenh string, v any) {
		tham = append(tham, v)
		dk += " AND " + strings.ReplaceAll(cauLenh, "?", fmt.Sprintf("@p%d", len(tham)))
	}
	if v := c.Query("trangThai"); v != "" {
		them("TrangThai = ?", v)
	}
	if v := c.Query("kenh"); v != "" {
		them("KenhThanhToan = ?", v)
	}
	if v := strings.TrimSpace(c.Query("tuKhoa")); v != "" {
		them("(MaDonHienThi LIKE ? OR MaThanhToanNganHang LIKE ?)", "%"+thoatLike(v)+"%")
	}
	var tong int
	if err := db.QueryRowContext(c, "SELECT COUNT(*) FROM dbo.ThanhToan WHERE "+dk, tham...).Scan(&tong); err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	tham = append(tham, bd, kt)
	ds, err := truyVan(c, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE "+dk+
		fmt.Sprintf(" ORDER BY MaThanhToan DESC OFFSET @p%d ROWS FETCH NEXT @p%d ROWS ONLY", len(tham)-1, len(tham)), tham...)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(200, gin.H{"tong": tong, "trang": trang, "kichThuoc": kt, "danhSach": ds})
}

// qtXacNhan: quản trị xác nhận đã nhận tiền thủ công (ví dụ khách chuyển sai nội dung). Gọi lại an toàn (chỉ báo đơn lại).
func qtXacNhan(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		loi(c, 400, "Mã không hợp lệ.")
		return
	}
	var yc struct {
		GhiChu string `json:"ghiChu"`
	}
	_ = c.ShouldBindJSON(&yc)
	ds, err := truyVan(c, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaThanhToan = @p1", id)
	if err != nil || len(ds) == 0 {
		loi(c, 404, "Không tìm thấy giao dịch.")
		return
	}
	t := ds[0]
	trangThai := chuoi(t["trangThai"])
	if trangThai == "DaHoan" {
		loi(c, 409, "Giao dịch đã hoàn tiền.")
		return
	}
	nguoi, _ := c.Get("maQuanTri")
	if trangThai != "DaThanhToan" {
		ghiChu := strings.TrimSpace(yc.GhiChu)
		if ghiChu == "" {
			ghiChu = "Quản trị xác nhận đã nhận tiền"
		}
		if _, err := db.ExecContext(c, "UPDATE dbo.ThanhToan SET TrangThai = 'DaThanhToan', SoTienDaNhan = SoTien, NgayThanhToan = SYSUTCDATETIME(), NguoiXacNhan = @p2, GhiChu = @p3, NgayCapNhat = SYSUTCDATETIME() "+
			"WHERE MaThanhToan = @p1 AND TrangThai IN ('ChoThanhToan','HetHan','CanXuLy')", id, nguoi, cat(ghiChu, 500)); err != nil {
			loi(c, 500, "Lỗi hệ thống.")
			return
		}
	}
	soTien := soNguyen(t["soTien"])
	var kq string
	for lan := 0; lan < 3; lan++ {
		if kq = baoDonHang(c, soNguyen(t["maDonHang"]), id, soTien, chuoi(t["kenhThanhToan"])); kq != "loi" {
			break
		}
	}
	switch kq {
	case "ok":
		c.JSON(200, gin.H{"thongBao": "Đã xác nhận thanh toán và báo cho đơn hàng."})
	case "donDaHuy":
		_, _ = db.ExecContext(c, "UPDATE dbo.ThanhToan SET TrangThai = 'CanXuLy', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1", id)
		_ = taoYeuCauHoan(c, id, soTien, "Đơn đã hủy, cần hoàn tiền", nguoi)
		c.JSON(409, gin.H{"loi": "Đơn hàng đã bị hủy. Đã tạo yêu cầu hoàn tiền cho khách."})
	default:
		c.JSON(502, gin.H{"loi": "Đã ghi nhận tiền nhưng chưa báo được cho đơn hàng. Hãy bấm xác nhận lại sau ít phút."})
	}
}

func qtDsHoanTien(c *gin.Context) {
	trang, kt, bd := phanTrang(c)
	tt := c.Query("trangThai")
	ds, err := truyVan(c, "SELECT h.MaHoanTien, h.MaThanhToan, t.MaDonHang, t.MaDonHienThi, t.KenhThanhToan, h.SoTien, h.LyDo, h.TrangThai, h.PhuongThucHoan, h.MaThamChieu, h.NgayTao, h.NgayHoan "+
		"FROM dbo.HoanTien h JOIN dbo.ThanhToan t ON t.MaThanhToan = h.MaThanhToan WHERE (@p1 = '' OR h.TrangThai = @p1) ORDER BY h.MaHoanTien DESC OFFSET @p2 ROWS FETCH NEXT @p3 ROWS ONLY", tt, bd, kt)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(200, gin.H{"trang": trang, "kichThuoc": kt, "danhSach": ds})
}

func qtTaoHoanTien(c *gin.Context) {
	var yc struct {
		MaThanhToan int64  `json:"maThanhToan"`
		SoTien      int64  `json:"soTien"`
		LyDo        string `json:"lyDo"`
	}
	if err := c.ShouldBindJSON(&yc); err != nil || yc.MaThanhToan <= 0 || yc.SoTien <= 0 || len(strings.TrimSpace(yc.LyDo)) < 3 {
		loi(c, 400, "Vui lòng nhập số tiền và lý do.")
		return
	}
	var daNhan, daYeuCau int64
	var trangThai string
	if err := db.QueryRowContext(c, "SELECT TrangThai, SoTienDaNhan FROM dbo.ThanhToan WHERE MaThanhToan = @p1", yc.MaThanhToan).Scan(&trangThai, &daNhan); err != nil {
		loi(c, 404, "Không tìm thấy giao dịch.")
		return
	}
	if trangThai != "DaThanhToan" && trangThai != "CanXuLy" {
		loi(c, 409, "Chỉ hoàn tiền cho giao dịch đã nhận tiền.")
		return
	}
	_ = db.QueryRowContext(c, "SELECT ISNULL(SUM(SoTien), 0) FROM dbo.HoanTien WHERE MaThanhToan = @p1 AND TrangThai IN ('ChoXuLy','DaHoan')", yc.MaThanhToan).Scan(&daYeuCau)
	if yc.SoTien > daNhan-daYeuCau {
		loi(c, 409, fmt.Sprintf("Số tiền hoàn tối đa còn lại là %d đ.", daNhan-daYeuCau))
		return
	}
	nguoi, _ := c.Get("maQuanTri")
	var ma int64
	if err := db.QueryRowContext(c, "INSERT INTO dbo.HoanTien (MaThanhToan, SoTien, LyDo, NguoiThucHien) OUTPUT INSERTED.MaHoanTien VALUES (@p1, @p2, @p3, @p4)",
		yc.MaThanhToan, yc.SoTien, cat(strings.TrimSpace(yc.LyDo), 300), nguoi).Scan(&ma); err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(201, gin.H{"maHoanTien": ma})
}

// qtCapNhatHoanTien: sau khi quản trị đã chuyển khoản trả khách bên ngoài hệ thống, đánh dấu DaHoan (hoặc TuChoi).
func qtCapNhatHoanTien(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		loi(c, 400, "Mã không hợp lệ.")
		return
	}
	var yc struct {
		TrangThai      string `json:"trangThai"`
		PhuongThucHoan string `json:"phuongThucHoan"`
		MaThamChieu    string `json:"maThamChieu"`
	}
	if err := c.ShouldBindJSON(&yc); err != nil || (yc.TrangThai != "DaHoan" && yc.TrangThai != "TuChoi") {
		loi(c, 400, "Trạng thái phải là DaHoan hoặc TuChoi.")
		return
	}
	nguoi, _ := c.Get("maQuanTri")
	tx, err := db.BeginTx(c, nil)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	defer tx.Rollback()
	var maTT int64
	err = tx.QueryRowContext(c, "UPDATE dbo.HoanTien SET TrangThai = @p2, PhuongThucHoan = @p3, MaThamChieu = @p4, NguoiThucHien = @p5, NgayHoan = CASE WHEN @p2 = 'DaHoan' THEN SYSUTCDATETIME() ELSE NULL END "+
		"OUTPUT INSERTED.MaThanhToan WHERE MaHoanTien = @p1 AND TrangThai = 'ChoXuLy'",
		id, yc.TrangThai, cat(yc.PhuongThucHoan, 100), cat(yc.MaThamChieu, 64), nguoi).Scan(&maTT)
	if err != nil {
		loi(c, 409, "Yêu cầu không tồn tại hoặc đã được xử lý.")
		return
	}
	if yc.TrangThai == "DaHoan" {
		if _, err := tx.ExecContext(c, "UPDATE dbo.ThanhToan SET TrangThai = 'DaHoan', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai IN ('DaThanhToan','CanXuLy') "+
			"AND SoTienDaNhan <= (SELECT ISNULL(SUM(SoTien), 0) FROM dbo.HoanTien WHERE MaThanhToan = @p1 AND TrangThai = 'DaHoan')", maTT); err != nil {
			loi(c, 500, "Lỗi hệ thống.")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(200, gin.H{"thongBao": "Đã cập nhật hoàn tiền."})
}

func qtDsGiaoDichCong(c *gin.Context) {
	trang, kt, bd := phanTrang(c)
	kq := c.Query("ketQua")
	ds, err := truyVan(c, "SELECT MaGiaoDichCong, MaThanhToan, Nguon, MaGiaoDichNgoai, NganHang, MaThamChieuNganHang, SoTien, NoiDung, KetQuaXuLy, NgayGiaoDich, NgayNhan "+
		"FROM dbo.GiaoDichCong WHERE (@p1 = '' OR KetQuaXuLy = @p1) ORDER BY MaGiaoDichCong DESC OFFSET @p2 ROWS FETCH NEXT @p3 ROWS ONLY", kq, bd, kt)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(200, gin.H{"trang": trang, "kichThuoc": kt, "danhSach": ds})
}
