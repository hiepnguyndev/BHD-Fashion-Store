/* ============================================================================
   CỬA HÀNG THỜI TRANG – SCRIPT TẠO CSDL (SQL Server 2022/2025)

   • 6 CSDL, mỗi dịch vụ một CSDL. Tên CSDL, bảng, cột, ràng buộc: tiếng Việt không dấu.
   • Chỉ tạo cấu trúc. KHÔNG có INSERT, không nạp dữ liệu mẫu.
   • Cột ghi "ID ngoài" lưu mã của CSDL khác: không có khóa ngoại (microservice
     không tham chiếu chéo CSDL).
   • Thời gian lưu theo UTC (SYSUTCDATETIME). Tiền VND dùng DECIMAL(18,0).
   • Chạy 1 lần trên máy chủ trống bằng SSMS, Azure Data Studio hoặc sqlcmd -I.
   ============================================================================ */


-- ===== 1/6 ThoiTrang_NguoiDung (UserService - Python) =====
IF DB_ID(N'ThoiTrang_NguoiDung') IS NULL
    CREATE DATABASE ThoiTrang_NguoiDung COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_NguoiDung SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_NguoiDung;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.NguoiDung (
    MaNguoiDung         INT           IDENTITY(1,1) NOT NULL,
    HoTen               NVARCHAR(100) NOT NULL,
    Email               VARCHAR(150)  NOT NULL,
    SoDienThoai         VARCHAR(15)   NULL,
    MatKhauBam          VARCHAR(255)  NOT NULL,   -- chuỗi băm (bcrypt/argon2), không lưu mật khẩu gốc
    VaiTro              VARCHAR(20)   NOT NULL CONSTRAINT DF_NguoiDung_VaiTro DEFAULT 'KhachHang',
    TrangThai           VARCHAR(20)   NOT NULL CONSTRAINT DF_NguoiDung_TrangThai DEFAULT 'HoatDong',
    EmailDaXacThuc      BIT           NOT NULL CONSTRAINT DF_NguoiDung_EmailDaXacThuc DEFAULT 0,
    NgayDongYChinhSach  DATETIME2(3)  NULL,       -- lúc đồng ý chính sách bảo mật (Luật Bảo vệ dữ liệu cá nhân)
    PhienBanChinhSach   VARCHAR(20)   NULL,
    LanDangNhapCuoi     DATETIME2(3)  NULL,
    NgayTao             DATETIME2(3)  NOT NULL CONSTRAINT DF_NguoiDung_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat         DATETIME2(3)  NOT NULL CONSTRAINT DF_NguoiDung_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_NguoiDung PRIMARY KEY (MaNguoiDung),
    CONSTRAINT UQ_NguoiDung_Email UNIQUE (Email),
    CONSTRAINT CK_NguoiDung_VaiTro CHECK (VaiTro IN ('KhachHang','QuanTri')),
    CONSTRAINT CK_NguoiDung_TrangThai CHECK (TrangThai IN ('HoatDong','Khoa','DaXoa'))
);
GO

CREATE TABLE dbo.DiaChi (
    MaDiaChi      INT           IDENTITY(1,1) NOT NULL,
    MaNguoiDung   INT           NOT NULL,
    TenNguoiNhan  NVARCHAR(100) NOT NULL,
    SoDienThoai   VARCHAR(15)   NOT NULL,
    DiaChiCuThe   NVARCHAR(255) NOT NULL,         -- số nhà, đường
    MaPhuongXa    VARCHAR(20)   NULL,             -- mã theo danh mục của đơn vị vận chuyển
    PhuongXa      NVARCHAR(100) NOT NULL,
    MaTinhThanh   VARCHAR(20)   NULL,
    TinhThanh     NVARCHAR(100) NOT NULL,
    MacDinh       BIT           NOT NULL CONSTRAINT DF_DiaChi_MacDinh DEFAULT 0,
    NgayTao       DATETIME2(3)  NOT NULL CONSTRAINT DF_DiaChi_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DiaChi PRIMARY KEY (MaDiaChi),
    CONSTRAINT FK_DiaChi_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung (MaNguoiDung) ON DELETE CASCADE
);
CREATE INDEX IX_DiaChi_MaNguoiDung ON dbo.DiaChi (MaNguoiDung);
CREATE UNIQUE INDEX UX_DiaChi_MacDinh ON dbo.DiaChi (MaNguoiDung) WHERE MacDinh = 1;   -- mỗi người một địa chỉ mặc định
GO

CREATE TABLE dbo.PhienDangNhap (
    MaPhien       BIGINT        IDENTITY(1,1) NOT NULL,
    MaNguoiDung   INT           NOT NULL,
    MaLamMoiBam   CHAR(64)      NOT NULL,         -- SHA-256 (hex) của refresh token
    ThietBi       NVARCHAR(200) NULL,
    DiaChiIP      VARCHAR(45)   NULL,
    NgayTao       DATETIME2(3)  NOT NULL CONSTRAINT DF_PhienDangNhap_NgayTao DEFAULT SYSUTCDATETIME(),
    HetHanLuc     DATETIME2(3)  NOT NULL,
    DaThuHoi      BIT           NOT NULL CONSTRAINT DF_PhienDangNhap_DaThuHoi DEFAULT 0,
    ThuHoiLuc     DATETIME2(3)  NULL,
    CONSTRAINT PK_PhienDangNhap PRIMARY KEY (MaPhien),
    CONSTRAINT UQ_PhienDangNhap_MaLamMoiBam UNIQUE (MaLamMoiBam),
    CONSTRAINT FK_PhienDangNhap_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung (MaNguoiDung) ON DELETE CASCADE
);
CREATE INDEX IX_PhienDangNhap_NguoiDung ON dbo.PhienDangNhap (MaNguoiDung, DaThuHoi);
GO

CREATE TABLE dbo.MaXacThuc (
    MaXacThuc     BIGINT        IDENTITY(1,1) NOT NULL,
    MaNguoiDung   INT           NOT NULL,
    Loai          VARCHAR(20)   NOT NULL,
    MaBam         CHAR(64)      NOT NULL,         -- SHA-256 (hex) của mã gửi qua email
    HetHanLuc     DATETIME2(3)  NOT NULL,
    DaDung        BIT           NOT NULL CONSTRAINT DF_MaXacThuc_DaDung DEFAULT 0,
    NgayTao       DATETIME2(3)  NOT NULL CONSTRAINT DF_MaXacThuc_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MaXacThuc PRIMARY KEY (MaXacThuc),
    CONSTRAINT UQ_MaXacThuc_MaBam UNIQUE (MaBam),
    CONSTRAINT CK_MaXacThuc_Loai CHECK (Loai IN ('XacThucEmail','DatLaiMatKhau')),
    CONSTRAINT FK_MaXacThuc_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung (MaNguoiDung) ON DELETE CASCADE
);
CREATE INDEX IX_MaXacThuc_NguoiDung ON dbo.MaXacThuc (MaNguoiDung, Loai, DaDung);
GO


-- ===== 2/6 ThoiTrang_SanPham (ProductService - C#) =====
IF DB_ID(N'ThoiTrang_SanPham') IS NULL
    CREATE DATABASE ThoiTrang_SanPham COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_SanPham SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_SanPham;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.DanhMuc (
    MaDanhMuc     INT           IDENTITY(1,1) NOT NULL,
    MaDanhMucCha  INT           NULL,
    TenDanhMuc    NVARCHAR(100) NOT NULL,
    TenKhongDau   VARCHAR(120)  NULL,             -- ứng dụng điền, dùng để tìm kiếm không dấu
    DuongDan      VARCHAR(120)  NOT NULL,         -- slug cho URL
    MoTa          NVARCHAR(500) NULL,
    ThuTu         INT           NOT NULL CONSTRAINT DF_DanhMuc_ThuTu DEFAULT 0,
    HienThi       BIT           NOT NULL CONSTRAINT DF_DanhMuc_HienThi DEFAULT 1,
    NgayTao       DATETIME2(3)  NOT NULL CONSTRAINT DF_DanhMuc_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DanhMuc PRIMARY KEY (MaDanhMuc),
    CONSTRAINT UQ_DanhMuc_DuongDan UNIQUE (DuongDan),
    CONSTRAINT FK_DanhMuc_DanhMucCha FOREIGN KEY (MaDanhMucCha) REFERENCES dbo.DanhMuc (MaDanhMuc),
    CONSTRAINT CK_DanhMuc_KhongTuCha CHECK (MaDanhMucCha IS NULL OR MaDanhMucCha <> MaDanhMuc)
);
CREATE INDEX IX_DanhMuc_MaDanhMucCha ON dbo.DanhMuc (MaDanhMucCha);
GO

CREATE TABLE dbo.BoSuuTap (
    MaBoSuuTap    INT            IDENTITY(1,1) NOT NULL,
    TenBoSuuTap   NVARCHAR(150)  NOT NULL,
    DuongDan      VARCHAR(160)   NOT NULL,
    MoTa          NVARCHAR(1000) NULL,
    AnhBia        VARCHAR(300)   NULL,
    HienThi       BIT            NOT NULL CONSTRAINT DF_BoSuuTap_HienThi DEFAULT 1,
    NgayBatDau    DATETIME2(0)   NULL,
    NgayKetThuc   DATETIME2(0)   NULL,
    NgayTao       DATETIME2(3)   NOT NULL CONSTRAINT DF_BoSuuTap_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BoSuuTap PRIMARY KEY (MaBoSuuTap),
    CONSTRAINT UQ_BoSuuTap_DuongDan UNIQUE (DuongDan)
);
GO

CREATE TABLE dbo.SanPham (
    MaSanPham       INT           IDENTITY(1,1) NOT NULL,
    MaDanhMuc       INT           NOT NULL,
    TenSanPham      NVARCHAR(200) NOT NULL,
    TenKhongDau     VARCHAR(250)  NULL,           -- ứng dụng điền, dùng để tìm kiếm không dấu
    DuongDan        VARCHAR(220)  NOT NULL,
    ThuongHieu      NVARCHAR(100) NULL,
    ChatLieu        NVARCHAR(100) NULL,
    MoTaNgan        NVARCHAR(500) NULL,
    MoTa            NVARCHAR(MAX) NULL,
    GiaGoc          DECIMAL(18,0) NOT NULL,       -- giá niêm yết
    GiaBan          DECIMAL(18,0) NOT NULL,       -- giá đang bán
    TrangThai       VARCHAR(20)   NOT NULL CONSTRAINT DF_SanPham_TrangThai DEFAULT 'An',
    NoiBat          BIT           NOT NULL CONSTRAINT DF_SanPham_NoiBat DEFAULT 0,
    SoLuongDaBan    INT           NOT NULL CONSTRAINT DF_SanPham_SoLuongDaBan DEFAULT 0,
    DiemDanhGiaTB   DECIMAL(3,2)  NOT NULL CONSTRAINT DF_SanPham_DiemDanhGiaTB DEFAULT 0,
    SoLuotDanhGia   INT           NOT NULL CONSTRAINT DF_SanPham_SoLuotDanhGia DEFAULT 0,
    NgayTao         DATETIME2(3)  NOT NULL CONSTRAINT DF_SanPham_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat     DATETIME2(3)  NOT NULL CONSTRAINT DF_SanPham_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SanPham PRIMARY KEY (MaSanPham),
    CONSTRAINT UQ_SanPham_DuongDan UNIQUE (DuongDan),
    CONSTRAINT FK_SanPham_DanhMuc FOREIGN KEY (MaDanhMuc) REFERENCES dbo.DanhMuc (MaDanhMuc),
    CONSTRAINT CK_SanPham_TrangThai CHECK (TrangThai IN ('An','DangBan','NgungBan')),   -- mặc định 'An': chưa hiển thị cho khách
    CONSTRAINT CK_SanPham_Gia CHECK (GiaGoc >= 0 AND GiaBan >= 0 AND GiaBan <= GiaGoc),
    CONSTRAINT CK_SanPham_Diem CHECK (DiemDanhGiaTB BETWEEN 0 AND 5)
);
CREATE INDEX IX_SanPham_DanhMuc ON dbo.SanPham (MaDanhMuc, TrangThai);
CREATE INDEX IX_SanPham_TenKhongDau ON dbo.SanPham (TenKhongDau);
CREATE INDEX IX_SanPham_NoiBat ON dbo.SanPham (NgayTao DESC) WHERE NoiBat = 1;
GO

CREATE TABLE dbo.BienTheSanPham (
    MaBienThe       INT           IDENTITY(1,1) NOT NULL,
    MaSanPham       INT           NOT NULL,
    MaHang          VARCHAR(50)   NOT NULL,         -- mã hàng (SKU)
    KichCo          VARCHAR(10)   NOT NULL,
    MauSac          NVARCHAR(50)  NOT NULL,
    MaMau           VARCHAR(7)    NULL,             -- vd #FFFFFF
    GiaRieng        DECIMAL(18,0) NULL,             -- NULL = dùng giá của sản phẩm
    SoLuongTon      INT           NOT NULL CONSTRAINT DF_BienTheSanPham_SoLuongTon DEFAULT 0,
    SoLuongGiuCho   INT           NOT NULL CONSTRAINT DF_BienTheSanPham_SoLuongGiuCho DEFAULT 0,   -- đang giữ cho đơn chưa thanh toán
    HienThi         BIT           NOT NULL CONSTRAINT DF_BienTheSanPham_HienThi DEFAULT 1,
    CONSTRAINT PK_BienTheSanPham PRIMARY KEY (MaBienThe),
    CONSTRAINT UQ_BienTheSanPham_MaHang UNIQUE (MaHang),
    CONSTRAINT UQ_BienTheSanPham_SanPham_KichCo_MauSac UNIQUE (MaSanPham, KichCo, MauSac),
    CONSTRAINT FK_BienTheSanPham_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham (MaSanPham) ON DELETE CASCADE,
    CONSTRAINT CK_BienTheSanPham_Ton CHECK (SoLuongTon >= 0 AND SoLuongGiuCho >= 0 AND SoLuongGiuCho <= SoLuongTon),   -- chặn bán lố
    CONSTRAINT CK_BienTheSanPham_GiaRieng CHECK (GiaRieng IS NULL OR GiaRieng >= 0)
);
GO

CREATE TABLE dbo.HinhAnhSanPham (
    MaHinhAnh     INT           IDENTITY(1,1) NOT NULL,
    MaSanPham     INT           NOT NULL,
    MauSac        NVARCHAR(50)  NULL,               -- ảnh theo màu (NULL = ảnh chung)
    DuongDanAnh   VARCHAR(300)  NOT NULL,
    ChuThich      NVARCHAR(200) NULL,
    LaAnhChinh    BIT           NOT NULL CONSTRAINT DF_HinhAnhSanPham_LaAnhChinh DEFAULT 0,
    ThuTu         INT           NOT NULL CONSTRAINT DF_HinhAnhSanPham_ThuTu DEFAULT 0,
    NgayTao       DATETIME2(3)  NOT NULL CONSTRAINT DF_HinhAnhSanPham_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_HinhAnhSanPham PRIMARY KEY (MaHinhAnh),
    CONSTRAINT FK_HinhAnhSanPham_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham (MaSanPham) ON DELETE CASCADE
);
CREATE INDEX IX_HinhAnhSanPham_SanPham ON dbo.HinhAnhSanPham (MaSanPham, ThuTu);
CREATE UNIQUE INDEX UX_HinhAnhSanPham_AnhChinh ON dbo.HinhAnhSanPham (MaSanPham) WHERE LaAnhChinh = 1;
GO

CREATE TABLE dbo.BoSuuTapSanPham (
    MaBoSuuTap    INT NOT NULL,
    MaSanPham     INT NOT NULL,
    ThuTu         INT NOT NULL CONSTRAINT DF_BoSuuTapSanPham_ThuTu DEFAULT 0,
    CONSTRAINT PK_BoSuuTapSanPham PRIMARY KEY (MaBoSuuTap, MaSanPham),
    CONSTRAINT FK_BoSuuTapSanPham_BoSuuTap FOREIGN KEY (MaBoSuuTap) REFERENCES dbo.BoSuuTap (MaBoSuuTap) ON DELETE CASCADE,
    CONSTRAINT FK_BoSuuTapSanPham_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham (MaSanPham) ON DELETE CASCADE
);
CREATE INDEX IX_BoSuuTapSanPham_SanPham ON dbo.BoSuuTapSanPham (MaSanPham);
GO

CREATE TABLE dbo.DanhGia (
    MaDanhGia        INT            IDENTITY(1,1) NOT NULL,
    MaSanPham        INT            NOT NULL,
    MaNguoiDung      INT            NOT NULL,       -- ID ngoài (ThoiTrang_NguoiDung)
    MaDonHang        INT            NULL,           -- ID ngoài (ThoiTrang_DonHang), dùng để xác nhận đã mua
    TenNguoiDanhGia  NVARCHAR(100)  NOT NULL,
    SoSao            TINYINT        NOT NULL,
    NoiDung          NVARCHAR(1000) NULL,
    DaMuaHang        BIT            NOT NULL CONSTRAINT DF_DanhGia_DaMuaHang DEFAULT 0,
    TrangThai        VARCHAR(20)    NOT NULL CONSTRAINT DF_DanhGia_TrangThai DEFAULT 'ChoDuyet',
    NgayTao          DATETIME2(3)   NOT NULL CONSTRAINT DF_DanhGia_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DanhGia PRIMARY KEY (MaDanhGia),
    CONSTRAINT UQ_DanhGia_SanPham_NguoiDung UNIQUE (MaSanPham, MaNguoiDung),
    CONSTRAINT FK_DanhGia_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham (MaSanPham) ON DELETE CASCADE,
    CONSTRAINT CK_DanhGia_SoSao CHECK (SoSao BETWEEN 1 AND 5),
    CONSTRAINT CK_DanhGia_TrangThai CHECK (TrangThai IN ('ChoDuyet','HienThi','An'))
);
CREATE INDEX IX_DanhGia_SanPham ON dbo.DanhGia (MaSanPham, TrangThai, NgayTao DESC);
GO

CREATE TABLE dbo.YeuThich (
    MaNguoiDung   INT          NOT NULL,            -- ID ngoài (ThoiTrang_NguoiDung)
    MaSanPham     INT          NOT NULL,
    NgayTao       DATETIME2(3) NOT NULL CONSTRAINT DF_YeuThich_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_YeuThich PRIMARY KEY (MaNguoiDung, MaSanPham),
    CONSTRAINT FK_YeuThich_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham (MaSanPham) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.LichSuTonKho (
    MaLichSu          BIGINT        IDENTITY(1,1) NOT NULL,
    MaBienThe         INT           NOT NULL,
    LoaiBienDong      VARCHAR(20)   NOT NULL,
    ThayDoiTon        INT           NOT NULL CONSTRAINT DF_LichSuTonKho_ThayDoiTon DEFAULT 0,       -- cộng/trừ vào SoLuongTon
    ThayDoiGiuCho     INT           NOT NULL CONSTRAINT DF_LichSuTonKho_ThayDoiGiuCho DEFAULT 0,    -- cộng/trừ vào SoLuongGiuCho
    MaThamChieu       VARCHAR(50)   NULL,             -- vd mã đơn hàng, mã phiếu nhập
    GhiChu            NVARCHAR(300) NULL,
    NguoiThucHien     INT           NULL,             -- ID ngoài (quản trị viên)
    NgayTao           DATETIME2(3)  NOT NULL CONSTRAINT DF_LichSuTonKho_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LichSuTonKho PRIMARY KEY (MaLichSu),
    CONSTRAINT FK_LichSuTonKho_BienTheSanPham FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham (MaBienThe),
    CONSTRAINT CK_LichSuTonKho_Loai CHECK (LoaiBienDong IN ('NhapKho','GiuCho','NhaGiuCho','Ban','HoanKho','DieuChinh')),
    CONSTRAINT CK_LichSuTonKho_CoThayDoi CHECK (ThayDoiTon <> 0 OR ThayDoiGiuCho <> 0)
);
CREATE INDEX IX_LichSuTonKho_BienThe ON dbo.LichSuTonKho (MaBienThe, NgayTao DESC);
CREATE INDEX IX_LichSuTonKho_MaThamChieu ON dbo.LichSuTonKho (MaThamChieu);
GO

CREATE TABLE dbo.Banner (
    MaBanner               INT           IDENTITY(1,1) NOT NULL,
    TieuDe                 NVARCHAR(150) NOT NULL,
    DuongDanAnh            VARCHAR(300)  NOT NULL,
    DuongDanAnhDienThoai   VARCHAR(300)  NULL,
    LienKet                VARCHAR(300)  NULL,
    ViTri                  VARCHAR(20)   NOT NULL CONSTRAINT DF_Banner_ViTri DEFAULT 'TrangChu',
    ThuTu                  INT           NOT NULL CONSTRAINT DF_Banner_ThuTu DEFAULT 0,
    HienThi                BIT           NOT NULL CONSTRAINT DF_Banner_HienThi DEFAULT 1,
    NgayBatDau             DATETIME2(0)  NULL,
    NgayKetThuc            DATETIME2(0)  NULL,
    NgayTao                DATETIME2(3)  NOT NULL CONSTRAINT DF_Banner_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Banner PRIMARY KEY (MaBanner),
    CONSTRAINT CK_Banner_ViTri CHECK (ViTri IN ('TrangChu','DanhMuc'))
);
GO


-- ===== 3/6 ThoiTrang_GioHang (CartService - Node.js) =====
IF DB_ID(N'ThoiTrang_GioHang') IS NULL
    CREATE DATABASE ThoiTrang_GioHang COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_GioHang SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_GioHang;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.GioHang (
    MaGioHang     INT          IDENTITY(1,1) NOT NULL,
    MaNguoiDung   INT          NULL,                -- ID ngoài (ThoiTrang_NguoiDung); NULL = khách chưa đăng nhập
    MaPhienKhach  VARCHAR(64)  NULL,                -- mã phiên của khách chưa đăng nhập (cookie)
    NgayTao       DATETIME2(3) NOT NULL CONSTRAINT DF_GioHang_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat   DATETIME2(3) NOT NULL CONSTRAINT DF_GioHang_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_GioHang PRIMARY KEY (MaGioHang),
    CONSTRAINT CK_GioHang_ChuSoHuu CHECK (MaNguoiDung IS NOT NULL OR MaPhienKhach IS NOT NULL)
);
CREATE UNIQUE INDEX UX_GioHang_NguoiDung ON dbo.GioHang (MaNguoiDung) WHERE MaNguoiDung IS NOT NULL;
CREATE UNIQUE INDEX UX_GioHang_PhienKhach ON dbo.GioHang (MaPhienKhach) WHERE MaPhienKhach IS NOT NULL;
GO

CREATE TABLE dbo.ChiTietGioHang (
    MaChiTiet   INT          IDENTITY(1,1) NOT NULL,
    MaGioHang   INT          NOT NULL,
    MaBienThe   INT          NOT NULL,              -- ID ngoài (ThoiTrang_SanPham)
    SoLuong     INT          NOT NULL,
    NgayThem    DATETIME2(3) NOT NULL CONSTRAINT DF_ChiTietGioHang_NgayThem DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ChiTietGioHang PRIMARY KEY (MaChiTiet),
    CONSTRAINT UQ_ChiTietGioHang_GioHang_BienThe UNIQUE (MaGioHang, MaBienThe),
    CONSTRAINT FK_ChiTietGioHang_GioHang FOREIGN KEY (MaGioHang) REFERENCES dbo.GioHang (MaGioHang) ON DELETE CASCADE,
    CONSTRAINT CK_ChiTietGioHang_SoLuong CHECK (SoLuong BETWEEN 1 AND 99)
);
GO


-- ===== 4/6 ThoiTrang_DonHang (OrderService - Java) =====
IF DB_ID(N'ThoiTrang_DonHang') IS NULL
    CREATE DATABASE ThoiTrang_DonHang COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_DonHang SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_DonHang;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.PhieuGiamGia (
    MaPhieuGiamGia   INT           IDENTITY(1,1) NOT NULL,
    MaCode           VARCHAR(30)   NOT NULL,        -- mã khách nhập, vd SALE10
    MoTa             NVARCHAR(300) NULL,
    LoaiGiam         VARCHAR(10)   NOT NULL,
    GiaTriGiam       DECIMAL(18,0) NOT NULL,        -- % (nếu PhanTram) hoặc số tiền (nếu SoTien)
    GiamToiDa        DECIMAL(18,0) NULL,
    DonToiThieu      DECIMAL(18,0) NOT NULL CONSTRAINT DF_PhieuGiamGia_DonToiThieu DEFAULT 0,
    SoLuong          INT           NULL,            -- NULL = không giới hạn
    DaDung           INT           NOT NULL CONSTRAINT DF_PhieuGiamGia_DaDung DEFAULT 0,
    GioiHanMoiNguoi  INT           NOT NULL CONSTRAINT DF_PhieuGiamGia_GioiHanMoiNguoi DEFAULT 1,
    NgayBatDau       DATETIME2(0)  NOT NULL,
    NgayKetThuc      DATETIME2(0)  NOT NULL,
    HoatDong         BIT           NOT NULL CONSTRAINT DF_PhieuGiamGia_HoatDong DEFAULT 1,
    CongKhai         BIT           NOT NULL CONSTRAINT DF_PhieuGiamGia_CongKhai DEFAULT 0,   -- 1 = hiện ở trang Ưu đãi
    NgayTao          DATETIME2(3)  NOT NULL CONSTRAINT DF_PhieuGiamGia_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PhieuGiamGia PRIMARY KEY (MaPhieuGiamGia),
    CONSTRAINT UQ_PhieuGiamGia_MaCode UNIQUE (MaCode),
    CONSTRAINT CK_PhieuGiamGia_LoaiGiam CHECK (LoaiGiam IN ('PhanTram','SoTien')),
    CONSTRAINT CK_PhieuGiamGia_GiaTri CHECK (GiaTriGiam > 0 AND (LoaiGiam <> 'PhanTram' OR GiaTriGiam <= 100)),
    CONSTRAINT CK_PhieuGiamGia_Ngay CHECK (NgayKetThuc > NgayBatDau),
    CONSTRAINT CK_PhieuGiamGia_SoLuong CHECK (SoLuong IS NULL OR DaDung <= SoLuong)
);
GO

CREATE TABLE dbo.DonHang (
    MaDonHang            INT           IDENTITY(1,1) NOT NULL,
    MaDonHienThi         VARCHAR(20)   NOT NULL,    -- mã khách nhìn thấy, vd DH241114AB12
    MaNguoiDung          INT           NULL,        -- ID ngoài (ThoiTrang_NguoiDung); NULL = khách mua không đăng nhập
    Email                VARCHAR(150)  NOT NULL,
    TenNguoiNhan         NVARCHAR(100) NOT NULL,
    SoDienThoai          VARCHAR(15)   NOT NULL,
    DiaChiGiao           NVARCHAR(255) NOT NULL,
    MaPhuongXa           VARCHAR(20)   NULL,
    PhuongXa             NVARCHAR(100) NOT NULL,
    MaTinhThanh          VARCHAR(20)   NULL,
    TinhThanh            NVARCHAR(100) NOT NULL,
    TongTienHang         DECIMAL(18,0) NOT NULL,
    PhiVanChuyen         DECIMAL(18,0) NOT NULL CONSTRAINT DF_DonHang_PhiVanChuyen DEFAULT 0,
    TienGiam             DECIMAL(18,0) NOT NULL CONSTRAINT DF_DonHang_TienGiam DEFAULT 0,
    TongThanhToan        DECIMAL(18,0) NOT NULL,
    MaPhieuGiamGia       INT           NULL,
    PhuongThucThanhToan  VARCHAR(20)   NOT NULL,
    TrangThai            VARCHAR(20)   NOT NULL CONSTRAINT DF_DonHang_TrangThai DEFAULT 'ChoXacNhan',
    HetHanThanhToanLuc   DATETIME2(3)  NULL,        -- hạn thanh toán của kênh online (VietQR, SePayGateway)
    GhiChuKhach          NVARCHAR(500) NULL,
    GhiChuNoiBo          NVARCHAR(500) NULL,
    LyDoHuy              NVARCHAR(300) NULL,
    NgayDat              DATETIME2(3)  NOT NULL CONSTRAINT DF_DonHang_NgayDat DEFAULT SYSUTCDATETIME(),
    NgayCapNhat          DATETIME2(3)  NOT NULL CONSTRAINT DF_DonHang_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DonHang PRIMARY KEY (MaDonHang),
    CONSTRAINT UQ_DonHang_MaDonHienThi UNIQUE (MaDonHienThi),
    CONSTRAINT FK_DonHang_PhieuGiamGia FOREIGN KEY (MaPhieuGiamGia) REFERENCES dbo.PhieuGiamGia (MaPhieuGiamGia),
    CONSTRAINT CK_DonHang_PhuongThuc CHECK (PhuongThucThanhToan IN ('COD','SePayGateway','VietQR')),
    CONSTRAINT CK_DonHang_TrangThai CHECK (TrangThai IN ('ChoThanhToan','ChoXacNhan','DaXacNhan','DangGiao','DaGiao','DaHuy')),
    CONSTRAINT CK_DonHang_Tien CHECK (TongTienHang >= 0 AND PhiVanChuyen >= 0 AND TienGiam >= 0
                                      AND TongThanhToan >= 0 AND TongThanhToan = TongTienHang + PhiVanChuyen - TienGiam)
);
CREATE INDEX IX_DonHang_NguoiDung ON dbo.DonHang (MaNguoiDung, NgayDat DESC);
CREATE INDEX IX_DonHang_TrangThai ON dbo.DonHang (TrangThai, NgayDat DESC);
CREATE INDEX IX_DonHang_HetHanThanhToan ON dbo.DonHang (HetHanThanhToanLuc) WHERE TrangThai = 'ChoThanhToan';
GO

CREATE TABLE dbo.ChiTietDonHang (
    MaChiTietDon   INT           IDENTITY(1,1) NOT NULL,
    MaDonHang      INT           NOT NULL,
    MaBienThe      INT           NOT NULL,          -- ID ngoài (ThoiTrang_SanPham)
    MaSanPham      INT           NOT NULL,          -- ID ngoài, tiện thống kê
    TenSanPham     NVARCHAR(200) NOT NULL,          -- bản sao tại thời điểm mua
    KichCo         VARCHAR(10)   NOT NULL,
    MauSac         NVARCHAR(50)  NOT NULL,
    MaHang         VARCHAR(50)   NOT NULL,
    DuongDanAnh    VARCHAR(300)  NULL,
    DonGia         DECIMAL(18,0) NOT NULL,
    SoLuong        INT           NOT NULL,
    ThanhTien      AS (DonGia * SoLuong) PERSISTED,
    CONSTRAINT PK_ChiTietDonHang PRIMARY KEY (MaChiTietDon),
    CONSTRAINT FK_ChiTietDonHang_DonHang FOREIGN KEY (MaDonHang) REFERENCES dbo.DonHang (MaDonHang) ON DELETE CASCADE,
    CONSTRAINT CK_ChiTietDonHang_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_ChiTietDonHang_DonGia CHECK (DonGia >= 0)
);
CREATE INDEX IX_ChiTietDonHang_DonHang ON dbo.ChiTietDonHang (MaDonHang);
CREATE INDEX IX_ChiTietDonHang_BienThe ON dbo.ChiTietDonHang (MaBienThe);
GO

CREATE TABLE dbo.LuotDungPhieu (
    MaLuot           INT          IDENTITY(1,1) NOT NULL,
    MaPhieuGiamGia   INT          NOT NULL,
    MaDonHang        INT          NOT NULL,
    MaNguoiDung      INT          NULL,             -- ID ngoài
    Email            VARCHAR(150) NULL,
    NgayDung         DATETIME2(3) NOT NULL CONSTRAINT DF_LuotDungPhieu_NgayDung DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LuotDungPhieu PRIMARY KEY (MaLuot),
    CONSTRAINT UQ_LuotDungPhieu_Phieu_DonHang UNIQUE (MaPhieuGiamGia, MaDonHang),
    CONSTRAINT FK_LuotDungPhieu_PhieuGiamGia FOREIGN KEY (MaPhieuGiamGia) REFERENCES dbo.PhieuGiamGia (MaPhieuGiamGia),
    CONSTRAINT FK_LuotDungPhieu_DonHang FOREIGN KEY (MaDonHang) REFERENCES dbo.DonHang (MaDonHang) ON DELETE CASCADE
);
CREATE INDEX IX_LuotDungPhieu_NguoiDung ON dbo.LuotDungPhieu (MaPhieuGiamGia, MaNguoiDung);
GO

CREATE TABLE dbo.LichSuTrangThaiDon (
    MaLichSu        BIGINT        IDENTITY(1,1) NOT NULL,
    MaDonHang       INT           NOT NULL,
    TrangThaiCu     VARCHAR(20)   NULL,
    TrangThaiMoi    VARCHAR(20)   NOT NULL,
    GhiChu          NVARCHAR(300) NULL,
    NguoiThucHien   INT           NULL,             -- ID ngoài (quản trị viên hoặc khách); NULL = hệ thống
    NgayTao         DATETIME2(3)  NOT NULL CONSTRAINT DF_LichSuTrangThaiDon_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LichSuTrangThaiDon PRIMARY KEY (MaLichSu),
    CONSTRAINT FK_LichSuTrangThaiDon_DonHang FOREIGN KEY (MaDonHang) REFERENCES dbo.DonHang (MaDonHang) ON DELETE CASCADE,
    CONSTRAINT CK_LichSuTrangThaiDon_Moi CHECK (TrangThaiMoi IN ('ChoThanhToan','ChoXacNhan','DaXacNhan','DangGiao','DaGiao','DaHuy'))
);
CREATE INDEX IX_LichSuTrangThaiDon_DonHang ON dbo.LichSuTrangThaiDon (MaDonHang, NgayTao);
GO

CREATE TABLE dbo.VanChuyen (
    MaVanChuyen      INT           IDENTITY(1,1) NOT NULL,
    MaDonHang        INT           NOT NULL,
    DonViVanChuyen   VARCHAR(30)   NOT NULL,        -- vd GHN, GHTK, ViettelPost, TuGiao
    MaVanDon         VARCHAR(50)   NULL,
    PhiVanChuyen     DECIMAL(18,0) NOT NULL CONSTRAINT DF_VanChuyen_PhiVanChuyen DEFAULT 0,
    TienThuHo        DECIMAL(18,0) NOT NULL CONSTRAINT DF_VanChuyen_TienThuHo DEFAULT 0,   -- số tiền COD cần thu
    TrongLuongGram   INT           NULL,
    TrangThai        VARCHAR(20)   NOT NULL CONSTRAINT DF_VanChuyen_TrangThai DEFAULT 'ChoLayHang',
    NgayDuKienGiao   DATETIME2(0)  NULL,
    NgayTao          DATETIME2(3)  NOT NULL CONSTRAINT DF_VanChuyen_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat      DATETIME2(3)  NOT NULL CONSTRAINT DF_VanChuyen_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_VanChuyen PRIMARY KEY (MaVanChuyen),
    CONSTRAINT FK_VanChuyen_DonHang FOREIGN KEY (MaDonHang) REFERENCES dbo.DonHang (MaDonHang) ON DELETE CASCADE,
    CONSTRAINT CK_VanChuyen_TrangThai CHECK (TrangThai IN ('ChoLayHang','DaLayHang','DangGiao','DaGiao','GiaoThatBai','DangHoan','DaHoan','DaHuy')),
    CONSTRAINT CK_VanChuyen_Tien CHECK (PhiVanChuyen >= 0 AND TienThuHo >= 0)
);
CREATE INDEX IX_VanChuyen_DonHang ON dbo.VanChuyen (MaDonHang);
CREATE UNIQUE INDEX UX_VanChuyen_DonVi_MaVanDon ON dbo.VanChuyen (DonViVanChuyen, MaVanDon) WHERE MaVanDon IS NOT NULL;
GO

CREATE TABLE dbo.DoiTra (
    MaDoiTra     INT           IDENTITY(1,1) NOT NULL,
    MaDonHang    INT           NOT NULL,
    HinhThuc     VARCHAR(10)   NOT NULL,
    LyDo         NVARCHAR(500) NOT NULL,
    TrangThai    VARCHAR(20)   NOT NULL CONSTRAINT DF_DoiTra_TrangThai DEFAULT 'ChoDuyet',
    SoTienHoan   DECIMAL(18,0) NOT NULL CONSTRAINT DF_DoiTra_SoTienHoan DEFAULT 0,
    GhiChuAdmin  NVARCHAR(500) NULL,
    NgayTao      DATETIME2(3)  NOT NULL CONSTRAINT DF_DoiTra_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat  DATETIME2(3)  NOT NULL CONSTRAINT DF_DoiTra_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DoiTra PRIMARY KEY (MaDoiTra),
    CONSTRAINT FK_DoiTra_DonHang FOREIGN KEY (MaDonHang) REFERENCES dbo.DonHang (MaDonHang) ON DELETE CASCADE,
    CONSTRAINT CK_DoiTra_HinhThuc CHECK (HinhThuc IN ('DoiHang','TraHang')),
    CONSTRAINT CK_DoiTra_TrangThai CHECK (TrangThai IN ('ChoDuyet','DaDuyet','TuChoi','DaNhanHang','DaHoanTat')),
    CONSTRAINT CK_DoiTra_SoTienHoan CHECK (SoTienHoan >= 0)
);
CREATE INDEX IX_DoiTra_DonHang ON dbo.DoiTra (MaDonHang);
GO

CREATE TABLE dbo.ChiTietDoiTra (
    MaChiTietDoiTra  INT NOT NULL IDENTITY(1,1),
    MaDoiTra         INT NOT NULL,
    MaChiTietDon     INT NOT NULL,
    SoLuong          INT NOT NULL,
    MaBienTheMoi     INT NULL,                      -- ID ngoài (ThoiTrang_SanPham): size/màu mới khi đổi hàng
    CONSTRAINT PK_ChiTietDoiTra PRIMARY KEY (MaChiTietDoiTra),
    CONSTRAINT FK_ChiTietDoiTra_DoiTra FOREIGN KEY (MaDoiTra) REFERENCES dbo.DoiTra (MaDoiTra) ON DELETE CASCADE,
    CONSTRAINT FK_ChiTietDoiTra_ChiTietDonHang FOREIGN KEY (MaChiTietDon) REFERENCES dbo.ChiTietDonHang (MaChiTietDon),
    CONSTRAINT CK_ChiTietDoiTra_SoLuong CHECK (SoLuong > 0)
);
CREATE INDEX IX_ChiTietDoiTra_DoiTra ON dbo.ChiTietDoiTra (MaDoiTra);
GO


-- ===== 5/6 ThoiTrang_ThanhToan (PaymentService - Go) =====
IF DB_ID(N'ThoiTrang_ThanhToan') IS NULL
    CREATE DATABASE ThoiTrang_ThanhToan COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_ThanhToan SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_ThanhToan;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.ThanhToan (
    MaThanhToan          INT           IDENTITY(1,1) NOT NULL,
    MaDonHang            INT           NOT NULL,    -- ID ngoài (ThoiTrang_DonHang)
    MaDonHienThi         VARCHAR(20)   NOT NULL,
    KenhThanhToan        VARCHAR(20)   NOT NULL,
    MaThanhToanNganHang  VARCHAR(40)   NULL,        -- mã ngẫu nhiên trong nội dung chuyển khoản / mã gửi SePay
    SoTien               DECIMAL(18,0) NOT NULL,
    SoTienDaNhan         DECIMAL(18,0) NOT NULL CONSTRAINT DF_ThanhToan_SoTienDaNhan DEFAULT 0,
    TrangThai            VARCHAR(20)   NOT NULL CONSTRAINT DF_ThanhToan_TrangThai DEFAULT 'ChoThanhToan',
    HetHanLuc            DATETIME2(3)  NULL,
    NgayThanhToan        DATETIME2(3)  NULL,
    NguoiXacNhan         INT           NULL,        -- ID ngoài (quản trị viên) khi ghi nhận thủ công hoặc thu COD
    GhiChu               NVARCHAR(500) NULL,
    NgayTao              DATETIME2(3)  NOT NULL CONSTRAINT DF_ThanhToan_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat          DATETIME2(3)  NOT NULL CONSTRAINT DF_ThanhToan_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ThanhToan PRIMARY KEY (MaThanhToan),
    CONSTRAINT CK_ThanhToan_Kenh CHECK (KenhThanhToan IN ('COD','SePayGateway','VietQR')),
    CONSTRAINT CK_ThanhToan_TrangThai CHECK (TrangThai IN ('ChoThanhToan','DaThanhToan','HetHan','CanXuLy','DaHoan')),
    CONSTRAINT CK_ThanhToan_Tien CHECK (SoTien >= 0 AND SoTienDaNhan >= 0)
);
CREATE INDEX IX_ThanhToan_DonHang ON dbo.ThanhToan (MaDonHang);
CREATE UNIQUE INDEX UX_ThanhToan_MaNganHang ON dbo.ThanhToan (MaThanhToanNganHang) WHERE MaThanhToanNganHang IS NOT NULL;
CREATE INDEX IX_ThanhToan_HetHan ON dbo.ThanhToan (HetHanLuc) WHERE TrangThai = 'ChoThanhToan';
GO

CREATE TABLE dbo.GiaoDichCong (
    MaGiaoDichCong       BIGINT        IDENTITY(1,1) NOT NULL,
    MaThanhToan          INT           NULL,        -- NULL nếu chưa khớp được thanh toán nào
    Nguon                VARCHAR(10)   NOT NULL,
    MaGiaoDichNgoai      VARCHAR(64)   NOT NULL,    -- id giao dịch do SePay gửi
    NganHang             VARCHAR(50)   NULL,
    MaThamChieuNganHang  VARCHAR(64)   NULL,
    SoTien               DECIMAL(18,0) NOT NULL,
    NoiDung              NVARCHAR(500) NULL,
    DuLieuTho            NVARCHAR(MAX) NOT NULL,    -- nguyên văn webhook/IPN để đối soát
    ChuKyHopLe           BIT           NOT NULL,
    KetQuaXuLy           VARCHAR(20)   NOT NULL,
    NgayGiaoDich         DATETIME2(3)  NULL,
    NgayNhan             DATETIME2(3)  NOT NULL CONSTRAINT DF_GiaoDichCong_NgayNhan DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_GiaoDichCong PRIMARY KEY (MaGiaoDichCong),
    CONSTRAINT FK_GiaoDichCong_ThanhToan FOREIGN KEY (MaThanhToan) REFERENCES dbo.ThanhToan (MaThanhToan),
    CONSTRAINT CK_GiaoDichCong_Nguon CHECK (Nguon IN ('Webhook','IPN','DoiSoat')),
    CONSTRAINT CK_GiaoDichCong_KetQua CHECK (KetQuaXuLy IN ('ThanhCong','BoQuaTrung','SaiSoTien','KhongKhopMa','HetHan','SaiChuKy','Loi'))
);
CREATE INDEX IX_GiaoDichCong_ThanhToan ON dbo.GiaoDichCong (MaThanhToan);
-- chỉ ràng buộc duy nhất với yêu cầu có chữ ký hợp lệ, để kẻ giả mạo không chặn được giao dịch thật
CREATE UNIQUE INDEX UX_GiaoDichCong_Nguon_MaNgoai ON dbo.GiaoDichCong (Nguon, MaGiaoDichNgoai) WHERE ChuKyHopLe = 1;
GO

CREATE TABLE dbo.HoanTien (
    MaHoanTien       INT           IDENTITY(1,1) NOT NULL,
    MaThanhToan      INT           NOT NULL,
    SoTien           DECIMAL(18,0) NOT NULL,
    LyDo             NVARCHAR(300) NOT NULL,
    TrangThai        VARCHAR(20)   NOT NULL CONSTRAINT DF_HoanTien_TrangThai DEFAULT 'ChoXuLy',
    PhuongThucHoan   NVARCHAR(100) NULL,            -- vd chuyển khoản thủ công
    MaThamChieu      VARCHAR(64)   NULL,
    NguoiThucHien    INT           NULL,            -- ID ngoài (quản trị viên)
    NgayTao          DATETIME2(3)  NOT NULL CONSTRAINT DF_HoanTien_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayHoan         DATETIME2(3)  NULL,
    CONSTRAINT PK_HoanTien PRIMARY KEY (MaHoanTien),
    CONSTRAINT FK_HoanTien_ThanhToan FOREIGN KEY (MaThanhToan) REFERENCES dbo.ThanhToan (MaThanhToan),
    CONSTRAINT CK_HoanTien_SoTien CHECK (SoTien > 0),
    CONSTRAINT CK_HoanTien_TrangThai CHECK (TrangThai IN ('ChoXuLy','DaHoan','TuChoi'))
);
CREATE INDEX IX_HoanTien_ThanhToan ON dbo.HoanTien (MaThanhToan);
GO


-- ===== 6/6 ThoiTrang_ThongBao (NotificationService - PHP) =====
IF DB_ID(N'ThoiTrang_ThongBao') IS NULL
    CREATE DATABASE ThoiTrang_ThongBao COLLATE Vietnamese_CI_AS;
GO
ALTER DATABASE ThoiTrang_ThongBao SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO
USE ThoiTrang_ThongBao;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Không nạp mẫu có sẵn: dịch vụ dùng mẫu thư đi kèm mã nguồn; bản ghi trong bảng này (do admin tạo) sẽ ghi đè.
CREATE TABLE dbo.MauThongBao (
    MaMau        INT           IDENTITY(1,1) NOT NULL,
    MaCode       VARCHAR(50)   NOT NULL,            -- vd XacNhanDon, DatLaiMatKhau
    KenhGui      VARCHAR(10)   NOT NULL,
    TieuDe       NVARCHAR(200) NOT NULL,
    NoiDung      NVARCHAR(MAX) NOT NULL,
    HoatDong     BIT           NOT NULL CONSTRAINT DF_MauThongBao_HoatDong DEFAULT 1,
    NgayCapNhat  DATETIME2(3)  NOT NULL CONSTRAINT DF_MauThongBao_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MauThongBao PRIMARY KEY (MaMau),
    CONSTRAINT UQ_MauThongBao_Code_Kenh UNIQUE (MaCode, KenhGui),
    CONSTRAINT CK_MauThongBao_Kenh CHECK (KenhGui IN ('Email','SMS','TrongApp'))
);
GO

CREATE TABLE dbo.NhatKyGui (
    MaNhatKy     BIGINT        IDENTITY(1,1) NOT NULL,
    KenhGui      VARCHAR(10)   NOT NULL,
    NguoiNhan    VARCHAR(150)  NOT NULL,            -- email hoặc số điện thoại
    MaMauCode    VARCHAR(50)   NOT NULL,            -- tham chiếu theo mã, không khóa ngoại (mẫu có thể nằm trong mã nguồn)
    TieuDe       NVARCHAR(200) NULL,
    MaThamChieu  VARCHAR(50)   NULL,                -- vd mã đơn hàng
    TrangThai    VARCHAR(10)   NOT NULL CONSTRAINT DF_NhatKyGui_TrangThai DEFAULT 'ChoGui',
    SoLanThu     INT           NOT NULL CONSTRAINT DF_NhatKyGui_SoLanThu DEFAULT 0,
    LoiCuoi      NVARCHAR(500) NULL,
    DuLieuJson   NVARCHAR(MAX) NULL,                -- dữ liệu để gửi lại (chỉ lưu cho thư không chứa mã bí mật)
    NgayTao      DATETIME2(3)  NOT NULL CONSTRAINT DF_NhatKyGui_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayGui      DATETIME2(3)  NULL,
    CONSTRAINT PK_NhatKyGui PRIMARY KEY (MaNhatKy),
    CONSTRAINT CK_NhatKyGui_Kenh CHECK (KenhGui IN ('Email','SMS','TrongApp')),
    CONSTRAINT CK_NhatKyGui_TrangThai CHECK (TrangThai IN ('ChoGui','DaGui','Loi'))
);
CREATE INDEX IX_NhatKyGui_HangDoi ON dbo.NhatKyGui (NgayTao) WHERE TrangThai = 'ChoGui';
CREATE INDEX IX_NhatKyGui_MaThamChieu ON dbo.NhatKyGui (MaThamChieu);
GO

CREATE TABLE dbo.ThongBao (
    MaThongBao   BIGINT         IDENTITY(1,1) NOT NULL,
    MaNguoiDung  INT            NOT NULL,           -- ID ngoài (ThoiTrang_NguoiDung)
    TieuDe       NVARCHAR(200)  NOT NULL,
    NoiDung      NVARCHAR(1000) NULL,
    LienKet      VARCHAR(300)   NULL,
    DaDoc        BIT            NOT NULL CONSTRAINT DF_ThongBao_DaDoc DEFAULT 0,
    NgayTao      DATETIME2(3)   NOT NULL CONSTRAINT DF_ThongBao_NgayTao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ThongBao PRIMARY KEY (MaThongBao)
);
CREATE INDEX IX_ThongBao_NguoiDung ON dbo.ThongBao (MaNguoiDung, DaDoc, NgayTao DESC);
GO


/* ============================================================================
   GHI CHÚ VẬN HÀNH
   • Sao lưu: CSDL ở chế độ FULL (mặc định) -> sao lưu đầy đủ hằng ngày + sao lưu log định kỳ,
     chép ra ngoài máy chủ và thử khôi phục.
   • Tài khoản dịch vụ (chạy tay, tự đặt mật khẩu mạnh, không đưa mật khẩu vào Git). Ví dụ:
       -- ở master:  CREATE LOGIN dv_nguoidung WITH PASSWORD = N'<mat-khau-manh>';
       USE ThoiTrang_NguoiDung;
       CREATE USER dv_nguoidung FOR LOGIN dv_nguoidung;
       ALTER ROLE db_datareader ADD MEMBER dv_nguoidung;
       ALTER ROLE db_datawriter ADD MEMBER dv_nguoidung;
     Mỗi dịch vụ chỉ có quyền trên CSDL của chính nó.
   • Docker: đặt MSSQL_PID=Express (bản mặc định là Developer, chỉ dùng cho phát triển).
   ============================================================================ */
