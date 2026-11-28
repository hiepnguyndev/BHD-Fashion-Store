# BHD Fashion Store

Website bán hàng thời trang xây theo kiến trúc **microservices**: các dịch vụ nghiệp vụ viết bằng nhiều ngôn ngữ khác nhau, giao diện **Next.js** gồm cửa hàng và trang quản trị, cơ sở dữ liệu **SQL Server**, tất cả chạy bằng **Docker Compose**. Có thể đưa ra Internet qua **Cloudflare Tunnel** với tên miền riêng và HTTPS mà không cần mở cổng router.

## Tính năng chính

**Cửa hàng**
- Danh mục 2 cấp: *Thời Trang Nam* / *Thời Trang Nữ* và các danh mục con (Áo, Quần, Váy).
- Tìm kiếm có **gợi ý ngay khi gõ** (ảnh, tên, giá; hỗ trợ phím mũi tên, Enter, Esc), tìm không dấu, nhiều từ khóa, khớp cả tên danh mục.
- Bộ lọc theo dữ liệu thật: **kích cỡ** và **màu sắc** dạng danh sách thả xuống (tự thay đổi theo danh mục đang xem), **khoảng giá** dạng thanh kéo hai đầu, sắp xếp, đếm số sản phẩm theo danh mục.
- Trang chủ: Danh mục (hai thẻ lớn), Sản phẩm đang sale, Bộ sưu tập (chỉ hiện khi có), Mã giảm giá.
- Menu **Ưu đãi** (sản phẩm đang giảm giá, mã giảm giá) và **Tin tức** (bài viết do quản trị đăng).
- Giỏ hàng, đặt hàng, thanh toán **COD hoặc chuyển khoản** (QR, tự xác nhận khi tiền về), tra cứu đơn, đổi trả, yêu thích, đánh giá, gợi ý size theo số đo trong hồ sơ, giao diện sáng/tối, tiếng Việt/English.
- **Chatbot tư vấn** (hỏi sản phẩm, tồn kho, size, chính sách) và **thử đồ bằng AI**.

**Quản trị**: đơn hàng, đổi/trả, thanh toán và hoàn tiền, sản phẩm và kho, danh mục, bộ sưu tập, banner, tin tức, mã giảm giá, đánh giá, người dùng, nhật ký email.

## Mục lục

1. [Tính năng chính](#tính-năng-chính)
2. [Kiến trúc](#kiến-trúc)
3. [Yêu cầu](#yêu-cầu)
4. [Chạy dự án](#chạy-dự-án)
5. [Cấu hình `.env`](#cấu-hình-env)
6. [Chạy trên tên miền (Cloudflare Tunnel)](#chạy-trên-tên-miền-cloudflare-tunnel)
7. [Tạo tài khoản quản trị](#tạo-tài-khoản-quản-trị)
8. [Thiết lập cửa hàng](#thiết-lập-cửa-hàng)
9. [Các trang của website](#các-trang-của-website)
10. [Chatbot tư vấn](#chatbot-tư-vấn)
11. [Thử đồ bằng AI](#thử-đồ-bằng-ai)
12. [Thanh toán](#thanh-toán)
13. [Email](#email)
14. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
15. [Lệnh Docker hay dùng](#lệnh-docker-hay-dùng)
16. [Xử lý sự cố](#xử-lý-sự-cố)
17. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
18. [Bảo mật](#bảo-mật)
19. [Trước khi mở bán thật](#trước-khi-mở-bán-thật)
20. [Hạn chế đã biết](#hạn-chế-đã-biết)

---

## Kiến trúc

```
Internet ──► Cloudflare ──► cloudflared (tunnel, tùy chọn)
                                   │
Trình duyệt (localhost) ───────────┤
                                   ▼
                          Nginx `gateway` (cổng 8080)
                                   ├─► giaodien   Next.js (cửa hàng + admin + BFF)
                                   └─► thanhtoan  /webhook/*, /ipn/*  (SePay)

giaodien (BFF, token nằm trong cookie httpOnly) ──► các dịch vụ bên dưới
```

| Dịch vụ | Công nghệ | Nhiệm vụ | CSDL |
|---|---|---|---|
| `nguoidung` | Python · FastAPI | Đăng ký, đăng nhập (JWT RS256), refresh token xoay vòng, địa chỉ, xuất/xóa dữ liệu cá nhân | `ThoiTrang_NguoiDung` |
| `sanpham` | C# · ASP.NET Core | Danh mục, sản phẩm, biến thể, tồn kho và giữ chỗ, ảnh, đánh giá, yêu thích, banner, tin tức, bộ lọc | `ThoiTrang_SanPham` |
| `giohang` | Node.js · Express | Giỏ hàng (khách vãng lai và tài khoản, gộp giỏ khi đăng nhập) | `ThoiTrang_GioHang` |
| `donhang` | Java · Spring Boot | Đặt hàng, mã giảm giá, vòng đời đơn, hủy, đổi/trả, thống kê | `ThoiTrang_DonHang` |
| `thanhtoan` | Go · Gin | COD, chuyển khoản VietQR, cổng SePay, webhook ngân hàng, đối soát, hoàn tiền | `ThoiTrang_ThanhToan` |
| `thongbao` | PHP · Laravel | Email giao dịch, thông báo trong ứng dụng, gửi lại khi lỗi | `ThoiTrang_ThongBao` |
| `thongbao_gui_lai` | PHP · Laravel | Chạy lịch Laravel: gửi lại email lỗi mỗi phút | dùng chung với `thongbao` |
| `trolyai` | Python · FastAPI | Chatbot tư vấn và CSKH: tìm sản phẩm, tồn kho, gợi ý size, chính sách (đọc dữ liệu từ `sanpham`, `donhang`) | không có |
| `thudo` | Python · FastAPI | Thử đồ bằng AI: ghép áo của sản phẩm lên ảnh khách qua Space công khai trên Hugging Face | không có (ảnh tạm trong RAM) |
| `giaodien` | Next.js | Cửa hàng, trang quản trị, BFF | không có |
| `gateway` | Nginx | Cổng vào duy nhất, giới hạn tốc độ, ảnh tĩnh, webhook | không có |
| `cloudflared` | Cloudflare Tunnel | Đưa `gateway` ra Internet bằng HTTPS (chỉ chạy với profile `tunnel`) | không có |
| `sqlserver` | SQL Server 2022 Express | Lưu trữ dữ liệu | 6 CSDL ở trên |
| `csdl_khoi_tao` | Python | Chạy một lần: tạo CSDL, bảng, tài khoản dịch vụ | không có |
| `mailpit` | Mailpit | Hộp thư thử nghiệm | không có |

Nguyên tắc thiết kế:

- Mỗi dịch vụ có **tài khoản SQL riêng** (`dv_*`), chỉ đọc/ghi CSDL của mình. Không có khóa ngoại giữa các CSDL.
- Các dịch vụ gọi nhau qua HTTP nội bộ kèm khóa `X-Khoa-Noi-Bo`. Nginx chặn mọi yêu cầu tới `/noi-bo/` từ bên ngoài.
- Trình duyệt chỉ nói chuyện với Next.js. Token đăng nhập nằm trong cookie `httpOnly`, JavaScript không đọc được.
- Tên CSDL, bảng, cột và đường dẫn API nội bộ dùng tiếng Việt không dấu. Tên thư mục, tên file và URL của trang web dùng tiếng Anh.

## Yêu cầu

- Docker Desktop (Compose v2).
- Khoảng 4 GB RAM trống cho SQL Server.
- Cổng `8080` (website) và `8025` (Mailpit) chưa bị chương trình khác dùng.
- Để chạy trên tên miền: một tên miền đã thêm vào Cloudflare (tài khoản miễn phí là đủ).

## Chạy dự án

### Lần đầu

```bash
./generate_env.sh              # sinh .env với mật khẩu và khóa ngẫu nhiên (hoặc sao chép .env.example thành .env)
# mở .env, điền NGAN_HANG_*, TEN_CUA_HANG, WEB_URL (xem phần Cấu hình)
docker compose up -d --build   # lần đầu mất vài phút vì phải tải thư viện
```

Sau khi chạy xong:

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:8080 | Cửa hàng |
| http://localhost:8080/admin | Trang quản trị |
| http://localhost:8025 | Mailpit (hộp thư thử nghiệm) |

`csdl_khoi_tao` tự tạo CSDL, bảng và tài khoản dịch vụ. CSDL mới tạo ra **trống**: chưa có danh mục và sản phẩm. Bạn tạo trong trang quản trị hoặc nạp từ file CSV (xem [Dữ liệu sản phẩm](#dữ-liệu-sản-phẩm)).

### Các lần sau

| Tình huống | Lệnh |
|---|---|
| Chạy lại, code không đổi | `docker compose up -d` |
| Sau khi sửa code | `docker compose up -d --build` |
| Chỉ build lại một dịch vụ | `docker compose up -d --build giaodien` |
| Dừng, giữ dữ liệu | `docker compose stop` |
| Xóa container, giữ dữ liệu | `docker compose down` |

Khi chạy trên tên miền, **thêm `--profile tunnel`** vào các lệnh trên, ví dụ `docker compose --profile tunnel up -d`. Nếu thiếu, tunnel không chạy và web không vào được từ tên miền.

Các container đặt `restart: unless-stopped` nên tự chạy lại khi Docker Desktop khởi động, trừ khi bạn đã `stop` hoặc `down` trước đó. Sau khi bật Docker, hãy đợi khoảng một phút để SQL Server lên rồi mới vào website.

> **Không dùng `docker compose down -v`.** Cờ `-v` xóa volume, tức xóa toàn bộ CSDL và ảnh sản phẩm.

## Cấu hình `.env`

File `.env` nằm cùng thư mục với `docker-compose.yml`. File này chứa mật khẩu và token, **không đưa lên git** (đã nằm trong `.gitignore`) và không gửi cho người khác.

| Nhóm | Biến | Ý nghĩa |
|---|---|---|
| Chung | `TEN_CUA_HANG` | Tên hiển thị trên website và email |
| | `WEB_URL` | Địa chỉ website, dùng để dựng link trong email và địa chỉ quay về của SePay. Chạy thật phải là `https://tên-miền`. Giá trị này được nhúng vào frontend lúc build, nên đổi xong phải `--build` |
| | `COOKIE_SECURE` | Đặt `true` khi chạy HTTPS |
| | `CF_TUNNEL_TOKEN` | Token của Cloudflare Tunnel (xem [Chạy trên tên miền](#chạy-trên-tên-miền-cloudflare-tunnel)). Để trống nếu chỉ chạy localhost |
| SQL Server | `MSSQL_PHIEN_BAN` | Phiên bản image, mặc định `2022-latest` |
| | `MSSQL_SA_PASSWORD` | Mật khẩu tài khoản `sa`, cần đủ phức tạp |
| | `MK_NGUOIDUNG`, `MK_SANPHAM`, `MK_GIOHANG`, `MK_DONHANG`, `MK_THANHTOAN`, `MK_THONGBAO` | Mật khẩu tài khoản SQL của từng dịch vụ |
| Bảo mật | `KHOA_NOI_BO` | Khóa dùng chung cho các lời gọi nội bộ giữa dịch vụ |
| | `APP_KEY_THONG_BAO` | Khóa ứng dụng Laravel |
| Vận chuyển | `PHI_VAN_CHUYEN` | Phí ship (VND), mặc định 30000 |
| | `MIEN_PHI_VAN_CHUYEN_TU` | Đơn từ mức này trở lên được miễn phí ship, mặc định 500000 |
| | `HAN_THANH_TOAN_PHUT` | Số phút giữ hàng cho đơn chuyển khoản, mặc định 15 |
| Ngân hàng | `NGAN_HANG_TEN`, `NGAN_HANG_BIN`, `NGAN_HANG_SO_TAI_KHOAN`, `NGAN_HANG_TEN_CHU_TK` | Tài khoản nhận tiền. `NGAN_HANG_SO_TAI_KHOAN` có thể là tài khoản ảo (VA) của SePay |
| | `MA_THANH_TOAN_TIEN_TO` | Tiền tố mã thanh toán, mặc định `TT` |
| SePay | `SEPAY_WEBHOOK_API_KEY`, `SEPAY_WEBHOOK_SECRET` | Xác thực webhook giao dịch ngân hàng. Nếu `SEPAY_WEBHOOK_SECRET` có giá trị thì **chỉ HMAC được chấp nhận** |
| | `SEPAY_PG_MERCHANT_ID`, `SEPAY_PG_SECRET_KEY`, `SEPAY_PG_MOI_TRUONG` | Cổng thanh toán thẻ/ví (không bắt buộc, hiện không hiển thị ở trang đặt hàng) |
| Email | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SCHEME`, `MAIL_FROM_ADDRESS` | Cấu hình SMTP, mặc định gửi vào Mailpit |
| Liên hệ | `LIEN_HE_DIA_CHI`, `LIEN_HE_DIEN_THOAI`, `LIEN_HE_EMAIL`, `LIEN_HE_GIO_LAM_VIEC` | Thông tin ở trang Liên hệ. Để trống sẽ hiện "Đang cập nhật" |
| Chatbot / AI | `GEMINI_API_KEY`, `TRO_LY_LUOT_MOI_PHUT`, `TRO_LY_LUOT_LLM_MOI_NGAY` | Xem [Chatbot tư vấn](#chatbot-tư-vấn) |
| | `HF_TOKEN`, `THU_DO_SPACES`, `THU_DO_LUOT_MOI_NGAY`, `THU_DO_GIU_KET_QUA_PHUT` | Xem [Thử đồ bằng AI](#thử-đồ-bằng-ai) |

Sau khi sửa `.env`, áp dụng bằng `docker compose up -d`. Compose tự tạo lại những container có biến thay đổi. Riêng `WEB_URL` và `TEN_CUA_HANG` cần `--build` vì được nhúng vào frontend.

## Chạy trên tên miền (Cloudflare Tunnel)

Cách này cho phép đưa cửa hàng chạy trên máy cá nhân ra Internet với HTTPS, không cần mở cổng router hay có IP tĩnh. SePay cũng gọi được webhook vào địa chỉ này.

> Máy chạy Docker phải **luôn bật và có mạng**. Tắt máy thì web sập. Muốn chạy 24/7, hãy đưa dự án lên VPS và làm đúng các bước dưới đây.

### 1. Chuẩn bị Cloudflare

1. Thêm tên miền vào Cloudflare (Add a site) và đổi nameserver tại nơi mua tên miền theo hướng dẫn của Cloudflare. Chờ site hiện trạng thái *Active*. Nếu tên miền đã có sẵn trên Cloudflare thì bỏ qua bước này.
2. Quyết định địa chỉ cho cửa hàng. Nếu tên miền gốc đang dùng cho dự án khác, hãy dùng **subdomain** (ví dụ `shop.ten-mien-cua-ban.vn`) để hai dự án chạy song song.

### 2. Tạo tunnel

1. Vào https://one.dash.cloudflare.com → *Networks* → *Tunnels* → *Create a tunnel* → *Cloudflared*, đặt tên tùy ý.
2. Ở màn hình cài đặt, chọn tab **Docker**, bấm biểu tượng sao chép để lấy lệnh đầy đủ, rồi chỉ lấy chuỗi **token** (bắt đầu bằng `eyJ`) sau chữ `--token`. **Không chạy** lệnh `docker run` hoặc `cloudflared service install` đó: dự án đã có dịch vụ `cloudflared` trong Compose.
3. Thêm **Public hostname** cho tunnel:
   - Subdomain và Domain: địa chỉ ở bước 1 (ví dụ `shop` + `ten-mien-cua-ban.vn`)
   - Type: `HTTP`
   - URL: `http://gateway:80` (không phải `localhost:8080`, vì `cloudflared` chạy trong Docker và gọi Nginx bằng tên dịch vụ)
   - Path: để trống

Nếu tạo hostname báo trùng bản ghi DNS, nghĩa là địa chỉ đó đã trỏ về nơi khác (dự án cũ). Hãy chọn subdomain khác hoặc xóa bản ghi cũ trong mục DNS của Cloudflare.

### 3. Cấu hình `.env` và chạy

```
WEB_URL=https://shop.ten-mien-cua-ban.vn
COOKIE_SECURE=true
CF_TUNNEL_TOKEN=<token ở bước 2>
```

```bash
docker compose --profile tunnel up -d --build
```

Mở `https://shop.ten-mien-cua-ban.vn` để kiểm tra. Xem log tunnel bằng `docker compose logs cloudflared`; dòng `Registered tunnel connection` nghĩa là đã nối thành công.

### 4. Cấu hình SePay cho tên miền mới

Xem [Chuyển khoản và webhook SePay](#chuyển-khoản-và-webhook-sepay). URL webhook là `https://<tên-miền-của-bạn>/webhook/sepay`.

### Chuyển sang máy khác

- Cần có file `.env` (không nằm trong git) và build lại trên máy mới (`--build`) vì `WEB_URL` được nhúng lúc build.
- Dữ liệu nằm trong Docker volume trên máy cũ (`sqlserver_du_lieu`, `anh_san_pham`, `khoa_jwt`). Máy mới bắt đầu với CSDL trống, trừ khi bạn sao lưu và khôi phục các volume này.
- **Chỉ chạy `cloudflared` ở một máy tại một thời điểm.** Hai máy dùng chung token sẽ cùng nhận traffic, khách có lúc vào máy này, có lúc vào máy kia với hai CSDL khác nhau. Hãy tắt tunnel ở máy cũ (`docker compose --profile tunnel down`) trước khi bật ở máy mới.

## Tạo tài khoản quản trị

1. Vào `/register`, đăng ký bằng email của bạn. Mở Mailpit (hoặc hộp thư thật nếu đã cấu hình SMTP) và bấm link xác thực.
2. Cấp quyền quản trị bằng SQL. Chỉ cần làm một lần; các lần sau cấp ngay trong trang *Người dùng* của admin.

```bash
docker compose exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "UPDATE ThoiTrang_NguoiDung.dbo.NguoiDung SET VaiTro = N'"'"'QuanTri'"'"' WHERE Email = N'"'"'email-cua-ban@example.com'"'"'"'
```

3. Đăng xuất, đăng nhập lại rồi mở `/admin`.

Trên Windows PowerShell, dấu nháy trong lệnh trên dễ bị lỗi. Cách chắc ăn hơn là mở kết nối bằng Azure Data Studio hoặc SSMS (xem [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)) rồi chạy câu `UPDATE` ở trên.

## Thiết lập cửa hàng

Thứ tự gợi ý trong trang quản trị:

1. **Danh mục**: tạo mục cha (Thời Trang Nam/Nữ) rồi các mục con
2. **Sản phẩm**: tạo sản phẩm, thêm biến thể size/màu và tồn kho, tải ảnh, đặt trạng thái "Đang bán"
3. **Banner**
4. **Mã giảm giá** (tick "Hiển thị công khai" để hiện ở trang chủ và trang Ưu đãi)
5. **Tin tức**: *Admin → Tin tức → Đăng bài* (tiêu đề, tóm tắt, ảnh bìa, nội dung, hẹn giờ đăng)
6. **Chính sách**: sửa nội dung mẫu trong `frontend/src/app/(storefront)/policies/[slug]/page.tsx`

### Đặt sản phẩm giảm giá

Mỗi sản phẩm có hai trường giá: `GiaGoc` (giá niêm yết) và `GiaBan` (giá bán). Đặt **`GiaBan` thấp hơn `GiaGoc`** trong *Admin → Sản phẩm* thì sản phẩm được tính là đang giảm giá và hiện ở mục "Sản phẩm đang sale" ở trang chủ và trang `/deals`. Mã giảm giá (coupon) là cơ chế riêng, tạo ở *Admin → Mã giảm giá*.

Ghi chú:

- Trang **Tin tức**: nội dung là văn bản thường; đoạn cách nhau một dòng trống, dòng bắt đầu bằng `## ` là tiêu đề phụ. Không chèn được HTML.
- Trang **Ưu đãi** hiển thị các mã giảm giá được tick "Hiển thị công khai ở trang Ưu đãi" và các sản phẩm có giá bán thấp hơn giá niêm yết.
- Trang **Liên hệ** đọc thông tin từ các biến `LIEN_HE_*`. Biểu mẫu hiện mở ứng dụng email của khách với nội dung điền sẵn; chưa có hộp thư nhận tin trên máy chủ.
- Màu sắc và độ bo góc chỉnh tập trung ở khối `:root` trong `frontend/src/app/globals.css`.

### Dữ liệu sản phẩm

Thư mục `database/data/` chứa dữ liệu sản phẩm dạng CSV, tổ chức theo thư mục chính là danh mục:

```
database/data/
  Thời Trang Nam/   Áo Nam/ (áo thun, polo, sơ mi, khoác gió, phao, hoodie, len, vest...)
                    Quần Nam/ (âu, jeans, kaki, short)
  Thời Trang Nữ/    Áo Nữ/  Quần Nữ/  Váy Nữ/
```

- Thư mục cấp 1 là danh mục cha, thư mục cấp 2 là danh mục con. Mỗi file CSV là một nhóm sản phẩm (khoảng 490 sản phẩm).
- Cột CSV: `name, current_price_vnd, original_price_vnd, product_url, image_url, color_id, size_id`.
- **Giá**: `GiaGoc` lấy từ `original_price_vnd` (trống thì dùng `current_price_vnd`) và `GiaBan` đặt bằng `GiaGoc`, tức bán đúng giá gốc, chưa giảm giá. Muốn giảm giá, sửa `GiaBan` trong trang quản trị.
- **Ảnh** dùng trực tiếp `image_url` (ô ảnh trong admin chấp nhận `https://...`).
- **Biến thể** (size, màu, mã màu, SKU, ảnh theo màu) không có trong CSV mà lấy từ trang `product_url` của từng sản phẩm. Tồn kho là số giả định (còn hàng = 20), hãy cập nhật tồn kho thật trong admin.
- Repo hiện **chưa kèm script nạp** các file này vào CSDL; dữ liệu đã nạp trực tiếp vào `ThoiTrang_SanPham` trên máy phát triển.

## Các trang của website

### Cửa hàng

| URL | Trang |
|---|---|
| `/` | Trang chủ |
| `/products` | Danh sách sản phẩm. Tham số: `danhMuc`, `tuKhoa`, `kichCo`, `mauSac`, `giaTu`, `giaDen`, `sapXep`, `giamGia`, `boSuuTap`, `trang` |
| `/products/<slug>` | Chi tiết sản phẩm, đánh giá |
| `/deals` | Ưu đãi: mã giảm giá (`#ma-giam-gia`) và sản phẩm đang giảm giá (`#dang-giam-gia`) |
| `/news`, `/news/<slug>` | Tin tức |
| `/cart` | Giỏ hàng |
| `/checkout` | Đặt hàng (chọn COD hoặc Chuyển khoản) |
| `/payment/<mã>` | Thanh toán đơn (hiện QR và thông tin tài khoản với chuyển khoản) |
| `/payment/result` | Trang SePay chuyển khách về sau khi thanh toán qua cổng |
| `/track-order` | Tra cứu đơn hàng |
| `/login`, `/register` | Đăng nhập, đăng ký |
| `/forgot-password`, `/reset-password` | Quên và đặt lại mật khẩu |
| `/verify-email` | Xác thực email |
| `/account` | Thông tin tài khoản và địa chỉ |
| `/account/orders` | Đơn hàng của tôi |
| `/account/wishlist` | Sản phẩm yêu thích |
| `/account/size` | Số đo trong hồ sơ, gợi ý size và sản phẩm phù hợp (`/size-guide` chuyển về đây) |
| `/contact` | Liên hệ |
| `/policies/<slug>` | Chính sách: `van-chuyen`, `thanh-toan`, `doi-tra`, `dieu-khoan`, `bao-mat`, `lien-he` |

### Quản trị (`/admin`)

| URL | Trang |
|---|---|
| `/admin` | Tổng quan, thống kê |
| `/admin/orders` | Đơn hàng |
| `/admin/returns` | Đổi/trả |
| `/admin/payments` | Thanh toán và hoàn tiền |
| `/admin/products` | Sản phẩm và kho |
| `/admin/categories` | Danh mục |
| `/admin/collections` | Bộ sưu tập |
| `/admin/banner` | Banner |
| `/admin/news` | Tin tức (đăng, sửa, ẩn, xóa, hẹn giờ) |
| `/admin/coupons` | Mã giảm giá |
| `/admin/reviews` | Đánh giá |
| `/admin/users` | Người dùng |
| `/admin/email-log` | Nhật ký gửi email |

### Đường dẫn API

Trình duyệt gọi `/api/...` trên Next.js. Next.js chuyển tiếp xuống dịch vụ tương ứng (bảng định tuyến ở `frontend/src/lib/bff.ts`), và các đường dẫn này **giữ tên tiếng Việt** vì đó là hợp đồng giữa giao diện và dịch vụ, ví dụ `/api/san-pham`, `/api/don-hang`, `/api/quan-tri/...`.

Hai đường dẫn do Next.js tự xử lý (không chuyển xuống dịch vụ):

- `POST /api/auth/login`
- `POST /api/auth/logout`

## Chatbot tư vấn

Nút chat nổi ở góc phải mọi trang cửa hàng. Dịch vụ `trolyai` đọc sản phẩm, tồn kho và mã giảm giá qua API công khai của `sanpham`/`donhang`; giá, ảnh và liên kết trong thẻ sản phẩm lấy thẳng từ CSDL, không do AI tự viết.

- **Có khóa Gemini**: mô hình (gói miễn phí của Google AI Studio) hiểu câu hỏi và gọi công cụ. Lấy khóa tại https://aistudio.google.com/apikey, điền `GEMINI_API_KEY` trong `.env`, rồi `docker compose up -d trolyai`.
- **Không có khóa, hết hạn mức hoặc Gemini lỗi**: tự chuyển sang chế độ luật (hiểu "áo polo nam dưới 400k màu đen", "cao 1m70 nặng 65kg mặc size nào", hỏi chính sách...) nên chatbot không bao giờ im lặng.
- **Dùng số đo trong hồ sơ**: khi khách đã đăng nhập và lưu số đo ở `/account/size`, chatbot tư vấn size và chọn sản phẩm còn hàng đúng cỡ ("gợi ý áo polo cho mình"). Chỉ giới tính và size gợi ý được dùng; số đo thô không gửi cho LLM.
- Giới hạn theo IP: `TRO_LY_LUOT_MOI_PHUT` tin mỗi phút và `TRO_LY_LUOT_LLM_MOI_NGAY` lượt gọi LLM mỗi ngày để không vượt hạn mức miễn phí.
- Chatbot không xem được đơn hàng, không hủy đơn hay hoàn tiền; nó chỉ chỉ đường tới trang Tra cứu đơn hàng và Liên hệ. Hội thoại chưa được lưu phía máy chủ (chỉ nằm trong `sessionStorage` của trình duyệt).
- Nội dung chính sách nằm ở `service/assistantservice/app/policies.py`, cần giữ khớp với các trang `/policies/*`.

## Thử đồ bằng AI

Trang chi tiết **áo** (danh mục `ao-nam`, `ao-nu`) có nút "Thử đồ bằng AI". Khách đăng nhập, tải ảnh lên hoặc chụp bằng camera, đồng ý gửi ảnh, rồi nhận ảnh mặc thử.

- **Cách chạy**: dịch vụ `thudo` gọi các Space IDM-VTON công khai trên Hugging Face (`THU_DO_SPACES`, thử lần lượt) bằng `gradio_client`, **miễn phí**. Mỗi lần mất khoảng 30 giây đến vài phút, xử lý lần lượt từng ảnh (hàng đợi).
- **Không ổn định theo thiết kế**: Space công khai có thể quá tải, hết lượt GPU trong ngày hoặc ngừng hoạt động bất cứ lúc nào; khi đó khách nhận thông báo thân thiện. Có thể điền `HF_TOKEN` (token Hugging Face miễn phí) để tăng hạn mức.
- **Giấy phép**: IDM-VTON chỉ cho dùng **phi thương mại**. Dùng cho đồ án hoặc bản demo; trước khi bán thật phải đổi sang model có giấy phép thương mại hoặc dịch vụ trả phí.
- **Riêng tư**: ảnh khách gửi ra ngoài tới Hugging Face nên có hộp đồng ý bắt buộc. Dịch vụ xóa EXIF, không lưu ảnh gốc (xóa ngay sau khi xử lý), ảnh kết quả nằm trong RAM và tự xóa sau `THU_DO_GIU_KET_QUA_PHUT` phút hoặc khi khách bấm xóa.
- **Giới hạn**: `THU_DO_LUOT_MOI_NGAY` lượt mỗi tài khoản mỗi ngày (mặc định 5), mỗi lần chỉ một lượt đang xử lý, lỗi phía dịch vụ thì hoàn lại lượt. Hạn mức đếm trong bộ nhớ nên reset khi khởi động lại dịch vụ.
- **Ảnh áo** lấy từ ảnh sản phẩm trong CSDL. Hiện toàn bộ ảnh là link ngoài (CDN của Yody); xem mục bản quyền ảnh ở "Trước khi mở bán thật".

## Thanh toán

Trang đặt hàng cho khách hai hình thức:

| Hình thức | Tên hiển thị | Mô tả |
|---|---|---|
| `COD` | Thanh toán khi nhận hàng (COD) | Trả tiền mặt khi nhận hàng |
| `VietQR` | Chuyển khoản | Quét mã QR hoặc chuyển khoản theo thông tin hiện trên trang, hệ thống tự xác nhận khi tiền về |

Dịch vụ `thanhtoan` vẫn hỗ trợ thêm kênh `SePayGateway` (thanh toán thẻ/ví/QR trên cổng SePay), nhưng kênh này **đang ẩn ở trang đặt hàng**. Muốn bật lại, thêm `'SePayGateway'` vào danh sách ở `frontend/src/app/(storefront)/checkout/page.tsx` và điền các biến `SEPAY_PG_*`.

### Chuyển khoản và webhook SePay

Luồng hoạt động: khách chuyển khoản đúng số tiền và đúng nội dung → ngân hàng báo SePay → SePay gọi webhook về `/webhook/sepay` → hệ thống tìm mã `TT…` trong nội dung, khớp với thanh toán đang chờ, kiểm tra **đúng số tiền**, rồi chuyển đơn sang "Chờ xác nhận". Trang thanh toán của khách tự cập nhật sau vài giây.

**Bước 1. Điền tài khoản nhận tiền trong `.env`**

```
NGAN_HANG_TEN=BIDV
NGAN_HANG_BIN=970418                 # mã BIN theo chuẩn VietQR của ngân hàng
NGAN_HANG_SO_TAI_KHOAN=<số tài khoản hoặc tài khoản ảo (VA) trên SePay>
NGAN_HANG_TEN_CHU_TK=<TÊN CHỦ TÀI KHOẢN>
MA_THANH_TOAN_TIEN_TO=TT
```

Mã thanh toán gồm tiền tố và 10 ký tự chữ/số (ví dụ `TTVPSGUWDTV3`). Nếu dùng tài khoản ảo của SePay, điền VA vào `NGAN_HANG_SO_TAI_KHOAN`: hệ thống chấp nhận giao dịch khi số tài khoản chính **hoặc** tài khoản ảo trong webhook (`accountNumber`, `subAccount`) trùng giá trị này.

**Bước 2. Tạo webhook trên my.sepay.vn** (mục Webhooks → Thêm webhook)

| Mục | Giá trị |
|---|---|
| Tab Cơ bản: URL | `https://<tên-miền>/webhook/sepay` |
| Loại giao dịch | **Tiền vào** |
| Định dạng dữ liệu | JSON |
| Tự động gửi lại khi lỗi | Nên bật |
| Tab Bảo mật | Chọn một kiểu xác thực, xem bên dưới |
| Tab Tài khoản | Chọn đúng tài khoản (hoặc VA) nhận tiền của cửa hàng này |

Xác thực webhook (chọn một và cấu hình khớp ở hai phía):
- **HMAC-SHA256** (khuyến nghị): dán Secret Key `whsec_...` của SePay vào `SEPAY_WEBHOOK_SECRET`.
- **API Key**: để trống `SEPAY_WEBHOOK_SECRET` và dán đúng giá trị `SEPAY_WEBHOOK_API_KEY` vào ô API Key của SePay.

Nếu `SEPAY_WEBHOOK_SECRET` có giá trị thì chỉ HMAC được chấp nhận và API Key bị từ chối với lỗi 401.

**Bước 3. Tắt hai bộ lọc "mã thanh toán" của SePay** (tab Tài khoản của webhook)

Đây là lỗi hay gặp nhất: SePay có công tắc **"Dùng để xác thực thanh toán"** và **"Chỉ gửi khi có mã thanh toán"**. Khi bật, SePay chỉ gửi webhook nếu nội dung khớp **cấu trúc mã thanh toán** cấu hình chung trên tài khoản SePay. Nếu cấu trúc đó đặt cho tiền tố khác (ví dụ dự án khác dùng `DH`) thì mã `TT…` bị coi là không có mã và **webhook không được gửi**, trong khi tiền vẫn về tài khoản. Dấu hiệu nhận biết: trong danh sách giao dịch trên SePay, cột *Mã thanh toán* hiện "—" và cột *Tự động* không có nhãn "Webhook".

Cách xử lý: **tắt** hai công tắc này cho webhook của cửa hàng. Hệ thống đã tự tìm mã `TT…` trong nội dung nên không cần SePay lọc giúp. Đừng đổi cấu trúc mã chung nếu tài khoản SePay còn phục vụ dự án khác. Nếu tài khoản có nhiều VA, hãy chọn riêng VA của cửa hàng này ở tab Tài khoản để webhook không nhận nhầm tiền của dự án khác.

**Bước 4. Thử**

Trên SePay có nút gửi webhook thử; bản ghi thử xuất hiện trong bảng giao dịch webhook với kết quả `KhongKhopMa` (bình thường). Sau đó đặt một đơn chuyển khoản thật với số tiền nhỏ: giao dịch trên SePay phải có nhãn "Webhook" và trang thanh toán của khách chuyển sang "Thanh toán thành công".

Webhook cần địa chỉ **công khai trên Internet**: SePay không gọi được `localhost`. Xem [Chạy trên tên miền](#chạy-trên-tên-miền-cloudflare-tunnel).

### Các trạng thái và trường hợp đặc biệt

- Webhook gọi trùng không bị xử lý hai lần (chống trùng theo mã giao dịch của SePay).
- Chuyển **sai số tiền**, **sai mã**, hoặc tiền về **sau khi đơn hết hạn hoặc bị hủy** sẽ vào mục **Cần xử lý** để quản trị đối chiếu và xác nhận hoặc hoàn tiền.
- Khách chuyển **hai lần** cho cùng một đơn: lần đầu được xác nhận, lần sau tạo yêu cầu hoàn tiền.
- Đơn chuyển khoản chỉ hiện QR khi còn ở trạng thái chờ thanh toán. Sau `HAN_THANH_TOAN_PHUT` phút mà chưa thanh toán, đơn chuyển sang "Hết hạn" và trang thanh toán không còn hiện QR.

### Xem giao dịch webhook đã nhận

Mọi webhook hợp lệ được ghi vào bảng `GiaoDichCong` của `ThoiTrang_ThanhToan` (cột `KetQuaXuLy`: `ThanhCong`, `KhongKhopMa`, `SaiSoTien`, `HetHan`, `BoQuaTrung`...). Webhook bị từ chối vì sai xác thực (401) **không** được ghi. Xem nhanh:

```bash
docker compose exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d ThoiTrang_ThanhToan -W -Q "SELECT TOP 10 MaGiaoDichCong, SoTien, KetQuaXuLy, LEFT(NoiDung,40) nd FROM dbo.GiaoDichCong ORDER BY 1 DESC"'
```

Cũng có thể xem ở trang quản trị mục **Thanh toán**, nơi bạn xác nhận thủ công các giao dịch cần xử lý.

### Cổng thanh toán SePay (thẻ/ví, không bắt buộc)

Chỉ cần khi bật lại kênh `SePayGateway`. Điền `SEPAY_PG_MERCHANT_ID` và `SEPAY_PG_SECRET_KEY`. Đặt `SEPAY_PG_MOI_TRUONG=sandbox` để thử, `production` khi chạy thật. Trên SePay, đặt IPN URL là `https://<tên-miền>/ipn/sepay`.

IPN chỉ là tín hiệu: hệ thống luôn gọi lại API của SePay để xác minh trạng thái và số tiền, không tin dữ liệu IPN gửi tới. Có thêm vòng đối soát mỗi phút phòng khi IPN bị mất.

### Hoàn tiền

Hệ thống **không** tự gọi API hoàn tiền. Quản trị tạo yêu cầu, tự chuyển khoản trả khách, rồi bấm "Đã hoàn tiền" trong mục *Thanh toán và hoàn tiền*.

## Email

Dịch vụ `thongbao` gửi email xác thực tài khoản, quên mật khẩu, xác nhận đơn và cập nhật đơn. Email lỗi được lưu lại và `thongbao_gui_lai` thử gửi lại mỗi phút. Xem trạng thái ở `/admin/email-log`.

### Thử nghiệm: Mailpit

Để `MAIL_HOST=mailpit`, `MAIL_PORT=1025` và để trống các biến `MAIL_*` còn lại. Mọi email nằm trong hộp thư http://localhost:8025 và không gửi ra ngoài.

### Gửi email thật bằng Gmail

Gmail không cho dùng mật khẩu đăng nhập thường để gửi qua SMTP. Bạn cần **Mật khẩu ứng dụng**:

1. Bật Xác minh 2 bước cho tài khoản Google.
2. Tạo mật khẩu ứng dụng tại https://myaccount.google.com/apppasswords (16 ký tự).
3. Điền vào `.env`:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<địa chỉ Gmail đầy đủ>
MAIL_PASSWORD=<mật khẩu ứng dụng 16 ký tự, viết liền, không dấu cách>
MAIL_FROM_ADDRESS=<cùng địa chỉ Gmail đó>
```

4. Áp dụng: `docker compose up -d thongbao thongbao_gui_lai`

Nếu log của `thongbao` báo `534 5.7.9 Application-specific password required`, nghĩa là `MAIL_PASSWORD` vẫn là mật khẩu thường.

Khi chạy thật, nên dùng dịch vụ gửi email chuyên dụng và cấu hình SPF/DKIM để email không rơi vào spam.

## Cơ sở dữ liệu

SQL Server chạy trong container `sqlserver`. Dữ liệu nằm trong Docker volume `sqlserver_du_lieu`, không phải một file trong thư mục dự án. Tắt máy, tắt Docker hay `docker compose stop/down` đều không làm mất dữ liệu.

Volume của dự án:

| Volume | Nội dung |
|---|---|
| `sqlserver_du_lieu` | Dữ liệu SQL Server |
| `anh_san_pham` | Ảnh sản phẩm tải lên |
| `khoa_jwt` | Khóa JWT (sinh tự động) |

Script tạo CSDL nằm trong `database/`. Các file `03` và `04` tự bỏ qua nếu bảng đã có, nên nâng cấp một CSDL cũ chỉ cần chạy lại `csdl_khoi_tao` (`docker compose up -d csdl_khoi_tao`) hoặc chạy tay file SQL tương ứng:

| File | Nội dung |
|---|---|
| `01_create_fashion_db.sql` | Tạo 6 CSDL và các bảng |
| `02_service_accounts.sql` | Tạo tài khoản SQL cho từng dịch vụ |
| `03_body_measurements.sql` | Bảng số đo cơ thể và giới tính, dùng để gợi ý size (idempotent, chạy lại an toàn) |
| `04_tin_tuc.sql` | Bảng `TinTuc` (trong `ThoiTrang_SanPham`) cho mục Tin tức |
| `data/` | Dữ liệu sản phẩm CSV theo danh mục (xem [Dữ liệu sản phẩm](#dữ-liệu-sản-phẩm)) |
| `init_db.py` | Chạy các file SQL trên (do `csdl_khoi_tao` gọi) |

### Xem dữ liệu bằng công cụ có giao diện

1. Trong `docker-compose.yml`, bỏ comment dòng `ports: ["127.0.0.1:1433:1433"]` của service `sqlserver`, rồi chạy `docker compose up -d sqlserver`. Cổng này chỉ mở cho chính máy bạn.
2. Dùng Azure Data Studio, SSMS, hoặc extension *SQL Server (mssql)* của VS Code.
3. Kết nối: Server `localhost,1433`, SQL Login, user `sa`, mật khẩu là `MSSQL_SA_PASSWORD` trong `.env`, bật *Trust server certificate*.
4. Xem xong, đóng cổng lại.

### Xem dữ liệu bằng dòng lệnh

```bash
docker compose exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d ThoiTrang_SanPham -Q "SELECT TOP 10 * FROM dbo.SanPham"'
```

### Sao lưu và khôi phục

Dự án **không có sao lưu tự động**. Ví dụ sao lưu một CSDL ra file rồi chép ra khỏi container:

```bash
docker compose exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "BACKUP DATABASE ThoiTrang_DonHang TO DISK = N'"'"'/var/opt/mssql/backup_donhang.bak'"'"' WITH INIT"'
docker compose cp sqlserver:/var/opt/mssql/backup_donhang.bak ./backup_donhang.bak
```

Lặp lại cho cả 6 CSDL, và sao lưu thêm volume `anh_san_pham` và `khoa_jwt`. Hãy **thử khôi phục** ít nhất một lần để chắc bản sao lưu dùng được.

## Lệnh Docker hay dùng

```bash
docker compose ps                       # trạng thái các container
docker compose logs -f giaodien         # xem log một dịch vụ (đổi tên dịch vụ)
docker compose logs --tail 100 thongbao # 100 dòng log cuối
docker compose restart thanhtoan        # khởi động lại một dịch vụ
docker compose up -d --build <dịch-vụ>  # build lại và chạy một dịch vụ
docker compose stop                     # dừng, giữ dữ liệu
docker compose down                     # xóa container, giữ dữ liệu

# Khi chạy trên tên miền, thêm --profile tunnel:
docker compose --profile tunnel up -d --build
docker compose --profile tunnel ps
docker compose logs cloudflared
```

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Vào web báo lỗi ngay sau khi bật Docker | SQL Server chưa lên xong | Đợi khoảng một phút rồi tải lại. Kiểm tra bằng `docker compose ps` |
| Compose báo thiếu biến | Chưa có file `.env` | Chạy `./generate_env.sh` hoặc sao chép `.env.example` thành `.env` |
| Không nhận được email xác thực/quên mật khẩu | Cấu hình SMTP sai, thường là Gmail dùng mật khẩu thường | Xem phần [Email](#email); đọc lỗi bằng `docker compose logs thongbao` |
| Email gửi vào Mailpit nhưng không thấy trong Gmail | `MAIL_HOST` vẫn là `mailpit` | Đổi sang SMTP thật |
| Trang thanh toán chuyển khoản chỉ có số tiền và đồng hồ, không có QR | Đơn đã hết hạn, hoặc `NGAN_HANG_BIN` / `NGAN_HANG_SO_TAI_KHOAN` trống | Đặt đơn mới và thanh toán trong thời gian giữ hàng; kiểm tra các biến `NGAN_HANG_*` |
| Chuyển khoản xong nhưng đơn không tự xác nhận | Webhook của SePay không tới được máy chủ, hoặc bị từ chối | Làm theo danh sách kiểm tra ngay bên dưới bảng này |
| Web báo 502 Bad Gateway sau khi build lại | Nginx còn giữ địa chỉ cũ của container đã tạo lại | `docker compose restart gateway` |
| Vào được `localhost:8080` nhưng không vào được tên miền | Chưa chạy profile `tunnel`, hoặc chưa thêm route cho tunnel | `docker compose --profile tunnel up -d`; kiểm tra `docker compose logs cloudflared` và Public hostname trên Cloudflare (URL `http://gateway:80`) |
| Tạo hostname trên Cloudflare báo trùng bản ghi DNS | Địa chỉ đó đã trỏ về nơi khác | Dùng subdomain khác hoặc xóa bản ghi DNS cũ |
| Đăng nhập xong bị đăng xuất ngay trên tên miền | `COOKIE_SECURE=true` nhưng đang vào bằng HTTP | Truy cập bằng `https://` |
| Link cũ kiểu `/dat-hang`, `/quan-tri` báo 404 | URL đã đổi sang tiếng Anh | Dùng URL mới ở phần [Các trang của website](#các-trang-của-website) |
| `docker compose build` báo "additional privileges requested" | Tính năng bake của Docker Compose đòi quyền đọc file | Chạy lại với biến môi trường `BUILDX_BAKE_ENTITLEMENTS_FS=0`. Nếu vẫn bị, build riêng bằng `docker build -t thoi-trang-<dịch-vụ> <thư-mục>` rồi `docker compose up -d --no-build <dịch-vụ>` |

**Danh sách kiểm tra khi chuyển khoản xong mà đơn không tự xác nhận**, theo thứ tự:

1. **SePay có nhận được tiền không?** Xem danh sách giao dịch trên my.sepay.vn. Không có dòng nào nghĩa là tiền chưa về hoặc ngân hàng chưa đẩy giao dịch.
2. **SePay có gửi webhook không?** Dòng giao dịch phải có nhãn "Webhook" ở cột *Tự động*. Nếu không có và cột *Mã thanh toán* là "—", hãy tắt hai công tắc "Dùng để xác thực thanh toán" và "Chỉ gửi khi có mã thanh toán" (xem [Bước 3](#chuyển-khoản-và-webhook-sepay)).
3. **URL webhook có đúng không?** Phải là `https://<tên-miền-của-cửa-hàng>/webhook/sepay`. Gọi nhầm sang tên miền gốc của dự án khác sẽ không bao giờ tới máy chủ này.
4. **Xác thực có khớp không?** Nếu `SEPAY_WEBHOOK_SECRET` có giá trị thì SePay phải dùng HMAC với đúng secret đó. Webhook bị từ chối (401) không để lại bản ghi trong CSDL.
5. **Webhook có tới nhưng không khớp?** Xem bảng `GiaoDichCong` ([cách xem](#xem-giao-dịch-webhook-đã-nhận)): `KhongKhopMa` (sai nội dung hoặc sai tài khoản), `SaiSoTien` hoặc `HetHan` (đơn nằm ở mục *Cần xử lý* của trang quản trị).
6. **Đơn còn hạn không?** Mỗi đơn chỉ giữ `HAN_THANH_TOAN_PHUT` phút. Tiền về muộn cũng vào *Cần xử lý*.

## Cấu trúc thư mục

```
docker-compose.yml        Định nghĩa toàn bộ dịch vụ (cloudflared nằm trong profile "tunnel")
.env.example              Mẫu cấu hình
generate_env.sh           Sinh .env với mật khẩu ngẫu nhiên
gateway/
  nginx.conf              Cổng vào, giới hạn tốc độ, ảnh tĩnh, webhook
database/
  01_create_fashion_db.sql, 02_service_accounts.sql, 03_body_measurements.sql, 04_tin_tuc.sql
  init_db.py              Trình khởi tạo CSDL
  data/                   Dữ liệu sản phẩm CSV theo danh mục (Nam/Nữ -> Áo/Quần/Váy)
service/
  userservice/            Python · FastAPI
  productservice/         C# · ASP.NET Core
  cartservice/            Node.js · Express
  orderservice/           Java · Spring Boot  (package com.fashionstore.order)
  paymentservice/         Go · Gin  (payment.go, sepay.go, vietqr.go, admin.go)
  notificationservice/    PHP · Laravel
  assistantservice/       Python · FastAPI  (chatbot)
  tryonservice/           Python · FastAPI  (thử đồ AI)
frontend/                 Next.js
  src/app/(storefront)/   Các trang cửa hàng
  src/app/admin/          Các trang quản trị
  src/app/api/            auth/login, auth/logout, và [...path] chuyển tiếp xuống dịch vụ
  src/components/         Thành phần giao diện dùng chung
  src/components/BoLocSanPham.tsx   Bộ lọc thả xuống và thanh kéo giá
  src/lib/                bff.ts (BFF), api.ts, format.ts, i18n.ts
```

## Bảo mật

- JWT RS256: khóa sinh tự động vào volume `khoa_jwt`, các dịch vụ khác chỉ đọc khóa công khai.
- Refresh token ngẫu nhiên, lưu dạng băm, xoay vòng và phát hiện dùng lại.
- Giới hạn đăng nhập sai theo IP và email.
- Mã xác thực và mã đặt lại mật khẩu lưu dạng băm.
- Giá luôn được tính ở máy chủ từ dữ liệu sản phẩm, không tin giá từ trình duyệt.
- Ràng buộc CHECK trong CSDL chống tồn kho âm và giữ chỗ vượt tồn.
- Kiểm tra chữ ký byte của ảnh tải lên.
- Token không lộ ra JavaScript (cookie `httpOnly`, `SameSite=Lax`), kiểm tra `Origin` với yêu cầu ghi để chống CSRF.
- Webhook xác thực bằng HMAC-SHA256 hoặc API Key, so khóa bằng so sánh thời gian hằng số; chỉ cổng `gateway` và tunnel mở ra ngoài, SQL Server và Mailpit chỉ lắng nghe trên `127.0.0.1`.
- Chống trùng mã bằng chỉ mục duy nhất.

Việc cần tự giữ an toàn: `.env` chứa mật khẩu SQL, khóa nội bộ, khóa SePay, mật khẩu email và **token Cloudflare Tunnel** (token này cho phép chạy tunnel nhận traffic của tên miền). Không đưa lên git, không gửi qua chat. Nếu từng để lộ, hãy đổi (với tunnel: xóa và tạo lại tunnel trên Cloudflare).

## Trước khi mở bán thật

**Kỹ thuật**

- [ ] HTTPS: đã có sẵn khi chạy qua Cloudflare Tunnel; nhớ đặt `WEB_URL=https://…` và `COOKIE_SECURE=true`. Nếu không dùng tunnel, đặt Cloudflare hoặc Let's Encrypt phía trước Nginx.
- [ ] Máy chạy Docker phải luôn bật, hoặc chuyển sang VPS để chạy 24/7.
- [ ] Đổi SMTP sang dịch vụ thật, bỏ dịch vụ `mailpit`, cấu hình SPF/DKIM.
- [ ] **Sao lưu** volume `sqlserver_du_lieu`, `anh_san_pham`, `khoa_jwt` hằng ngày, chép ra ngoài máy chủ và thử khôi phục. CSDL ở chế độ FULL nên cần sao lưu log định kỳ.
- [ ] Chỉ mở cổng 80/443 (hoặc không mở gì nếu dùng tunnel). Không mở 1433 và 8025 ra Internet.
- [ ] Chạy thử trọn luồng: đặt COD, đặt chuyển khoản (chuyển thật số tiền nhỏ), hủy đơn, hết hạn giữ hàng, đổi/trả, quên mật khẩu.
- [ ] Kiểm tra `NGAN_HANG_*` là tài khoản thật, webhook SePay trỏ đúng tên miền và xác thực khớp.
- [ ] SQL Server đang dùng bản Express (miễn phí, giới hạn dung lượng và RAM). Cửa hàng lớn cần bản có giấy phép phù hợp.
- [ ] **Bản quyền ảnh và dữ liệu sản phẩm**: ảnh và nội dung sản phẩm mẫu lấy từ Yody (link ngoài tới CDN của họ). Trước khi bán thật hãy thay bằng ảnh và nội dung của chính bạn; cũng cần để tính năng thử đồ gửi ảnh áo cho dịch vụ AI một cách hợp lệ.
- [ ] **Thử đồ AI và chatbot**: dùng dịch vụ miễn phí (Space Hugging Face phi thương mại, Gemini gói miễn phí) nên chỉ phù hợp demo. Bán thật cần model có giấy phép thương mại hoặc dịch vụ trả phí, và rà soát lại điều khoản quyền riêng tư.

**Pháp lý (Việt Nam)** — hãy tự xác nhận lại với nguồn chính thức vì quy định thay đổi thường xuyên:

- Thông báo hoặc đăng ký website thương mại điện tử bán hàng với Bộ Công Thương (online.gov.vn) và hiển thị thông tin chủ sở hữu, chính sách trên website.
- Đối chiếu nghĩa vụ theo Luật Thương mại điện tử, các nghị định hướng dẫn và luật bảo vệ dữ liệu cá nhân (dự án đã có sẵn: đồng ý khi đăng ký, tải dữ liệu, xóa tài khoản). Cần xem thêm về hóa đơn điện tử và thuế hộ kinh doanh.
- Địa chỉ giao hàng dùng 2 cấp (tỉnh/thành, phường/xã). Danh sách trong `frontend/src/lib/format.ts` cần đối chiếu với danh mục hành chính hiện hành.
- Nội dung ở `policies/[slug]` chỉ là **bản mẫu**, không phải tư vấn pháp lý.

## Hạn chế đã biết

- **Webhook SePay đã được thử với giao dịch chuyển khoản thật** (luồng VietQR, tài khoản ảo, xác thực HMAC). **Cổng thanh toán SePay (thẻ/ví, kênh `SePayGateway`) chưa được thử** và đang ẩn ở trang đặt hàng; định dạng phản hồi API tra cứu đơn của cổng này chưa được tài liệu mô tả đầy đủ nên mã đọc theo cách linh hoạt. Hãy thử ở sandbox trước khi bật.
- **Xác nhận chuyển khoản phụ thuộc vào webhook của SePay.** Nếu SePay không gửi (cấu hình bộ lọc sai, tunnel rớt, máy tắt), đơn không tự xác nhận và phải xác nhận thủ công ở trang quản trị.
- **Hoàn tiền thực hiện thủ công**, hệ thống không tự gọi API ngân hàng.
- **Biểu mẫu Liên hệ** chỉ mở ứng dụng email của khách, chưa có hộp thư nhận tin trên máy chủ.
- **Dữ liệu sản phẩm là bản sao từ nguồn bên ngoài** (giá, ảnh dùng link ngoài, tồn kho giả định). Ảnh trỏ về máy chủ nguồn nên có thể hỏng nếu nguồn đổi; cần kiểm tra quyền sử dụng nội dung trước khi bán thật.
- **Mục Tin tức chỉ có văn bản thuần**, chưa có trình soạn thảo định dạng.
- **Chạy trên máy cá nhân** thì web chỉ hoạt động khi máy bật; không có dự phòng.
- **Không có sao lưu tự động**, xem phần [Sao lưu và khôi phục](#sao-lưu-và-khôi-phục).
- **Tên API và CSDL bằng tiếng Việt** không dấu, trong khi tên file, thư mục và URL trang web bằng tiếng Anh. Muốn đổi cả API thì phải sửa đồng bộ giao diện và các dịch vụ.
- Slug của trang chính sách (`van-chuyen`, `doi-tra`…) vẫn bằng tiếng Việt không dấu.
