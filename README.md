# BHD Fashion Store — Website bán hàng thời trang (microservices)

Hệ thống bán hàng trực tuyến tách thành **6 dịch vụ, mỗi dịch vụ một ngôn ngữ**, dùng **SQL Server** (tên CSDL/bảng/cột bằng tiếng Việt không dấu, không nạp sẵn dữ liệu), giao diện **Next.js** có trang cửa hàng và trang quản trị.

```
Trình duyệt ──► Nginx (:8080) ──┬─► giaodien  Next.js 16 (cửa hàng + admin + BFF)
                                └─► thanhtoan /webhook/sepay, /ipn/sepay
giaodien (BFF, giữ token trong cookie httpOnly) ──► 6 dịch vụ bên dưới
```

| Dịch vụ | Ngôn ngữ | Việc chính | CSDL |
|---|---|---|---|
| `nguoidung` | Python · FastAPI | Đăng ký/đăng nhập (JWT RS256), refresh token xoay vòng, địa chỉ, xuất/xóa dữ liệu cá nhân | `ThoiTrang_NguoiDung` |
| `sanpham` | C# · ASP.NET Core | Danh mục, sản phẩm, biến thể, tồn kho + giữ chỗ, ảnh, đánh giá, yêu thích, banner | `ThoiTrang_SanPham` |
| `giohang` | Node.js · Express | Giỏ hàng (khách vãng lai + tài khoản, gộp giỏ khi đăng nhập) | `ThoiTrang_GioHang` |
| `donhang` | Java · Spring Boot | Đặt hàng, mã giảm giá, vòng đời đơn, hủy, đổi/trả, thống kê | `ThoiTrang_DonHang` |
| `thanhtoan` | Go · Gin | COD, VietQR, cổng SePay, webhook ngân hàng, đối soát, hoàn tiền | `ThoiTrang_ThanhToan` |
| `thongbao` | PHP · Laravel | Email giao dịch + thông báo trong ứng dụng, gửi lại khi lỗi | `ThoiTrang_ThongBao` |

Mỗi dịch vụ có **tài khoản SQL riêng** (`dv_*`) chỉ đọc/ghi CSDL của nó. Không có khóa ngoại giữa các CSDL; các dịch vụ gọi nhau qua HTTP nội bộ kèm khóa `X-Khoa-Noi-Bo` (Nginx chặn `/noi-bo/` từ bên ngoài).

## Chạy nhanh

Cần Docker (Compose v2) và ~4 GB RAM trống cho SQL Server.

```bash
./tao_env.sh                 # sinh .env với mật khẩu/khóa ngẫu nhiên
nano .env                    # điền NGAN_HANG_* (tài khoản nhận tiền VietQR), TEN_CUA_HANG, WEB_URL
docker compose up -d --build # lần đầu mất vài phút (tải thư viện Maven/NuGet/Composer/npm/Go)
```

- Cửa hàng: http://localhost:8080 · Hộp thư thử nghiệm (Mailpit): http://localhost:8025
- SQL Server khởi tạo CSDL, bảng và tài khoản dịch vụ tự động (`csdl_khoi_tao`). **Không có dữ liệu mẫu**: bạn tự tạo danh mục, sản phẩm, banner trong trang quản trị.

### Tạo tài khoản quản trị đầu tiên

1. Vào `/dang-ky`, đăng ký bằng email của bạn, mở Mailpit và bấm liên kết xác thực.
2. Cấp quyền quản trị bằng SQL (chỉ cần làm một lần; các lần sau cấp ngay trong trang *Người dùng*):

```bash
docker compose exec sqlserver sh -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
  -Q "UPDATE ThoiTrang_NguoiDung.dbo.NguoiDung SET VaiTro = '"'"'QuanTri'"'"' WHERE Email = '"'"'email-cua-ban@example.com'"'"'"'
```

(Nếu image không có `mssql-tools18`, tạm thêm `ports: ["127.0.0.1:1433:1433"]` cho dịch vụ `sqlserver` rồi dùng Azure Data Studio/SSMS; xong hãy gỡ ra.) Đăng xuất rồi đăng nhập lại, mở `/quan-tri`.

### Giao diện

Tông màu cam – trắng – be, khung bo góc; thanh điều hướng gồm **Trang chủ · Danh mục (Sản phẩm) · Ưu đãi · Liên hệ**, cộng đăng nhập/đăng ký, khu tài khoản và trang quản trị. Màu và độ bo góc chỉnh tập trung ở khối `:root` trong `frontend/src/app/globals.css`. Hiệu ứng chuyển trang ở `src/app/template.tsx` + `components/ProgressBar.tsx`; hiệu ứng tự tắt với người dùng bật “giảm chuyển động”.

- **Ưu đãi** hiển thị các mã giảm giá được tick *“Hiển thị công khai ở trang Ưu đãi”* (trong *Quản trị → Mã giảm giá*) và các sản phẩm đang có giá bán thấp hơn giá niêm yết.
- **Liên hệ** đọc địa chỉ/điện thoại/email/giờ làm việc từ `LIEN_HE_*` trong `.env` (để trống thì hiện “Đang cập nhật”). Biểu mẫu hiện mở ứng dụng email của khách với nội dung điền sẵn; chưa có hộp thư nhận tin trên máy chủ.

### Thứ tự thiết lập cửa hàng

*Danh mục* → *Sản phẩm* (tạo → thêm biến thể size/màu + tồn kho → tải ảnh → đặt “Đang bán”) → *Banner* → *Mã giảm giá* → *Chính sách* (sửa nội dung mẫu trong `frontend/src/app/(storefront)/chinh-sach/[slug]/page.tsx`).

## Thanh toán

Ba hình thức, chọn lúc đặt hàng: **COD**, **VietQR** (chuyển khoản, tự xác nhận) và **cổng SePay** (thẻ/ví/QR).

### VietQR + webhook SePay (tự xác nhận chuyển khoản)

1. Điền `NGAN_HANG_TEN`, `NGAN_HANG_BIN` (mã BIN theo chuẩn VietQR), `NGAN_HANG_SO_TAI_KHOAN`, `NGAN_HANG_TEN_CHU_TK` trong `.env`.
2. Trên my.sepay.vn: liên kết tài khoản ngân hàng đó, cấu hình **tiền tố nhận diện mã thanh toán** trùng `MA_THANH_TOAN_TIEN_TO` (mặc định `TT`; mã gồm tiền tố + 10 ký tự chữ/số), rồi tạo **Webhook**:
   - URL: `https://<tên-miền>/webhook/sepay`
   - Kiểu xác thực: **API Key** — dán đúng giá trị `SEPAY_WEBHOOK_API_KEY` trong `.env`.
3. Webhook cần địa chỉ **công khai qua Internet** (khi thử trên máy cá nhân hãy dùng Cloudflare Tunnel/ngrok).

Cách hoạt động: khách chuyển khoản đúng nội dung → SePay gọi webhook → hệ thống khớp mã, kiểm tra **đúng số tiền**, chuyển đơn sang “Chờ xác nhận”. Gọi trùng không xử lý hai lần. Sai số tiền, sai mã, tiền về sau khi đơn hết hạn/hủy → vào mục **Cần xử lý** để quản trị đối chiếu và xác nhận hoặc hoàn tiền.

### Cổng thanh toán SePay (thẻ/ví)

Điền `SEPAY_PG_MERCHANT_ID`, `SEPAY_PG_SECRET_KEY`, đặt `SEPAY_PG_MOI_TRUONG=sandbox` để thử, `production` khi chạy thật. Trên SePay đặt IPN URL là `https://<tên-miền>/ipn/sepay`. IPN chỉ là *tín hiệu*: hệ thống luôn hỏi lại API của SePay để xác minh trạng thái và số tiền, nên không tin dữ liệu IPN gửi tới. Có thêm vòng đối soát mỗi phút phòng khi IPN mất.

### Hoàn tiền

Hệ thống **không** tự gọi API hoàn tiền. Quản trị tạo yêu cầu → tự chuyển khoản trả khách → bấm “Đã hoàn tiền” trong *Thanh toán & hoàn tiền*.

## Cấu hình thường dùng (`.env`)

`PHI_VAN_CHUYEN`, `MIEN_PHI_VAN_CHUYEN_TU`, `HAN_THANH_TOAN_PHUT` (thời gian giữ hàng cho đơn thanh toán trước), `MAIL_*` (SMTP thật; mặc định gửi vào Mailpit), `COOKIE_SECURE=true` khi chạy HTTPS.

## Trước khi mở bán thật — danh sách kiểm tra

**Kỹ thuật**
- [ ] HTTPS: đặt Cloudflare phía trước hoặc cấu hình Let’s Encrypt cho Nginx; đặt `WEB_URL=https://…`, `COOKIE_SECURE=true`.
- [ ] Đổi SMTP sang dịch vụ thật (`MAIL_*`), bỏ dịch vụ `mailpit`; kiểm tra email không rơi vào spam (SPF/DKIM).
- [ ] **Sao lưu** volume `sqlserver_du_lieu` và `anh_san_pham` hằng ngày, chép ra ngoài máy chủ và **thử khôi phục**. CSDL ở chế độ FULL: nhớ sao lưu log định kỳ.
- [ ] Chỉ mở cổng 80/443; không mở 1433 và 8025 ra Internet.
- [ ] Chạy thử trọn luồng: đặt COD, đặt VietQR (chuyển thật số tiền nhỏ), cổng SePay sandbox, hủy đơn, hết hạn giữ hàng, đổi/trả, quên mật khẩu.
- [ ] SQL Server mặc định dùng bản Express (miễn phí, giới hạn dung lượng/RAM). Cửa hàng lớn cần bản có giấy phép phù hợp.

**Pháp lý (Việt Nam) — hãy tự xác nhận lại với nguồn chính thức, quy định thay đổi thường xuyên**
- Thông báo/đăng ký website thương mại điện tử bán hàng với Bộ Công Thương (online.gov.vn) và hiển thị thông tin chủ sở hữu, chính sách trên website (trang *Thông tin cửa hàng* đang để trống để bạn điền).
- Luật Thương mại điện tử và nghị định hướng dẫn mới có hiệu lực từ giữa năm 2026; luật bảo vệ dữ liệu cá nhân có hiệu lực từ đầu năm 2026 (đã có sẵn: đồng ý khi đăng ký, tải dữ liệu, xóa tài khoản). Đối chiếu nghĩa vụ của bạn (thông báo xử lý dữ liệu, lưu trữ, hóa đơn điện tử, thuế hộ kinh doanh).
- Địa chỉ giao hàng dùng 2 cấp (tỉnh/thành – phường/xã). Danh sách tỉnh/thành trong `frontend/src/lib/format.ts` cần đối chiếu lại với danh mục hành chính hiện hành.
- Nội dung ở `chinh-sach/[slug]` chỉ là **bản mẫu**, không phải tư vấn pháp lý.

## Bảo mật đã làm

JWT RS256 (khóa sinh tự động vào volume `khoa_jwt`, dịch vụ khác chỉ đọc khóa công khai) · refresh token ngẫu nhiên lưu dạng băm, xoay vòng, phát hiện dùng lại · giới hạn đăng nhập sai theo IP+email · mã xác thực/đặt lại mật khẩu lưu dạng băm · giá luôn tính ở máy chủ từ dữ liệu sản phẩm · ràng buộc CHECK chống tồn kho âm/giữ chỗ vượt tồn · kiểm tra chữ ký byte ảnh tải lên · token không bao giờ lộ ra JavaScript (cookie httpOnly, SameSite=Lax, kiểm tra Origin khi ghi) · webhook so khóa bằng so sánh thời gian hằng số · chống mã trùng bằng chỉ mục duy nhất.

## Những gì CHƯA được kiểm chứng (đọc kỹ)

Môi trường soạn mã này **không truy cập được** NuGet, Maven, Packagist và Go proxy, nên:

| Phần | Đã làm | Chưa làm |
|---|---|---|
| Python (nguoidung) | biên dịch, chạy thử cơ bản | chạy với SQL Server thật |
| Node (giohang) | kiểm tra cú pháp | chạy với SQL Server thật |
| Go (thanhtoan) | `go vet` + `go test` (thuật toán VietQR/CRC) với thư viện giả lập | biên dịch với gin/jwt/go-mssqldb thật |
| C# (sanpham) | rà soát tay, cân bằng ngoặc | **chưa biên dịch** |
| Java (donhang) | rà soát tay, cân bằng ngoặc | **chưa biên dịch** |
| PHP (thongbao) | `php -l` từng tệp | chưa `composer install`, chưa chạy Laravel |
| Next.js (giaodien) | `next build` đầy đủ (kiểm tra kiểu), chạy thử BFF với dịch vụ giả: đăng nhập, làm mới token song song, chuẩn hóa lỗi, chặn CSRF | chưa chạy cùng dịch vụ thật |
| Toàn hệ thống | cú pháp `docker-compose.yml` hợp lệ | **chưa chạy `docker compose up` và chưa thử với SQL Server thật** |

Hãy kỳ vọng vài lỗi biên dịch/chạy nhỏ ở lần dựng đầu (nhất là C#, Java, PHP): chạy `docker compose build <tên-dịch-vụ>` từng cái, đọc lỗi và sửa. Chưa từng thử thanh toán thật với SePay: cấu trúc dữ liệu SePay được dựng theo tài liệu công khai, riêng định dạng phản hồi API tra cứu đơn của cổng thanh toán tài liệu chưa mô tả đầy đủ nên mã đọc theo cách linh hoạt — hãy thử ở sandbox trước.

## Cấu trúc thư mục

```
docker-compose.yml  .env.example  tao_env.sh
gateway/nginx.conf               cổng vào, giới hạn tốc độ, ảnh tĩnh, webhook
database/                        tạo CSDL + tài khoản dịch vụ + trình khởi tạo
service/                         6 dịch vụ: userservice, productservice, cartservice,
                                 orderservice, paymentservice, notificationservice
frontend/                        Next.js: src/app/(storefront), src/app/quan-tri, src/lib/bff.ts
```
