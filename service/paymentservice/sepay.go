package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func urlSePay() (checkout, api string) {
	if ch.sepayMoiTruong == "production" {
		return "https://pay.sepay.vn/v1/checkout/init", "https://pgapi.sepay.vn"
	}
	return "https://pay-sandbox.sepay.vn/v1/checkout/init", "https://pgapi-sandbox.sepay.vn"
}

// ---------------------------------------------------------------- cổng thanh toán SePay (biểu mẫu có chữ ký)
var truongKy = []string{"order_amount", "merchant", "currency", "operation", "order_description",
	"order_invoice_number", "customer_id", "payment_method", "success_url", "error_url", "cancel_url"}

func kyBieuMau(truong map[string]string, khoaBiMat string) string {
	phan := []string{}
	for _, k := range truongKy {
		if v := truong[k]; v != "" && v != "0" {
			phan = append(phan, k+"="+v)
		}
	}
	mac := hmac.New(sha256.New, []byte(khoaBiMat))
	mac.Write([]byte(strings.Join(phan, ",")))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// bieuMauSePay dựng địa chỉ + các trường ẩn để trình duyệt POST sang trang thanh toán của SePay.
func bieuMauSePay(t map[string]any) map[string]any {
	checkout, _ := urlSePay()
	ma := chuoi(t["maThanhToanNganHang"])
	truong := map[string]string{
		"order_amount":         strconv.FormatInt(soNguyen(t["soTien"]), 10),
		"merchant":             ch.sepayMerchant,
		"currency":             "VND",
		"operation":            "PURCHASE",
		"order_description":    "Thanh toan don hang " + chuoi(t["maDonHienThi"]),
		"order_invoice_number": ma,
		"success_url":          ch.webURL + "/payment/result?ma=" + ma + "&kq=thanhcong",
		"error_url":            ch.webURL + "/payment/result?ma=" + ma + "&kq=loi",
		"cancel_url":           ch.webURL + "/payment/result?ma=" + ma + "&kq=huy",
	}
	truong["signature"] = kyBieuMau(truong, ch.sepaySecret)
	thuTu := append(append([]string{}, truongKy...), "signature")
	ds := []map[string]string{}
	for _, k := range thuTu {
		if v, ok := truong[k]; ok && v != "" {
			ds = append(ds, map[string]string{"ten": k, "giaTri": v})
		}
	}
	return map[string]any{"action": checkout, "truong": ds}
}

func timKhoa(v any, khoa string, sau int) any {
	if sau > 5 {
		return nil
	}
	if m, ok := v.(map[string]any); ok {
		if x, co := m[khoa]; co {
			return x
		}
		for _, con := range m {
			if kq := timKhoa(con, khoa, sau+1); kq != nil {
				return kq
			}
		}
	}
	return nil
}

// xacMinhDonSePay hỏi SePay trạng thái đơn theo mã hóa đơn: nguồn sự thật, không tin dữ liệu IPN gửi tới.
func xacMinhDonSePay(ctx context.Context, hoaDon string) (trangThai string, soTien int64, tho string, err error) {
	_, api := urlSePay()
	ctx, huy := context.WithTimeout(ctx, 10*time.Second)
	defer huy()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, api+"/v1/order/detail/"+hoaDon, nil)
	if err != nil {
		return "", 0, "", err
	}
	req.SetBasicAuth(ch.sepayMerchant, ch.sepaySecret)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", 0, "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<17))
	if resp.StatusCode == http.StatusNotFound {
		return "KHONG_CO", 0, string(b), nil // khách chưa mở trang thanh toán
	}
	if resp.StatusCode != 200 {
		return "", 0, string(b), fmt.Errorf("SePay trả HTTP %d", resp.StatusCode)
	}
	var du any
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	if err := dec.Decode(&du); err != nil {
		return "", 0, string(b), err
	}
	trangThai, _ = timKhoa(du, "order_status", 0).(string)
	switch x := timKhoa(du, "order_amount", 0).(type) {
	case json.Number:
		f, _ := x.Float64()
		soTien = int64(math.Round(f))
	case string:
		f, _ := strconv.ParseFloat(x, 64)
		soTien = int64(math.Round(f))
	}
	return trangThai, soTien, string(b), nil
}

func huyDonSePay(hoaDon string) {
	if ch.sepayMerchant == "" || hoaDon == "" {
		return
	}
	_, api := urlSePay()
	body, _ := json.Marshal(map[string]string{"order_invoice_number": hoaDon})
	ctx, huy := context.WithTimeout(context.Background(), 10*time.Second)
	defer huy()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, api+"/v1/order/cancel", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.SetBasicAuth(ch.sepayMerchant, ch.sepaySecret)
	req.Header.Set("Content-Type", "application/json")
	if resp, err := http.DefaultClient.Do(req); err == nil {
		resp.Body.Close()
	}
}

var (
	khoaLamMoi  sync.Mutex
	lanLamMoiCu = map[int64]time.Time{}
)

// lamMoiTuSePay kiểm tra một giao dịch cổng SePay; trả true nếu vừa ghi nhận thanh toán.
func lamMoiTuSePay(ctx context.Context, t map[string]any, nguon string, ep bool) bool {
	if ch.sepayMerchant == "" || ch.sepaySecret == "" {
		return false
	}
	id := soNguyen(t["maThanhToan"])
	if !ep {
		khoaLamMoi.Lock()
		if time.Since(lanLamMoiCu[id]) < 6*time.Second {
			khoaLamMoi.Unlock()
			return false
		}
		lanLamMoiCu[id] = time.Now()
		if len(lanLamMoiCu) > 5000 {
			lanLamMoiCu = map[int64]time.Time{}
		}
		khoaLamMoi.Unlock()
	}
	hoaDon := chuoi(t["maThanhToanNganHang"])
	trangThai, soTien, tho, err := xacMinhDonSePay(ctx, hoaDon)
	if err != nil {
		log.Printf("đối soát SePay %s: %v", hoaDon, err)
		return false
	}
	if trangThai != "CAPTURED" || soTien != soNguyen(t["soTien"]) {
		return false
	}
	kq, err := xuLyTienVao(ctx, tienVao{
		Nguon: "DoiSoat", MaNgoai: "PG:" + hoaDon, NganHang: "SePayGateway", MaThamChieu: hoaDon,
		NoiDung: "SePay " + hoaDon, SoTien: soTien, Tho: tho, MaThanhToanBiet: id,
	})
	if err != nil {
		log.Printf("ghi nhận SePay %s: %v", hoaDon, err)
	}
	return kq == "ThanhCong"
}

func ipnSePay(c *gin.Context) {
	b, _ := io.ReadAll(io.LimitReader(c.Request.Body, 1<<16))
	var du any
	if err := json.Unmarshal(b, &du); err != nil {
		c.JSON(200, gin.H{"success": true})
		return
	}
	hoaDon, _ := timKhoa(du, "order_invoice_number", 0).(string)
	hoaDon = strings.ToUpper(strings.TrimSpace(hoaDon))
	// IPN chỉ là tín hiệu "hãy kiểm tra": mọi quyết định dựa trên API tra cứu có xác thực
	if reMaThanhToan.MatchString(hoaDon) {
		if ds, err := truyVan(c.Request.Context(), "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaThanhToanNganHang = @p1 AND KenhThanhToan = 'SePayGateway'", hoaDon); err == nil && len(ds) > 0 {
			lamMoiTuSePay(c.Request.Context(), ds[0], "DoiSoat", true)
		}
	}
	c.JSON(200, gin.H{"success": true})
}

// ---------------------------------------------------------------- webhook giao dịch ngân hàng
func muiGioVN() *time.Location {
	if l, err := time.LoadLocation("Asia/Ho_Chi_Minh"); err == nil {
		return l
	}
	return time.FixedZone("ICT", 7*3600)
}

// xacThucHMACSePay kiểm tra chữ ký webhook và chống phát lại (lệch giờ tối đa 5 phút).
func xacThucHMACSePay(timestamp, chuKy string, body []byte, secret string, now time.Time) bool {
	ts, err := strconv.ParseInt(strings.TrimSpace(timestamp), 10, 64)
	if err != nil {
		return false
	}
	if d := now.Unix() - ts; d > 300 || d < -300 {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strings.TrimSpace(timestamp) + "."))
	mac.Write(body)
	mong := "sha256=" + fmt.Sprintf("%x", mac.Sum(nil))
	return subtle.ConstantTimeCompare([]byte(strings.TrimSpace(chuKy)), []byte(mong)) == 1
}

func webhookSePay(c *gin.Context) {
	if ch.sepayWebhookSecret == "" && ch.sepayWebhookKey == "" {
		loi(c, 503, "Chưa cấu hình xác thực webhook.")
		return
	}
	b, _ := io.ReadAll(io.LimitReader(c.Request.Body, 1<<16))
	if ch.sepayWebhookSecret != "" {
		// HMAC-SHA256: X-SePay-Signature = "sha256=" + hex(HMAC(secret, timestamp + "." + thân_gốc))
		if !xacThucHMACSePay(c.GetHeader("X-SePay-Timestamp"), c.GetHeader("X-SePay-Signature"), b, ch.sepayWebhookSecret, time.Now()) {
			loi(c, 401, "Không được phép.")
			return
		}
	} else if subtle.ConstantTimeCompare([]byte(c.GetHeader("Authorization")), []byte("Apikey "+ch.sepayWebhookKey)) != 1 {
		loi(c, 401, "Không được phép.")
		return
	}
	var w struct {
		ID              json.Number `json:"id"`
		Gateway         string      `json:"gateway"`
		TransactionDate string      `json:"transactionDate"`
		AccountNumber   string      `json:"accountNumber"`
		SubAccount      string      `json:"subAccount"`
		Content         string      `json:"content"`
		TransferType    string      `json:"transferType"`
		TransferAmount  json.Number `json:"transferAmount"`
		ReferenceCode   string      `json:"referenceCode"`
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	if err := dec.Decode(&w); err != nil || w.ID.String() == "" {
		loi(c, 400, "Dữ liệu không hợp lệ.")
		return
	}
	if !strings.EqualFold(w.TransferType, "in") {
		c.JSON(200, gin.H{"success": true, "ketQua": "BoQuaTienRa"})
		return
	}
	f, _ := w.TransferAmount.Float64()
	var ngay *time.Time
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", w.TransactionDate, muiGioVN()); err == nil {
		u := t.UTC()
		ngay = &u
	}
	kq, err := xuLyTienVao(c.Request.Context(), tienVao{
		Nguon: "Webhook", MaNgoai: w.ID.String(), NganHang: w.Gateway, MaThamChieu: w.ReferenceCode,
		NoiDung: w.Content, SoTien: int64(math.Round(f)), NgayGD: ngay, Tho: string(b), SoTaiKhoan: w.AccountNumber, SoTaiKhoanPhu: w.SubAccount,
	})
	if err != nil {
		log.Printf("webhook %s lỗi: %v", w.ID.String(), err)
		loi(c, 500, "Lỗi xử lý, vui lòng gửi lại.") // SePay sẽ gửi lại
		return
	}
	c.JSON(200, gin.H{"success": true, "ketQua": kq})
}

type tienVao struct {
	Nguon, MaNgoai, NganHang, MaThamChieu, NoiDung, Tho, SoTaiKhoan, SoTaiKhoanPhu string
	SoTien                                                          int64
	NgayGD                                                          *time.Time
	MaThanhToanBiet                                                 int64
}

func timMaThanhToan(noiDung string) []string {
	var sb strings.Builder
	for _, r := range strings.ToUpper(noiDung) {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
		}
	}
	re := regexp.MustCompile(regexp.QuoteMeta(ch.tienToMa) + "[" + bangKyTu + "]{10}")
	return re.FindAllString(sb.String(), -1)
}

func capNhatNhatKy(ctx context.Context, logID int64, maThanhToan any, ketQua string) {
	if _, err := db.ExecContext(ctx, "UPDATE dbo.GiaoDichCong SET MaThanhToan = COALESCE(@p2, MaThanhToan), KetQuaXuLy = @p3 WHERE MaGiaoDichCong = @p1", logID, maThanhToan, ketQua); err != nil {
		log.Printf("cập nhật nhật ký cổng %d: %v", logID, err)
	}
}

// xuLyTienVao ghi nhận một khoản tiền vào. Idempotent theo (Nguon, MaNgoai): gọi lại nhiều lần vẫn an toàn.
// Trả về KetQuaXuLy; lỗi != nil nghĩa là chưa xử lý xong và nên thử lại.
func xuLyTienVao(ctx context.Context, t tienVao) (string, error) {
	var ngay any
	if t.NgayGD != nil {
		ngay = *t.NgayGD
	}
	var logID int64
	var maTTLog sql.NullInt64
	err := db.QueryRowContext(ctx,
		"INSERT INTO dbo.GiaoDichCong (Nguon, MaGiaoDichNgoai, NganHang, MaThamChieuNganHang, SoTien, NoiDung, DuLieuTho, ChuKyHopLe, KetQuaXuLy, NgayGiaoDich) "+
			"OUTPUT INSERTED.MaGiaoDichCong VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, 1, 'Loi', @p8)",
		t.Nguon, t.MaNgoai, cat(t.NganHang, 50), cat(t.MaThamChieu, 64), t.SoTien, cat(t.NoiDung, 500), t.Tho, ngay).Scan(&logID)
	if err != nil {
		if !laTrung(err) {
			return "", err
		}
		var ketQua string
		if err := db.QueryRowContext(ctx, "SELECT MaGiaoDichCong, KetQuaXuLy, MaThanhToan FROM dbo.GiaoDichCong WHERE Nguon = @p1 AND MaGiaoDichNgoai = @p2 AND ChuKyHopLe = 1",
			t.Nguon, t.MaNgoai).Scan(&logID, &ketQua, &maTTLog); err != nil {
			return "", err
		}
		if ketQua != "Loi" {
			return "BoQuaTrung", nil // đã xử lý xong ở lần trước
		}
	}

	// tìm khoản thanh toán tương ứng
	var tt map[string]any
	if t.MaThanhToanBiet > 0 {
		ds, err := truyVan(ctx, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaThanhToan = @p1", t.MaThanhToanBiet)
		if err != nil {
			return "", err
		}
		if len(ds) > 0 {
			tt = ds[0]
		}
	} else if (t.SoTaiKhoan == "" && t.SoTaiKhoanPhu == "") || ch.soTaiKhoan == "" || strings.TrimSpace(t.SoTaiKhoan) == ch.soTaiKhoan || strings.TrimSpace(t.SoTaiKhoanPhu) == ch.soTaiKhoan {
		for _, ma := range timMaThanhToan(t.NoiDung) {
			ds, err := truyVan(ctx, "SELECT "+cotThanhToan+" FROM dbo.ThanhToan WHERE MaThanhToanNganHang = @p1", ma)
			if err != nil {
				return "", err
			}
			if len(ds) > 0 {
				tt = ds[0]
				break
			}
		}
	}
	if tt == nil {
		capNhatNhatKy(ctx, logID, nil, "KhongKhopMa")
		return "KhongKhopMa", nil
	}

	id, donID := soNguyen(tt["maThanhToan"]), soNguyen(tt["maDonHang"])
	kenh, trangThai, soCan := chuoi(tt["kenhThanhToan"]), chuoi(tt["trangThai"]), soNguyen(tt["soTien"])
	capNhatNhatKy(ctx, logID, id, "Loi") // ghi dấu: khoản này đã gắn với thanh toán nào

	hoanTat := func() (string, error) {
		switch baoDonHang(ctx, donID, id, t.SoTien, kenh) {
		case "ok":
			capNhatNhatKy(ctx, logID, id, "ThanhCong")
			return "ThanhCong", nil
		case "donDaHuy":
			if _, err := db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'CanXuLy', GhiChu = N'Tiền về sau khi đơn đã hủy — cần hoàn tiền cho khách', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai = 'DaThanhToan'", id); err != nil {
				return "", err
			}
			if err := taoYeuCauHoan(ctx, id, t.SoTien, "Tiền về sau khi đơn đã hủy", nil); err != nil {
				return "", err
			}
			capNhatNhatKy(ctx, logID, id, "HetHan")
			return "HetHan", nil
		}
		return "", fmt.Errorf("chưa báo được đơn %d", donID)
	}

	switch {
	case trangThai == "DaThanhToan":
		if maTTLog.Valid && maTTLog.Int64 == id {
			return hoanTat() // lần thử trước của chính khoản này dừng giữa chừng: chỉ báo đơn lại
		}
		if err := taoYeuCauHoan(ctx, id, t.SoTien, "Thanh toán trùng (đơn đã được thanh toán trước đó)", nil); err != nil {
			return "", err
		}
		capNhatNhatKy(ctx, logID, id, "BoQuaTrung")
		return "BoQuaTrung", nil
	case t.SoTien != soCan:
		if _, err := db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'CanXuLy', SoTienDaNhan = @p2, GhiChu = @p3, NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai IN ('ChoThanhToan','HetHan','CanXuLy')",
			id, t.SoTien, fmt.Sprintf("Nhận %d đ nhưng đơn cần %d đ — kiểm tra và xử lý thủ công", t.SoTien, soCan)); err != nil {
			return "", err
		}
		capNhatNhatKy(ctx, logID, id, "SaiSoTien")
		return "SaiSoTien", nil
	case trangThai == "ChoThanhToan":
		var moc any = time.Now().UTC()
		if t.NgayGD != nil {
			moc = *t.NgayGD
		}
		kq, err := db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'DaThanhToan', SoTienDaNhan = @p2, NgayThanhToan = @p3, NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai = 'ChoThanhToan'", id, t.SoTien, moc)
		if err != nil {
			return "", err
		}
		if n, _ := kq.RowsAffected(); n == 0 {
			return "", fmt.Errorf("thanh toán %d vừa đổi trạng thái, thử lại", id)
		}
		return hoanTat()
	default: // HetHan, CanXuLy, DaHoan: tiền về muộn
		if _, err := db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'CanXuLy', SoTienDaNhan = @p2, GhiChu = N'Tiền về sau khi hết hạn thanh toán — cần hoàn tiền hoặc xác nhận thủ công', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai IN ('HetHan','CanXuLy')", id, t.SoTien); err != nil {
			return "", err
		}
		if err := taoYeuCauHoan(ctx, id, t.SoTien, "Tiền về sau khi hết hạn thanh toán", nil); err != nil {
			return "", err
		}
		capNhatNhatKy(ctx, logID, id, "HetHan")
		return "HetHan", nil
	}
}

func cat(s string, toiDa int) string {
	if len(s) <= toiDa {
		return s
	}
	r := []rune(s)
	if len(r) <= toiDa {
		return s
	}
	return string(r[:toiDa])
}

// doiSoatDinhKy: mỗi phút (1) hỏi SePay về các giao dịch cổng còn chờ, (2) báo lại đơn cho các khoản đã nhận tiền nhưng chưa báo được.
func doiSoatDinhKy() {
	time.Sleep(20 * time.Second)
	for {
		ctx, huy := context.WithTimeout(context.Background(), 50*time.Second)
		if ds, err := truyVan(ctx, "SELECT TOP 30 "+cotThanhToan+" FROM dbo.ThanhToan WHERE KenhThanhToan = 'SePayGateway' AND TrangThai = 'ChoThanhToan' AND NgayTao > DATEADD(HOUR, -3, SYSUTCDATETIME()) ORDER BY NgayTao DESC"); err == nil {
			for _, t := range ds {
				lamMoiTuSePay(ctx, t, "DoiSoat", true)
			}
		} else {
			log.Printf("đối soát: %v", err)
		}
		if ds, err := truyVan(ctx, "SELECT TOP 30 g.Nguon, g.MaGiaoDichNgoai, t.MaThanhToan, t.MaDonHang, t.SoTien, t.KenhThanhToan, g.MaGiaoDichCong FROM dbo.GiaoDichCong g "+
			"JOIN dbo.ThanhToan t ON t.MaThanhToan = g.MaThanhToan WHERE g.KetQuaXuLy = 'Loi' AND t.TrangThai = 'DaThanhToan' AND g.NgayNhan > DATEADD(DAY, -1, SYSUTCDATETIME())"); err == nil {
			for _, g := range ds {
				switch baoDonHang(ctx, soNguyen(g["maDonHang"]), soNguyen(g["maThanhToan"]), soNguyen(g["soTien"]), chuoi(g["kenhThanhToan"])) {
				case "ok":
					capNhatNhatKy(ctx, soNguyen(g["maGiaoDichCong"]), nil, "ThanhCong")
				case "donDaHuy":
					_, _ = db.ExecContext(ctx, "UPDATE dbo.ThanhToan SET TrangThai = 'CanXuLy', GhiChu = N'Tiền về sau khi đơn đã hủy — cần hoàn tiền cho khách', NgayCapNhat = SYSUTCDATETIME() WHERE MaThanhToan = @p1 AND TrangThai = 'DaThanhToan'", soNguyen(g["maThanhToan"]))
					_ = taoYeuCauHoan(ctx, soNguyen(g["maThanhToan"]), soNguyen(g["soTien"]), "Tiền về sau khi đơn đã hủy", nil)
					capNhatNhatKy(ctx, soNguyen(g["maGiaoDichCong"]), nil, "HetHan")
				}
			}
		}
		huy()
		time.Sleep(time.Minute)
	}
}
