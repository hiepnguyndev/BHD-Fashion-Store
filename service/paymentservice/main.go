// PaymentService (Go · Gin): COD, VietQR chuyển khoản và cổng thanh toán SePay.
package main

import (
	"context"
	"crypto/rsa"
	"crypto/subtle"
	"crypto/x509"
	"database/sql"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	mssql "github.com/microsoft/go-mssqldb"
)

type cauHinh struct {
	khoaNoiBo, donHangURL, webURL                  string
	nganHangTen, nganHangBIN, soTaiKhoan, tenChuTK string
	tienToMa                                       string
	sepayWebhookKey, sepayMerchant, sepaySecret    string
	sepayMoiTruong                                 string
	khoaCong                                       *rsa.PublicKey
}

var (
	ch cauHinh
	db *sql.DB
)

func env(ten, macDinh string) string {
	if v := os.Getenv(ten); v != "" {
		return v
	}
	return macDinh
}

func napCauHinh() {
	ch = cauHinh{
		khoaNoiBo:       os.Getenv("KHOA_NOI_BO"),
		donHangURL:      strings.TrimRight(env("DON_HANG_URL", "http://donhang:8080"), "/"),
		webURL:          strings.TrimRight(env("WEB_URL", "http://localhost:8080"), "/"),
		nganHangTen:     os.Getenv("NGAN_HANG_TEN"),
		nganHangBIN:     os.Getenv("NGAN_HANG_BIN"),
		soTaiKhoan:      os.Getenv("NGAN_HANG_SO_TAI_KHOAN"),
		tenChuTK:        os.Getenv("NGAN_HANG_TEN_CHU_TK"),
		tienToMa:        strings.ToUpper(env("MA_THANH_TOAN_TIEN_TO", "TT")),
		sepayWebhookKey: os.Getenv("SEPAY_WEBHOOK_API_KEY"),
		sepayMerchant:   os.Getenv("SEPAY_PG_MERCHANT_ID"),
		sepaySecret:     os.Getenv("SEPAY_PG_SECRET_KEY"),
		sepayMoiTruong:  env("SEPAY_PG_MOI_TRUONG", "sandbox"),
	}
	if ch.khoaNoiBo == "" {
		log.Fatal("Thiếu KHOA_NOI_BO")
	}
	duongKhoa := env("THU_MUC_KHOA", "/khoa") + "/public.pem"
	for i := 0; i < 60; i++ {
		if _, err := os.Stat(duongKhoa); err == nil {
			break
		}
		time.Sleep(time.Second)
	}
	raw, err := os.ReadFile(duongKhoa)
	if err != nil {
		log.Fatalf("Không đọc được khóa công khai JWT: %v", err)
	}
	blk, _ := pem.Decode(raw)
	if blk == nil {
		log.Fatal("public.pem không hợp lệ")
	}
	pub, err := x509.ParsePKIXPublicKey(blk.Bytes)
	if err != nil {
		log.Fatalf("Khóa công khai lỗi: %v", err)
	}
	k, ok := pub.(*rsa.PublicKey)
	if !ok {
		log.Fatal("Khóa công khai không phải RSA")
	}
	ch.khoaCong = k
}

func moCSDL() {
	q := url.Values{}
	q.Set("database", env("DB_NAME", "ThoiTrang_ThanhToan"))
	q.Set("encrypt", "true")
	q.Set("TrustServerCertificate", "true")
	q.Set("connection timeout", "15")
	u := &url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(env("DB_USER", "dv_thanhtoan"), os.Getenv("DB_PASSWORD")),
		Host:     env("DB_HOST", "sqlserver") + ":" + env("DB_PORT", "1433"),
		RawQuery: q.Encode(),
	}
	var err error
	db, err = sql.Open("sqlserver", u.String())
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)
}

// ---------------------------------------------------------------- tiện ích dữ liệu
func laTrung(err error) bool {
	var e mssql.Error
	return errors.As(err, &e) && (e.Number == 2601 || e.Number == 2627)
}

func camel(s string) string {
	if s == "" {
		return s
	}
	return strings.ToLower(s[:1]) + s[1:]
}

// quetDong đọc mọi dòng của rows thành []map với khóa camelCase.
func quetDong(rows *sql.Rows) ([]map[string]any, error) {
	defer rows.Close()
	cot, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}
	kq := []map[string]any{}
	for rows.Next() {
		giaTri := make([]any, len(cot))
		con := make([]any, len(cot))
		for i := range giaTri {
			con[i] = &giaTri[i]
		}
		if err := rows.Scan(con...); err != nil {
			return nil, err
		}
		m := make(map[string]any, len(cot))
		for i, c := range cot {
			v := giaTri[i]
			switch x := v.(type) {
			case []byte:
				ten := strings.ToUpper(c.DatabaseTypeName())
				if strings.Contains(ten, "DECIMAL") || strings.Contains(ten, "NUMERIC") || strings.Contains(ten, "MONEY") {
					v = json.Number(string(x))
				} else {
					v = string(x)
				}
			case time.Time:
				v = x.UTC().Format(time.RFC3339)
			}
			m[camel(c.Name())] = v
		}
		kq = append(kq, m)
	}
	return kq, rows.Err()
}

func truyVan(ctx context.Context, cauLenh string, thamSo ...any) ([]map[string]any, error) {
	rows, err := db.QueryContext(ctx, cauLenh, thamSo...)
	if err != nil {
		return nil, err
	}
	return quetDong(rows)
}

func soNguyen(v any) int64 {
	switch x := v.(type) {
	case int64:
		return x
	case int32:
		return int64(x)
	case json.Number:
		f, _ := x.Float64()
		return int64(f)
	case float64:
		return int64(x)
	case string:
		n, _ := strconv.ParseInt(x, 10, 64)
		return n
	}
	return 0
}

func chuoi(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func loi(c *gin.Context, ma int, nd string) {
	c.AbortWithStatusJSON(ma, gin.H{"loi": nd})
}

// ---------------------------------------------------------------- bảo vệ
func khoaNoiBo() gin.HandlerFunc {
	return func(c *gin.Context) {
		gui := c.GetHeader("X-Khoa-Noi-Bo")
		if subtle.ConstantTimeCompare([]byte(gui), []byte(ch.khoaNoiBo)) != 1 {
			loi(c, http.StatusUnauthorized, "Không được phép.")
			return
		}
		c.Next()
	}
}

func xacThucQuanTri() gin.HandlerFunc {
	return func(c *gin.Context) {
		tieuDe := c.GetHeader("Authorization")
		if len(tieuDe) < 8 || !strings.EqualFold(tieuDe[:7], "bearer ") {
			loi(c, http.StatusUnauthorized, "Bạn chưa đăng nhập.")
			return
		}
		tok, err := jwt.Parse(strings.TrimSpace(tieuDe[7:]), func(*jwt.Token) (any, error) { return ch.khoaCong, nil },
			jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer("thoitrang-nguoidung"), jwt.WithExpirationRequired())
		if err != nil || !tok.Valid {
			loi(c, http.StatusUnauthorized, "Phiên đăng nhập đã hết hạn.")
			return
		}
		cl, _ := tok.Claims.(jwt.MapClaims)
		if cl["vai_tro"] != "QuanTri" {
			loi(c, http.StatusForbidden, "Bạn không có quyền thực hiện thao tác này.")
			return
		}
		ma, _ := strconv.Atoi(fmt.Sprint(cl["sub"]))
		c.Set("maQuanTri", ma)
		c.Next()
	}
}

func main() {
	napCauHinh()
	moCSDL()
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.SetTrustedProxies(nil)
	r.MaxMultipartMemory = 1 << 20

	r.GET("/health", func(c *gin.Context) {
		ctx, huy := context.WithTimeout(c, 3*time.Second)
		defer huy()
		if err := db.PingContext(ctx); err != nil {
			loi(c, http.StatusServiceUnavailable, "CSDL chưa sẵn sàng")
			return
		}
		c.JSON(200, gin.H{"trangThai": "ok"})
	})

	// công khai
	r.GET("/api/thanh-toan/trang-thai", trangThaiCongKhai)
	r.POST("/webhook/sepay", webhookSePay)
	r.POST("/ipn/sepay", ipnSePay)

	// nội bộ giữa các dịch vụ
	nb := r.Group("/noi-bo", khoaNoiBo())
	nb.POST("/thanh-toan/tao", taoThanhToan)
	nb.GET("/thanh-toan/don/:id", thanhToanCuaDon)
	nb.POST("/thanh-toan/huy", huyThanhToan)
	nb.POST("/thanh-toan/cod-da-thu", codDaThu)

	// quản trị
	qt := r.Group("/api/quan-tri", xacThucQuanTri())
	qt.GET("/thanh-toan", qtDsThanhToan)
	qt.POST("/thanh-toan/:id/xac-nhan", qtXacNhan)
	qt.GET("/hoan-tien", qtDsHoanTien)
	qt.POST("/hoan-tien", qtTaoHoanTien)
	qt.PATCH("/hoan-tien/:id", qtCapNhatHoanTien)
	qt.GET("/giao-dich-cong", qtDsGiaoDichCong)

	go doiSoatDinhKy()

	srv := &http.Server{Addr: ":8080", Handler: r, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 60 * time.Second}
	log.Println("PaymentService chạy ở cổng 8080")
	log.Fatal(srv.ListenAndServe())
}
