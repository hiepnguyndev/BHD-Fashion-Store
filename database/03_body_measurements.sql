/* Thông số cơ thể của người dùng, dùng để gợi ý cỡ (size) sản phẩm phù hợp. */
USE ThoiTrang_NguoiDung;
GO

-- Cả khối nằm trong một batch nên chạy lại nhiều lần vẫn an toàn (RETURN chỉ thoát một batch).
IF OBJECT_ID('dbo.ThongSoCoThe', 'U') IS NULL
BEGIN
CREATE TABLE dbo.ThongSoCoThe (
    MaNguoiDung   INT           NOT NULL,
    ChieuCao      SMALLINT      NULL,   -- cm
    CanNang       SMALLINT      NULL,   -- kg
    VongNguc      SMALLINT      NULL,   -- cm, dùng gợi ý size áo
    VongEo        SMALLINT      NULL,   -- cm, dùng gợi ý size quần
    CoGiay        DECIMAL(3,1)  NULL,   -- cỡ giày theo EU, vd 39.5
    NgayCapNhat   DATETIME2(3)  NOT NULL CONSTRAINT DF_ThongSoCoThe_NgayCapNhat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ThongSoCoThe PRIMARY KEY (MaNguoiDung),
    CONSTRAINT FK_ThongSoCoThe_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung (MaNguoiDung) ON DELETE CASCADE,
    CONSTRAINT CK_ThongSoCoThe_ChieuCao CHECK (ChieuCao IS NULL OR ChieuCao BETWEEN 100 AND 230),
    CONSTRAINT CK_ThongSoCoThe_CanNang  CHECK (CanNang IS NULL OR CanNang BETWEEN 25 AND 250),
    CONSTRAINT CK_ThongSoCoThe_VongNguc CHECK (VongNguc IS NULL OR VongNguc BETWEEN 50 AND 160),
    CONSTRAINT CK_ThongSoCoThe_VongEo   CHECK (VongEo IS NULL OR VongEo BETWEEN 40 AND 160),
    CONSTRAINT CK_ThongSoCoThe_CoGiay   CHECK (CoGiay IS NULL OR CoGiay BETWEEN 34 AND 46)
);
END
GO
