/* Tin tức do quản trị viên đăng (hiển thị ở mục Tin tức trên cửa hàng). Chạy lại nhiều lần vẫn an toàn. */
USE ThoiTrang_SanPham;
GO

IF OBJECT_ID('dbo.TinTuc', 'U') IS NULL
BEGIN
CREATE TABLE dbo.TinTuc (
    MaTinTuc     INT            IDENTITY(1,1) NOT NULL,
    TieuDe       NVARCHAR(200)  NOT NULL,
    DuongDan     VARCHAR(220)   NOT NULL,
    TomTat       NVARCHAR(500)  NULL,
    NoiDung      NVARCHAR(MAX)  NOT NULL,        -- văn bản thường; dòng bắt đầu bằng "## " là tiêu đề phụ
    AnhBia       VARCHAR(300)   NULL,
    HienThi      BIT            NOT NULL CONSTRAINT DF_TinTuc_HienThi DEFAULT 1,
    NgayDang     DATETIME2(3)   NOT NULL CONSTRAINT DF_TinTuc_NgayDang DEFAULT SYSUTCDATETIME(),
    NgayTao      DATETIME2(3)   NOT NULL CONSTRAINT DF_TinTuc_NgayTao DEFAULT SYSUTCDATETIME(),
    NgayCapNhat  DATETIME2(3)   NOT NULL CONSTRAINT DF_TinTuc_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TinTuc PRIMARY KEY (MaTinTuc),
    CONSTRAINT UQ_TinTuc_DuongDan UNIQUE (DuongDan)
);
CREATE INDEX IX_TinTuc_NgayDang ON dbo.TinTuc (HienThi, NgayDang DESC);
END
GO
