/* Tài khoản quyền tối thiểu cho từng dịch vụ.
   Mật khẩu được init_db.py thay vào các biến $(MK_...) lấy từ biến môi trường (không lưu trong Git). */
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_nguoidung') CREATE LOGIN dv_nguoidung WITH PASSWORD = N'$(MK_NGUOIDUNG)', CHECK_POLICY = OFF;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_sanpham')   CREATE LOGIN dv_sanpham   WITH PASSWORD = N'$(MK_SANPHAM)', CHECK_POLICY = OFF;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_giohang')   CREATE LOGIN dv_giohang   WITH PASSWORD = N'$(MK_GIOHANG)', CHECK_POLICY = OFF;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_donhang')   CREATE LOGIN dv_donhang   WITH PASSWORD = N'$(MK_DONHANG)', CHECK_POLICY = OFF;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_thanhtoan') CREATE LOGIN dv_thanhtoan WITH PASSWORD = N'$(MK_THANHTOAN)', CHECK_POLICY = OFF;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'dv_thongbao')  CREATE LOGIN dv_thongbao  WITH PASSWORD = N'$(MK_THONGBAO)', CHECK_POLICY = OFF;
GO
USE ThoiTrang_NguoiDung;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_nguoidung') CREATE USER dv_nguoidung FOR LOGIN dv_nguoidung;
ALTER ROLE db_datareader ADD MEMBER dv_nguoidung;
ALTER ROLE db_datawriter ADD MEMBER dv_nguoidung;
GO
USE ThoiTrang_SanPham;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_sanpham') CREATE USER dv_sanpham FOR LOGIN dv_sanpham;
ALTER ROLE db_datareader ADD MEMBER dv_sanpham;
ALTER ROLE db_datawriter ADD MEMBER dv_sanpham;
GO
USE ThoiTrang_GioHang;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_giohang') CREATE USER dv_giohang FOR LOGIN dv_giohang;
ALTER ROLE db_datareader ADD MEMBER dv_giohang;
ALTER ROLE db_datawriter ADD MEMBER dv_giohang;
GO
USE ThoiTrang_DonHang;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_donhang') CREATE USER dv_donhang FOR LOGIN dv_donhang;
ALTER ROLE db_datareader ADD MEMBER dv_donhang;
ALTER ROLE db_datawriter ADD MEMBER dv_donhang;
GO
USE ThoiTrang_ThanhToan;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_thanhtoan') CREATE USER dv_thanhtoan FOR LOGIN dv_thanhtoan;
ALTER ROLE db_datareader ADD MEMBER dv_thanhtoan;
ALTER ROLE db_datawriter ADD MEMBER dv_thanhtoan;
GO
USE ThoiTrang_ThongBao;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'dv_thongbao') CREATE USER dv_thongbao FOR LOGIN dv_thongbao;
ALTER ROLE db_datareader ADD MEMBER dv_thongbao;
ALTER ROLE db_datawriter ADD MEMBER dv_thongbao;
GO
