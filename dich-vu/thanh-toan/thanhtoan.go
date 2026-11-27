package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var reMaThanhToan = regexp.MustCompile(`^[A-Z0-9]{6,40}$`)

type yeuCauTao struct {
	MaDonHang    int     `json:"maDonHang"`
	MaDonHienThi string  `json:"maDonHienThi"`
	Kenh         string  `json:"kenh"`
	SoTien       int64   `json:"soTien"`
	Email        string  `json:"email"`
	HetHanLuc    *string `json:"hetHanLuc"`
}

const cotThanhToan = "MaThanhToan, MaDonHang, MaDonHienThi, KenhThanhToan, MaThanhToanNganHang, SoTien, SoTienDaNhan, TrangThai, HetHanLuc, NgayThanhToan, GhiChu, NgayTao"

// huongDan sinh thông tin để khách thanh toán (chỉ khi còn chờ thanh toán).
func huongDan(t map[string]any) map[string]any {
	if chuoi(t["trangThai"]) != "ChoThanhToan" {
		return nil
	}
	soTien := soNguyen(t["soTien"])
	ma := chuoi(t["maThanhToanNganHang"])
	switch chuoi(t["kenhThanhToan"]) {
	case "COD":
		return map[string]any{"ghiChu": "Thanh toán tiền mặt cho nhân viên giao hàng khi nhận hàng."}
	case "VietQR":
		return map[string]any{
			"nganHang":       ch.nganHangTen,
			"soTaiKhoan":     ch.soTaiKhoan,
			"tenChuTaiKhoan": ch.tenChuTK,
			"soTien":         soTien,
			"noiDung":        ma,
			"qrPayload":      taoVietQR(ch.nganHangBIN, ch.soTaiKhoan, soTien, ma),
			"luuY":           "Nhập đúng nội dung chuyển khoản để hệ thống tự xác nhận. Không sửa số tiền.",
		}
	case "SePayGateway":
		return map[string]any{"gateway": bieuMauSePay(t)}
	}
	return nil
}

func dto(t map[string]any) map[string]any {
	out := map[string]any{
		"maThanhToan":         t["maThanhToan"],
		"maDonHienThi":        t["maDonHienThi"],
		"kenh":                t["kenhThanhToan"],
		"maThanhToanNganHang": t["maThanhToanNganHang"],
		"soTien":              t["soTien"],
		"trangThai":           t["trangThai"],
		"hetHanLuc":           t["hetHanLuc"],
	}
	if h := huongDan(t); h != nil {
		out["huongDan"] = h
	}
	return out
}

func taoThanhToan(c *gin.Context) {
	var yc yeuCauTao
	if err := c.ShouldBindJSON(&yc); err != nil || yc.MaDonHang <= 0 || yc.MaDonHienThi == "" || yc.SoTien < 0 {
		loi(c, 400, "Dữ liệu tạo thanh toán không hợp lệ.")
		return
	}
	if yc.Kenh != "COD" && yc.Kenh != "VietQR" && yc.Kenh != "SePayGateway" {
		loi(c, 400, "Kênh thanh toán không hợp lệ.")
		return
	}
	if yc.Kenh == "VietQR" && (ch.nganHangBIN == "" || ch.soTaiKhoan == "") {
		loi(c, 503, "Cửa hàng chưa cấu hình tài khoản ngân hàng nhận tiền.")
		return
	}
	if yc.Kenh == "SePayGateway" && (ch.sepayMerchant == "" || ch.sepaySecret == "") {
		loi(c, 503, "Cửa hàng chưa cấu hình cổng thanh toán SePay.")
		return
	}
	ctx := c.Request.Context()
	// idempotent: tạo lại cho cùng đơn thì trả bản đang có
	if ds, err := truyVan(ctx, "SELECT TOP 1 "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaDonHang = @p1 AND TrangThai IN ('ChoThanhToan','DaThanhToan') ORDER BY MaThanhToan DESC", yc.MaDonHang); err == nil && len(ds) > 0 {
		c.JSON(200, dto(ds[0]))
		return
	} else if err != nil {
		log.Printf("tạo thanh toán: %v", err)
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	var het any
	if yc.HetHanLuc != nil && *yc.HetHanLuc != "" {
		t, err := time.Parse(time.RFC3339, *yc.HetHanLuc)
		if err != nil {
			loi(c, 400, "Thời hạn không hợp lệ.")
			return
		}
		het = t.UTC()
	}
	var ma any
	var err error
	for lan := 0; lan < 6; lan++ {
		if yc.Kenh != "COD" {
			ma = ch.tienToMa + ngauNhien(10)
		}
		_, err = db.ExecContext(ctx, "INSERT INTO dbo.ThanhToan (MaDonHang, MaDonHienThi, KenhThanhToan, MaThanhToanNganHang, SoTien, HetHanLuc) VALUES (@p1, @p2, @p3, @p4, @p5, @p6)",
			yc.MaDonHang, yc.MaDonHienThi, yc.Kenh, ma, yc.SoTien, het)
		if err == nil || !laTrung(err) {
			break
		}
	}
	if err != nil {
		log.Printf("tạo thanh toán: %v", err)
		loi(c, 500, "Không tạo được thanh toán.")
		return
	}
	ds, err := truyVan(ctx, "SELECT TOP 1 "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaDonHang = @p1 ORDER BY MaThanhToan DESC", yc.MaDonHang)
	if err != nil || len(ds) == 0 {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	c.JSON(200, dto(ds[0]))
}

func thanhToanCuaDon(c *gin.Context) {
	ds, err := truyVan(c.Request.Context(), "SELECT TOP 1 "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaDonHang = @p1 ORDER BY MaThanhToan DESC", c.Param("id"))
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	if len(ds) == 0 {
		loi(c, 404, "Chưa có thanh toán cho đơn này.")
		return
	}
	c.JSON(200, dto(ds[0]))
}

// huyThanhToan: đơn bị hủy. Chưa trả tiền -> HetHan. Đã trả tiền online -> tạo yêu cầu hoàn tiền cho quản trị.
func huyThanhToan(c *gin.Context) {
	var yc struct {
		MaDonHang int `json:"maDonHang"`
	}
	if err := c.ShouldBindJSON(&yc); err != nil || yc.MaDonHang <= 0 {
		loi(c, 400, "Dữ liệu không hợp lệ.")
		return
	}
	ctx := c.Request.Context()
	ds, err := truyVan(ctx, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaDonHang = @p1", yc.MaDonHang)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	for _, t := range ds {
		id := soNguyen(t["maThanhToan"])
		switch chuoi(t["trangThai"]) {
		case "ChoThanhToan":
			if _, err := db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'HetHan', GhiChu = N'Đơn hàng đã hủy', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai = 'ChoThanhToan'", id); err != nil {
				loi(c, 500, "Lỗi hệ thống.")
				return
			}
			if chuoi(t["kenhThanhToan"]) == "SePayGateway" {
				go huyDonSePay(chuoi(t["maThanhToanNganHang"]))
			}
		case "DaThanhToan":
			if chuoi(t["kenhThanhToan"]) != "COD" {
				if err := taoYeuCauHoan(ctx, id, soNguyen(t["soTienDaNhan"]), "Hủy đơn đã thanh toán", nil); err != nil {
					loi(c, 500, "Lỗi hệ thống.")
					return
				}
			}
		}
	}
	c.JSON(200, gin.H{"thongBao": "OK"})
}

// taoYeuCauHoan tạo yêu cầu hoàn tiền chờ xử lý nếu chưa có yêu cầu đang chờ cho giao dịch này.
func taoYeuCauHoan(ctx context.Context, maThanhToan, soTien int64, lyDo string, nguoi any) error {
	if soTien <= 0 {
		return nil
	}
	_, err := db.ExecContext(ctx, "IF NOT EXISTS (SELECT 1 FROM dbo.HoanTien WHERE MaThanhToan = @p1 AND TrangThai = 'ChoXuLy') "+
		"INSERT INTO dbo.HoanTien (MaThanhToan, SoTien, LyDo, NguoiThucHien) VALUES (@p1, @p2, @p3, @p4)", maThanhToan, soTien, lyDo, nguoi)
	return err
}

func codDaThu(c *gin.Context) {
	var yc struct {
		MaDonHang int `json:"maDonHang"`
	}
	if err := c.ShouldBindJSON(&yc); err != nil || yc.MaDonHang <= 0 {
		loi(c, 400, "Dữ liệu không hợp lệ.")
		return
	}
	kq, err := db.ExecContext(c.Request.Context(),
		"UPDATE dbo.ThanhToan SET TrangThai = 'DaThanhToan', SoTienDaNhan = SoTien, NgayThanhToan = SYSUTCDATETIME(), NgayCapNhat = SYSUTCDATETIME() "+
			"WHERE MaDonHang = @p1 AND KenhThanhToan = 'COD' AND TrangThai = 'ChoThanhToan'", yc.MaDonHang)
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	if n, _ := kq.RowsAffected(); n == 0 {
		var dem int
		_ = db.QueryRowContext(c.Request.Context(), "SELECT COUNT(*) FROM dbo.ThanhToan WHERE MaDonHang = @p1 AND KenhThanhToan = 'COD' AND TrangThai = 'DaThanhToan'", yc.MaDonHang).Scan(&dem)
		if dem == 0 {
			loi(c, 404, "Không có khoản COD chờ thu cho đơn này.")
			return
		}
	}
	c.JSON(200, gin.H{"thongBao": "OK"})
}

// trangThaiCongKhai: giao diện hỏi định kỳ khi khách đang ở trang thanh toán. Mã thanh toán là chuỗi ngẫu nhiên khó đoán.
func trangThaiCongKhai(c *gin.Context) {
	ma := strings.ToUpper(strings.TrimSpace(c.Query("ma")))
	if !reMaThanhToan.MatchString(ma) {
		loi(c, 400, "Mã thanh toán không hợp lệ.")
		return
	}
	ctx := c.Request.Context()
	lay := func() (map[string]any, error) {
		ds, err := truyVan(ctx, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaThanhToanNganHang = @p1", ma)
		if err != nil || len(ds) == 0 {
			return nil, err
		}
		return ds[0], nil
	}
	t, err := lay()
	if err != nil {
		loi(c, 500, "Lỗi hệ thống.")
		return
	}
	if t == nil {
		loi(c, 404, "Không tìm thấy giao dịch.")
		return
	}
	if chuoi(t["kenhThanhToan"]) == "SePayGateway" && chuoi(t["trangThai"]) == "ChoThanhToan" {
		if lamMoiTuSePay(ctx, t, "DoiSoat", false) {
			if t2, err := lay(); err == nil && t2 != nil {
				t = t2
			}
		}
	}
	trangThai := chuoi(t["trangThai"])
	if trangThai == "ChoThanhToan" {
		if het, err := time.Parse(time.RFC3339, chuoi(t["hetHanLuc"])); err == nil && time.Now().After(het) {
			trangThai = "HetHan"
		}
	}
	c.JSON(200, gin.H{
		"trangThai": trangThai, "kenh": t["kenhThanhToan"], "soTien": t["soTien"],
		"hetHanLuc": t["hetHanLuc"], "maDonHienThi": t["maDonHienThi"],
	})
}

// baoDonHang báo cho OrderService biết đã nhận tiền. Trả về: "ok" | "donDaHuy" | "loi".
func baoDonHang(ctx context.Context, maDonHang, maThanhToan, soTien int64, kenh string) string {
	body, _ := json.Marshal(map[string]any{"maThanhToan": maThanhToan, "soTien": soTien, "kenh": kenh})
	ctx, huy := context.WithTimeout(ctx, 15*time.Second)
	defer huy()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/noi-bo/don-hang/%d/da-thanh-toan", ch.donHangURL, maDonHang), bytes.NewReader(body))
	if err != nil {
		return "loi"
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Khoa-Noi-Bo", ch.khoaNoiBo)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("báo đơn %d lỗi: %v", maDonHang, err)
		return "loi"
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Printf("báo đơn %d: HTTP %d", maDonHang, resp.StatusCode)
		return "loi"
	}
	var kq struct {
		KetQua string `json:"ketQua"`
	}
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if json.Unmarshal(b, &kq) != nil {
		return "loi"
	}
	if kq.KetQua == "donDaHuy" {
		return "donDaHuy"
	}
	return "ok"
}

var _ = sql.ErrNoRows
