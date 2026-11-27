# BHD Fashion Store

Website bán hàng thời trang xây theo kiến trúc **microservices**: 6 dịch vụ nghiệp vụ (mỗi dịch vụ một ngôn ngữ), giao diện **Next.js** gồm cửa hàng và trang quản trị, cơ sở dữ liệu **SQL Server**, tất cả chạy bằng **Docker Compose**.

## Mục lục

1. [Kiến trúc](#kiến-trúc)
2. [Yêu cầu](#yêu-cầu)
3. [Chạy dự án](#chạy-dự-án)
4. [Cấu hình `.env`](#cấu-hình-env)
5. [Tạo tài khoản quản trị](#tạo-tài-khoản-quản-trị)
6. [Thiết lập cửa hàng](#thiết-lập-cửa-hàng)
7. [Các trang của website](#các-trang-của-website)
8. [Thanh toán](#thanh-toán)
9. [Email](#email)
10. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
11. [Lệnh Docker hay dùng](#lệnh-docker-hay-dùng)
12. [Xử lý sự cố](#xử-lý-sự-cố)
13. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
14. [Bảo mật](#bảo-mật)
15. [Trước khi mở bán thật](#trước-khi-mở-bán-thật)
16. [Hạn chế đã biết](#hạn-chế-đã-biết)

---

## Kiến trúc

```
Trình duyệt ──► Nginx (cổng 8080) ──┬─► giaodien   Next.js (cửa hàng + admin + BFF)
                                    └─► thanhtoan  /webhook/*, /ipn/*  (SePay)

giaodien (BFF, token nằm trong cookie httpOnly) ──► 6 dịch vụ bên dưới
```

| Dịch vụ | Công nghệ | Nhiệm vụ | CSDL |
|---|---|---|---|
| `nguoidung` | Python · FastAPI | Đăng ký, đăng nhập (JWT RS256), refresh token xoay vòng, địa chỉ, xuất/xóa dữ liệu cá nhân | `ThoiTrang_NguoiDung` |
| `sanpham` | C# · ASP.NET Core | Danh mục, sản phẩm, biến thể, tồn kho và giữ chỗ, ảnh, đánh giá, yêu thích, banner | `ThoiTrang_SanPham` |
| `giohang` | Node.js · Express | Giỏ hàng (khách vãng lai và tài khoản, gộp giỏ khi đăng nhập) | `ThoiTrang_GioHang` |
| `donhang` | Java · Spring Boot | Đặt hàng, mã giảm giá, vòng đời đơn, hủy, đổi/trả, thống kê | `ThoiTrang_DonHang` |
| `thanhtoan` | Go · Gin | COD, VietQR, cổng SePay, webhook ngân hàng, đối soát, hoàn tiền | `ThoiTrang_ThanhToan` |
| `thongbao` | PHP · Laravel | Email giao dịch, thông báo trong ứng dụng, gửi lại khi lỗi | `ThoiTrang_ThongBao` |
| `thongbao_gui_lai` | PHP · Laravel | Chạy lịch Laravel: gửi lại email lỗi mỗi phút | dùng chung với `thongbao` |
| `giaodien` | Next.js | Cửa hàng, trang quản trị, BFF | không có |
| `gateway` | Nginx | Cổng vào duy nhất, giới hạn tốc độ, ảnh tĩnh, webhook | không có |
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

`csdl_khoi_tao` tự tạo CSDL, bảng và tài khoản dịch vụ. Dự án **không có dữ liệu sản phẩm sẵn**; bạn tạo trong trang quản trị hoặc nạp dữ liệu mẫu (xem [Dữ liệu mẫu](#dữ-liệu-mẫu)).

### Các lần sau

| Tình huống | Lệnh |
|---|---|
| Chạy lại, code không đổi | `docker compose up -d` |
| Sau khi sửa code | `docker compose up -d --build` |
| Chỉ build lại một dịch vụ | `docker compose up -d --build giaodien` |
| Dừng, giữ dữ liệu | `docker compose stop` |
| Xóa container, giữ dữ liệu | `docker compose down` |

Các container đặt `restart: unless-stopped` nên tự chạy lại khi Docker Desktop khởi động, trừ khi bạn đã `stop` hoặc `down` trước đó. Sau khi bật Docker, hãy đợi khoảng một phút để SQL Server lên rồi mới vào website.

> **Không dùng `docker compose down -v`.** Cờ `-v` xóa volume, tức xóa toàn bộ CSDL và ảnh sản phẩm.

## Cấu hình `.env`

File `.env` nằm cùng thư mục với `docker-compose.yml`. File này chứa mật khẩu, **không đưa lên git** và không gửi cho người khác.

| Nhóm | Biến | Ý nghĩa |
|---|---|---|
| Chung | `TEN_CUA_HANG` | Tên hiển thị trên website và email |
| | `WEB_URL` | Địa chỉ website, dùng để dựng link trong email và địa chỉ quay về của SePay. Chạy thật phải là `https://tên-miền` |
| | `COOKIE_SECURE` | Đặt `true` khi chạy HTTPS |
| SQL Server | `MSSQL_PHIEN_BAN` | Phiên bản image, mặc định `2022-latest` |
| | `MSSQL_SA_PASSWORD` | Mật khẩu tài khoản `sa`, cần đủ phức tạp |
| | `MK_NGUOIDUNG`, `MK_SANPHAM`, `MK_GIOHANG`, `MK_DONHANG`, `MK_THANHTOAN`, `MK_THONGBAO` | Mật khẩu tài khoản SQL của từng dịch vụ |
| Bảo mật | `KHOA_NOI_BO` | Khóa dùng chung cho các lời gọi nội bộ giữa dịch vụ |
| | `APP_KEY_THONG_BAO` | Khóa ứng dụng Laravel |
| Vận chuyển | `PHI_VAN_CHUYEN` | Phí ship (VND), mặc định 30000 |
| | `MIEN_PHI_VAN_CHUYEN_TU` | Đơn từ mức này trở lên được miễn phí ship, mặc định 500000 |
| | `HAN_THANH_TOAN_PHUT` | Số phút giữ hàng cho đơn thanh toán trước, mặc định 15 |
| Ngân hàng | `NGAN_HANG_TEN`, `NGAN_HANG_BIN`, `NGAN_HANG_SO_TAI_KHOAN`, `NGAN_HANG_TEN_CHU_TK` | Tài khoản nhận tiền cho VietQR |
| | `MA_THANH_TOAN_TIEN_TO` | Tiền tố mã thanh toán, mặc định `TT` |
| SePay | `SEPAY_WEBHOOK_API_KEY`, `SEPAY_WEBHOOK_SECRET` | Xác thực webhook giao dịch ngân hàng |
| | `SEPAY_PG_MERCHANT_ID`, `SEPAY_PG_SECRET_KEY`, `SEPAY_PG_MOI_TRUONG` | Cổng thanh toán thẻ/ví (`sandbox` hoặc `production`) |
| Email | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SCHEME`, `MAIL_FROM_ADDRESS` | Cấu hình SMTP, mặc định gửi vào Mailpit |
| Liên hệ | `LIEN_HE_DIA_CHI`, `LIEN_HE_DIEN_THOAI`, `LIEN_HE_EMAIL`, `LIEN_HE_GIO_LAM_VIEC` | Thông tin ở trang Liên hệ. Để trống sẽ hiện "Đang cập nhật" |

Sau khi sửa `.env`, áp dụng bằng `docker compose up -d`. Compose tự tạo lại những container có biến thay đổi, không cần `--build`.

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

1. **Danh mục**
2. **Sản phẩm**: tạo sản phẩm, thêm biến thể size/màu và tồn kho, tải ảnh, đặt trạng thái "Đang bán"
3. **Banner**
4. **Mã giảm giá**
5. **Chính sách**: sửa nội dung mẫu trong `frontend/src/app/(storefront)/policies/[slug]/page.tsx`

Ghi chú:

- Trang **Ưu đãi** hiển thị các mã giảm giá được tick "Hiển thị công khai ở trang Ưu đãi" và các sản phẩm có giá bán thấp hơn giá niêm yết.
- Trang **Liên hệ** đọc thông tin từ các biến `LIEN_HE_*`. Biểu mẫu hiện mở ứng dụng email của khách với nội dung điền sẵn; chưa có hộp thư nhận tin trên máy chủ.
- Màu sắc và độ bo góc chỉnh tập trung ở khối `:root` trong `frontend/src/app/globals.css`.

### Dữ liệu mẫu

Thư mục `database/` có sẵn script nạp dữ liệu mẫu từ bộ dữ liệu Myntra (`database/archive/`), chỉ lấy áo, quần, váy, giày và chỉ dùng ảnh không có người mẫu:

| File | Việc làm |
|---|---|
| `database/filter_no_model_images.py` | Lọc ảnh không có người mẫu, ghi ra `no_model_images.txt` |
| `database/seed_sample_data.py` | Sinh dữ liệu mẫu ra một thư mục trống: `python seed_sample_data.py --out <thư_mục_trống> [--so-luong 800] [--seed 1]` |

## Các trang của website

### Cửa hàng

| URL | Trang |
|---|---|
| `/` | Trang chủ |
| `/products` | Danh sách sản phẩm (lọc theo danh mục, bộ sưu tập, nổi bật, giảm giá) |
| `/products/<slug>` | Chi tiết sản phẩm, đánh giá |
| `/deals` | Ưu đãi |
| `/cart` | Giỏ hàng |
| `/checkout` | Đặt hàng |
| `/payment/<mã>` | Thanh toán đơn (hiện QR và thông tin tài khoản với VietQR) |
| `/payment/result` | Trang SePay chuyển khách về sau khi thanh toán |
| `/track-order` | Tra cứu đơn hàng |
| `/login`, `/register` | Đăng nhập, đăng ký |
| `/forgot-password`, `/reset-password` | Quên và đặt lại mật khẩu |
| `/verify-email` | Xác thực email |
| `/account` | Thông tin tài khoản và địa chỉ |
| `/account/orders` | Đơn hàng của tôi |
| `/account/wishlist` | Sản phẩm yêu thích |
| `/size-guide` | Gợi ý size |
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
| `/admin/coupons` | Mã giảm giá |
| `/admin/reviews` | Đánh giá |
| `/admin/users` | Người dùng |
| `/admin/email-log` | Nhật ký gửi email |

### Đường dẫn API

Trình duyệt gọi `/api/...` trên Next.js. Next.js chuyển tiếp xuống dịch vụ tương ứng (bảng định tuyến ở `frontend/src/lib/bff.ts`), và các đường dẫn này **giữ tên tiếng Việt** vì đó là hợp đồng giữa giao diện và dịch vụ, ví dụ `/api/san-pham`, `/api/don-hang`, `/api/quan-tri/...`.

Hai đường dẫn do Next.js tự xử lý (không chuyển xuống dịch vụ):

- `POST /api/auth/login`
- `POST /api/auth/logout`

## Thanh toán

Ba hình thức, khách chọn lúc đặt hàng:

| Hình thức | Mô tả |
|---|---|
| **COD** | Trả tiền mặt khi nhận hàng |
| **VietQR** | Chuyển khoản qua mã QR và thông tin tài khoản, hệ thống tự xác nhận khi tiền về |
| **SePayGateway** | Thanh toán thẻ, ví, QR trên cổng của SePay |

### VietQR và webhook SePay

1. Điền `NGAN_HANG_TEN`, `NGAN_HANG_BIN` (mã BIN theo chuẩn VietQR), `NGAN_HANG_SO_TAI_KHOAN`, `NGAN_HANG_TEN_CHU_TK` trong `.env`.
2. Trên my.sepay.vn: liên kết tài khoản ngân hàng đó và cấu hình **tiền tố nhận diện mã thanh toán** trùng `MA_THANH_TOAN_TIEN_TO` (mặc định `TT`; mã gồm tiền tố và 10 ký tự chữ/số). Sau đó tạo **Webhook**:
   - URL: `https://<tên-miền>/webhook/sepay`
   - Xác thực (chọn một): **HMAC-SHA256** (khuyến nghị): dán Secret Key `whsec_...` của SePay vào `SEPAY_WEBHOOK_SECRET`; hoặc **API Key**: dán đúng giá trị `SEPAY_WEBHOOK_API_KEY`. Nếu `SEPAY_WEBHOOK_SECRET` có giá trị thì chỉ HMAC được chấp nhận.
3. Webhook cần địa chỉ **công khai trên Internet**. SePay không gọi được `localhost`; khi thử trên máy cá nhân hãy dùng Cloudflare Tunnel hoặc ngrok trỏ tới cổng 8080.

Cách hoạt động: khách chuyển khoản đúng nội dung, SePay gọi webhook, hệ thống khớp mã và kiểm tra **đúng số tiền**, rồi chuyển đơn sang "Chờ xác nhận". Webhook gọi trùng không bị xử lý hai lần. Các trường hợp sai số tiền, sai mã, hoặc tiền về sau khi đơn đã hết hạn hoặc bị hủy sẽ vào mục **Cần xử lý** để quản trị đối chiếu và xác nhận hoặc hoàn tiền.

Đơn VietQR chỉ hiện QR khi còn ở trạng thái chờ thanh toán. Sau `HAN_THANH_TOAN_PHUT` phút mà chưa thanh toán, đơn chuyển sang "Hết hạn" và trang thanh toán không còn hiện QR.

### Cổng thanh toán SePay (thẻ/ví)

Điền `SEPAY_PG_MERCHANT_ID` và `SEPAY_PG_SECRET_KEY`. Đặt `SEPAY_PG_MOI_TRUONG=sandbox` để thử, `production` khi chạy thật. Trên SePay, đặt IPN URL là `https://<tên-miền>/ipn/sepay`.

IPN chỉ là tín hiệu: hệ thống luôn gọi lại API của SePay để xác minh trạng thái và số tiền, không tin dữ liệu IPN gửi tới. Có thêm vòng đối soát mỗi phút phòng khi IPN bị mất. Nếu chỉ dùng VietQR thì không cần điền hai biến này.

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

Script tạo CSDL nằm trong `database/`:

| File | Nội dung |
|---|---|
| `01_create_fashion_db.sql` | Tạo 6 CSDL và các bảng |
| `02_service_accounts.sql` | Tạo tài khoản SQL cho từng dịch vụ |
| `03_body_measurements.sql` | Bảng số đo cơ thể, dùng để gợi ý size |
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

Lặp lại cho cả 6 CSDL, và sao lưu thêm volume `anh_san_pham`. Hãy **thử khôi phục** ít nhất một lần để chắc bản sao lưu dùng được.

## Lệnh Docker hay dùng

```bash
docker compose ps                       # trạng thái các container
docker compose logs -f giaodien         # xem log một dịch vụ (đổi tên dịch vụ)
docker compose logs --tail 100 thongbao # 100 dòng log cuối
docker compose restart thanhtoan        # khởi động lại một dịch vụ
docker compose up -d --build <dịch-vụ>  # build lại và chạy một dịch vụ
docker compose stop                     # dừng, giữ dữ liệu
docker compose down                     # xóa container, giữ dữ liệu
```

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Vào web báo lỗi ngay sau khi bật Docker | SQL Server chưa lên xong | Đợi khoảng một phút rồi tải lại. Kiểm tra bằng `docker compose ps` |
| Compose báo thiếu biến | Chưa có file `.env` | Chạy `./generate_env.sh` hoặc sao chép `.env.example` thành `.env` |
| Không nhận được email xác thực/quên mật khẩu | Cấu hình SMTP sai, thường là Gmail dùng mật khẩu thường | Xem phần [Email](#email); đọc lỗi bằng `docker compose logs thongbao` |
| Email gửi vào Mailpit nhưng không thấy trong Gmail | `MAIL_HOST` vẫn là `mailpit` | Đổi sang SMTP thật |
| Chọn chuyển khoản nhưng không thấy QR | Đơn đã quá `HAN_THANH_TOAN_PHUT` phút nên chuyển sang "Hết hạn" | Đặt đơn mới và thanh toán trong thời gian giữ hàng |
| Chuyển khoản xong nhưng đơn không tự xác nhận | SePay không gọi được webhook vì `WEB_URL` là `localhost` | Dùng tunnel công khai, cấu hình webhook trên SePay. Xem phần [Thanh toán](#thanh-toán) |
| Link cũ kiểu `/dat-hang`, `/quan-tri` báo 404 | URL đã đổi sang tiếng Anh | Dùng URL mới ở phần [Các trang của website](#các-trang-của-website) |
| `docker compose build` báo "additional privileges requested" | Tính năng bake của Docker Compose đòi quyền đọc file | Chạy lại với biến môi trường `BUILDX_BAKE_ENTITLEMENTS_FS=0`, hoặc `COMPOSE_BAKE=false` |

## Cấu trúc thư mục

```
docker-compose.yml        Định nghĩa toàn bộ dịch vụ
.env.example              Mẫu cấu hình
generate_env.sh           Sinh .env với mật khẩu ngẫu nhiên
gateway/
  nginx.conf              Cổng vào, giới hạn tốc độ, ảnh tĩnh, webhook
database/
  01_create_fashion_db.sql, 02_service_accounts.sql, 03_body_measurements.sql
  init_db.py              Trình khởi tạo CSDL
  filter_no_model_images.py, seed_sample_data.py, no_model_images.txt
  archive/                Bộ dữ liệu Myntra dùng cho dữ liệu mẫu
service/
  userservice/            Python · FastAPI
  productservice/         C# · ASP.NET Core
  cartservice/            Node.js · Express
  orderservice/           Java · Spring Boot  (package com.fashionstore.order)
  paymentservice/         Go · Gin
  notificationservice/    PHP · Laravel
frontend/                 Next.js
  src/app/(storefront)/   Các trang cửa hàng
  src/app/admin/          Các trang quản trị
  src/app/api/            auth/login, auth/logout, và [...path] chuyển tiếp xuống dịch vụ
  src/components/         Thành phần giao diện dùng chung
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
- Webhook so khóa bằng so sánh thời gian hằng số.
- Chống trùng mã bằng chỉ mục duy nhất.

Việc cần tự giữ an toàn: `.env` chứa mật khẩu SQL, khóa nội bộ, khóa SePay và mật khẩu email. Không đưa lên git, không gửi qua chat. Nếu từng để lộ, hãy đổi.

## Trước khi mở bán thật

**Kỹ thuật**

- [ ] HTTPS: đặt Cloudflare phía trước hoặc cấu hình Let's Encrypt cho Nginx; đặt `WEB_URL=https://…` và `COOKIE_SECURE=true`.
- [ ] Đổi SMTP sang dịch vụ thật, bỏ dịch vụ `mailpit`, cấu hình SPF/DKIM.
- [ ] **Sao lưu** volume `sqlserver_du_lieu` và `anh_san_pham` hằng ngày, chép ra ngoài máy chủ và thử khôi phục. CSDL ở chế độ FULL nên cần sao lưu log định kỳ.
- [ ] Chỉ mở cổng 80/443. Không mở 1433 và 8025 ra Internet.
- [ ] Chạy thử trọn luồng: đặt COD, đặt VietQR (chuyển thật số tiền nhỏ), cổng SePay sandbox, hủy đơn, hết hạn giữ hàng, đổi/trả, quên mật khẩu.
- [ ] SQL Server đang dùng bản Express (miễn phí, giới hạn dung lượng và RAM). Cửa hàng lớn cần bản có giấy phép phù hợp.

**Pháp lý (Việt Nam)** — hãy tự xác nhận lại với nguồn chính thức vì quy định thay đổi thường xuyên:

- Thông báo hoặc đăng ký website thương mại điện tử bán hàng với Bộ Công Thương (online.gov.vn) và hiển thị thông tin chủ sở hữu, chính sách trên website.
- Đối chiếu nghĩa vụ theo Luật Thương mại điện tử, các nghị định hướng dẫn và luật bảo vệ dữ liệu cá nhân (dự án đã có sẵn: đồng ý khi đăng ký, tải dữ liệu, xóa tài khoản). Cần xem thêm về hóa đơn điện tử và thuế hộ kinh doanh.
- Địa chỉ giao hàng dùng 2 cấp (tỉnh/thành, phường/xã). Danh sách trong `frontend/src/lib/format.ts` cần đối chiếu với danh mục hành chính hiện hành.
- Nội dung ở `policies/[slug]` chỉ là **bản mẫu**, không phải tư vấn pháp lý.

## Hạn chế đã biết

- **Webhook SePay chưa được thử với giao dịch thật.** Cấu trúc dữ liệu dựng theo tài liệu công khai của SePay. Riêng định dạng phản hồi API tra cứu đơn của cổng thanh toán chưa được tài liệu mô tả đầy đủ nên mã đọc theo cách linh hoạt. Hãy thử ở sandbox trước.
- **Hoàn tiền thực hiện thủ công**, hệ thống không tự gọi API ngân hàng.
- **Biểu mẫu Liên hệ** chỉ mở ứng dụng email của khách, chưa có hộp thư nhận tin trên máy chủ.
- **Không có sao lưu tự động**, xem phần [Sao lưu và khôi phục](#sao-lưu-và-khôi-phục).
- **Tên API và CSDL bằng tiếng Việt** không dấu, trong khi tên file, thư mục và URL trang web bằng tiếng Anh. Muốn đổi cả API thì phải sửa đồng bộ giao diện và 6 dịch vụ.
- Slug của trang chính sách (`van-chuyen`, `doi-tra`…) vẫn bằng tiếng Việt không dấu.
