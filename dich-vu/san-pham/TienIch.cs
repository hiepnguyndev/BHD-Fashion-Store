using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

// ---------- dữ liệu vào ----------
public record DongKho(int MaBienThe, int SoLuong);
public record YeuCauKho(string MaThamChieu, List<DongKho>? Dong);
public record YeuCauLayBienThe(List<int>? Ids);
public record SanPhamVao(int MaDanhMuc, string TenSanPham, string? ThuongHieu, string? ChatLieu, string? MoTaNgan,
    string? MoTa, decimal GiaGoc, decimal GiaBan, string? TrangThai, bool NoiBat);
public record BienTheVao(string KichCo, string MauSac, string? MaMau, decimal? GiaRieng, int SoLuongTon, string? MaHang, bool? HienThi);
public record BienTheSua(string? MaMau, decimal? GiaRieng, bool? HienThi, bool XoaGiaRieng);
public record HinhAnhVao(string DuongDanAnh, string? MauSac, string? ChuThich, bool LaAnhChinh, int ThuTu);
public record NhapKhoVao(int MaBienThe, int SoLuong, string? GhiChu);
public record DieuChinhKhoVao(int MaBienThe, int TonMoi, string? GhiChu);
public record DanhMucVao(int? MaDanhMucCha, string TenDanhMuc, string? MoTa, int ThuTu, bool HienThi);
public record BoSuuTapVao(string TenBoSuuTap, string? MoTa, string? AnhBia, bool HienThi, DateTime? NgayBatDau, DateTime? NgayKetThuc);
public record DanhSachSanPhamVao(List<int>? MaSanPham);
public record BannerVao(string TieuDe, string DuongDanAnh, string? DuongDanAnhDienThoai, string? LienKet, string? ViTri, int ThuTu, bool HienThi, DateTime? NgayBatDau, DateTime? NgayKetThuc);
public record DanhGiaVao(int MaSanPham, int SoSao, string? NoiDung);
public record DuyetDanhGia(string TrangThai);

public sealed class TongKho
{
    public int MaBienThe { get; set; }
    public int Giu { get; set; }   // số đang giữ chỗ (còn hiệu lực)
    public int Ton { get; set; }   // số tồn đã trừ do bán (âm = đã bán)
}

// ---------- tiện ích ----------
public static class Kq
{
    public static IResult Ok(object? du_lieu = null) => Results.Json(du_lieu ?? new { thongBao = "OK" }, statusCode: 200);
    public static IResult Tao(object? du_lieu) => Results.Json(du_lieu, statusCode: 201);
    public static IResult Loi(int ma, string noiDung, object? them = null) =>
        Results.Json(them ?? new { loi = noiDung }, statusCode: ma);
}

public static class TienIch
{
    public static string BoDau(string s)
    {
        var d = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(d.Length);
        foreach (var c in d)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(c == 'đ' ? 'd' : c == 'Đ' ? 'D' : c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    public static string Slug(string s, int toiDa = 100)
    {
        var x = Regex.Replace(BoDau(s), "[^a-z0-9]+", "-").Trim('-');
        if (x.Length == 0) x = "muc";
        return x.Length > toiDa ? x[..toiDa].Trim('-') : x;
    }

    public static string ThoatLike(string s) =>
        s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    public static Dictionary<string, object?> Dong(object row) =>
        ((IDictionary<string, object>)row).ToDictionary(
            k => k.Key,
            v => v.Value is DBNull ? null
               : v.Value is DateTime dt ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
               : v.Value);

    public static List<Dictionary<string, object?>> Ds(IEnumerable<object> rows) => rows.Select(Dong).ToList();
}
