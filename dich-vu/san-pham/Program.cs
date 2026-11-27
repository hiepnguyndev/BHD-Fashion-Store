using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

string Bat(string ten) => Environment.GetEnvironmentVariable(ten) ?? throw new InvalidOperationException($"Thiếu biến môi trường {ten}");
string Co(string ten, string macDinh) => Environment.GetEnvironmentVariable(ten) is { Length: > 0 } v ? v : macDinh;

var cs = new SqlConnectionStringBuilder
{
    DataSource = $"{Co("DB_HOST", "sqlserver")},{Co("DB_PORT", "1433")}",
    InitialCatalog = Co("DB_NAME", "ThoiTrang_SanPham"),
    UserID = Co("DB_USER", "dv_sanpham"),
    Password = Bat("DB_PASSWORD"),
    TrustServerCertificate = true,
    Encrypt = SqlConnectionEncryptOption.Mandatory,
    ConnectTimeout = 15,
    MultipleActiveResultSets = false,
}.ConnectionString;
var khoaNoiBo = Bat("KHOA_NOI_BO");
var thuMucAnh = Co("THU_MUC_ANH", "/du-lieu/anh");
var donHangUrl = Co("DON_HANG_URL", "http://donhang:8080").TrimEnd('/');
Directory.CreateDirectory(thuMucAnh);

SqlConnection Mo() => new(cs);

// chờ UserService tạo khóa công khai (compose đã đợi nhưng vẫn phòng hờ)
var duongKhoaCong = Path.Combine(Co("THU_MUC_KHOA", "/khoa"), "public.pem");
for (var i = 0; i < 60 && !File.Exists(duongKhoaCong); i++) Thread.Sleep(1000);
var rsa = RSA.Create();
rsa.ImportFromPem(File.ReadAllText(duongKhoaCong));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = "thoitrang-nguoidung",
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        IssuerSigningKey = new RsaSecurityKey(rsa),
        ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 },
        NameClaimType = "sub",
        RoleClaimType = "vai_tro",
    };
});
builder.Services.AddAuthorization(o => o.AddPolicy("QuanTri", p => p.RequireRole("QuanTri")));
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.AddHttpClient("donhang", c =>
{
    c.BaseAddress = new Uri(donHangUrl + "/");
    c.Timeout = TimeSpan.FromSeconds(8);
    c.DefaultRequestHeaders.Add("X-Khoa-Noi-Bo", khoaNoiBo);
});

var app = builder.Build();

app.UseExceptionHandler(e => e.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsync("{\"loi\":\"Có lỗi hệ thống. Vui lòng thử lại sau.\"}");
}));
app.UseAuthentication();
app.UseAuthorization();

int MaNguoiDung(ClaimsPrincipal u) => int.Parse(u.FindFirstValue("sub")!);
bool LoiTrung(SqlException e) => e.Number is 2627 or 2601;
(int trang, int kt) Trang(int? trang, int? kt, int toiDa = 60) => (Math.Max(trang ?? 1, 1), Math.Clamp(kt ?? 12, 1, toiDa));

// ===================================================================== SỨC KHỎE
app.MapGet("/health", async () =>
{
    await using var db = Mo();
    await db.ExecuteScalarAsync<int>("SELECT 1");
    return Kq.Ok(new { trangThai = "ok" });
});

// ===================================================================== CÔNG KHAI
const string CotSanPham = @"s.MaSanPham, s.TenSanPham, s.DuongDan, s.ThuongHieu, s.GiaGoc, s.GiaBan, s.DiemDanhGiaTB, s.SoLuotDanhGia, s.SoLuongDaBan, s.NoiBat,
    (SELECT TOP 1 h.DuongDanAnh FROM dbo.HinhAnhSanPham h WHERE h.MaSanPham = s.MaSanPham ORDER BY h.LaAnhChinh DESC, h.ThuTu, h.MaHinhAnh) AS AnhChinh,
    CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham AND b.HienThi = 1 AND b.SoLuongTon - b.SoLuongGiuCho > 0) THEN 1 ELSE 0 END AS BIT) AS ConHang";

async Task GanMauSac(SqlConnection db, List<Dictionary<string, object?>> ds)
{
    if (ds.Count == 0) return;
    var ids = ds.Select(d => (int)d["MaSanPham"]!).ToList();
    var mau = await db.QueryAsync(
        "SELECT DISTINCT MaSanPham, MauSac, MaMau FROM dbo.BienTheSanPham WHERE MaSanPham IN @ids AND HienThi = 1", new { ids });
    var theoSp = TienIch.Ds(mau).GroupBy(m => (int)m["MaSanPham"]!).ToDictionary(g => g.Key, g => g.ToList());
    foreach (var d in ds)
        d["MauSac"] = theoSp.TryGetValue((int)d["MaSanPham"]!, out var l)
            ? l.Select(x => (object)new { mauSac = x["MauSac"], maMau = x["MaMau"] }).ToList()
            : new List<object>();
}

app.MapGet("/api/danh-muc", async () =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        "SELECT MaDanhMuc, MaDanhMucCha, TenDanhMuc, DuongDan, MoTa FROM dbo.DanhMuc WHERE HienThi = 1 ORDER BY ThuTu, TenDanhMuc")));
});

app.MapGet("/api/san-pham", async (string? tuKhoa, string? danhMuc, string? boSuuTap, decimal? giaTu, decimal? giaDen,
    string? kichCo, string? mauSac, string? sapXep, bool? noiBat, bool? giamGia, int? trang, int? kichThuoc) =>
{
    var (tr, kt) = Trang(trang, kichThuoc);
    var dk = new List<string> { "s.TrangThai = 'DangBan'" };
    var p = new DynamicParameters();
    if (!string.IsNullOrWhiteSpace(tuKhoa))
    {
        dk.Add("s.TenKhongDau LIKE @tk"); p.Add("tk", "%" + TienIch.ThoatLike(TienIch.BoDau(tuKhoa.Trim())) + "%");
    }
    if (!string.IsNullOrWhiteSpace(danhMuc))
    {
        dk.Add(@"s.MaDanhMuc IN (SELECT MaDanhMuc FROM dbo.DanhMuc WHERE DuongDan = @dm
                 OR MaDanhMucCha IN (SELECT MaDanhMuc FROM dbo.DanhMuc WHERE DuongDan = @dm))");
        p.Add("dm", danhMuc);
    }
    if (!string.IsNullOrWhiteSpace(boSuuTap))
    {
        dk.Add(@"EXISTS (SELECT 1 FROM dbo.BoSuuTapSanPham x JOIN dbo.BoSuuTap c ON c.MaBoSuuTap = x.MaBoSuuTap
                 WHERE x.MaSanPham = s.MaSanPham AND c.DuongDan = @bst)");
        p.Add("bst", boSuuTap);
    }
    if (giaTu is not null) { dk.Add("s.GiaBan >= @gt"); p.Add("gt", giaTu); }
    if (giaDen is not null) { dk.Add("s.GiaBan <= @gd"); p.Add("gd", giaDen); }
    if (!string.IsNullOrWhiteSpace(kichCo))
    {
        dk.Add("EXISTS (SELECT 1 FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham AND b.HienThi = 1 AND b.KichCo = @kc)");
        p.Add("kc", kichCo);
    }
    if (!string.IsNullOrWhiteSpace(mauSac))
    {
        dk.Add("EXISTS (SELECT 1 FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham AND b.HienThi = 1 AND b.MauSac = @ms)");
        p.Add("ms", mauSac);
    }
    if (noiBat == true) dk.Add("s.NoiBat = 1");
    if (giamGia == true) dk.Add("s.GiaGoc > s.GiaBan");
    var thuTu = sapXep switch
    {
        "giaTang" => "s.GiaBan ASC, s.MaSanPham DESC",
        "giaGiam" => "s.GiaBan DESC, s.MaSanPham DESC",
        "banChay" => "s.SoLuongDaBan DESC, s.MaSanPham DESC",
        "danhGia" => "s.DiemDanhGiaTB DESC, s.SoLuotDanhGia DESC, s.MaSanPham DESC",
        _ => "s.NgayTao DESC, s.MaSanPham DESC",
    };
    var where = string.Join(" AND ", dk);
    p.Add("bd", (tr - 1) * kt); p.Add("kt", kt);
    await using var db = Mo();
    var tong = await db.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM dbo.SanPham s WHERE {where}", p);
    var ds = TienIch.Ds(await db.QueryAsync(
        $"SELECT {CotSanPham} FROM dbo.SanPham s WHERE {where} ORDER BY {thuTu} OFFSET @bd ROWS FETCH NEXT @kt ROWS ONLY", p));
    await GanMauSac(db, ds);
    return Kq.Ok(new { tong, trang = tr, kichThuoc = kt, danhSach = ds });
});

app.MapGet("/api/san-pham/{duongDan}", async (string duongDan) =>
{
    await using var db = Mo();
    object? sp = await db.QueryFirstOrDefaultAsync(
        @"SELECT s.MaSanPham, s.MaDanhMuc, s.TenSanPham, s.DuongDan, s.ThuongHieu, s.ChatLieu, s.MoTaNgan, s.MoTa, s.GiaGoc, s.GiaBan,
                 s.DiemDanhGiaTB, s.SoLuotDanhGia, s.SoLuongDaBan, s.NoiBat
          FROM dbo.SanPham s WHERE s.DuongDan = @duongDan AND s.TrangThai = 'DangBan'", new { duongDan });
    if (sp is null) return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    var d = TienIch.Dong(sp);
    var ma = (int)d["MaSanPham"]!;
    var hinh = await db.QueryAsync("SELECT MaHinhAnh, MauSac, DuongDanAnh, ChuThich, LaAnhChinh FROM dbo.HinhAnhSanPham WHERE MaSanPham = @ma ORDER BY LaAnhChinh DESC, ThuTu, MaHinhAnh", new { ma });
    var bienThe = await db.QueryAsync(
        @"SELECT MaBienThe, MaHang, KichCo, MauSac, MaMau, COALESCE(GiaRieng, @giaBan) AS Gia, SoLuongTon - SoLuongGiuCho AS ConLai
          FROM dbo.BienTheSanPham WHERE MaSanPham = @ma AND HienThi = 1 ORDER BY MauSac, MaBienThe", new { ma, giaBan = (decimal)d["GiaBan"]! });
    var duongDanDanhMuc = await db.QueryAsync(
        @"SELECT c.MaDanhMuc, c.TenDanhMuc, c.DuongDan FROM dbo.DanhMuc c
          WHERE c.MaDanhMuc = @dm OR c.MaDanhMuc = (SELECT MaDanhMucCha FROM dbo.DanhMuc WHERE MaDanhMuc = @dm)
          ORDER BY CASE WHEN c.MaDanhMuc = @dm THEN 1 ELSE 0 END", new { dm = (int)d["MaDanhMuc"]! });
    var lienQuan = TienIch.Ds(await db.QueryAsync(
        $@"SELECT TOP 8 {CotSanPham} FROM dbo.SanPham s WHERE s.MaDanhMuc = @dm AND s.MaSanPham <> @ma AND s.TrangThai = 'DangBan'
           ORDER BY s.SoLuongDaBan DESC", new { dm = (int)d["MaDanhMuc"]!, ma }));
    await GanMauSac(db, lienQuan);
    return Kq.Ok(new
    {
        sanPham = d,
        hinhAnh = TienIch.Ds(hinh),
        bienThe = TienIch.Ds(bienThe),
        danhMuc = TienIch.Ds(duongDanDanhMuc),
        lienQuan,
    });
});

const string DieuKienHoatDong = "HienThi = 1 AND (NgayBatDau IS NULL OR NgayBatDau <= SYSUTCDATETIME()) AND (NgayKetThuc IS NULL OR NgayKetThuc >= SYSUTCDATETIME())";

app.MapGet("/api/bo-suu-tap", async () =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        $@"SELECT MaBoSuuTap, TenBoSuuTap, DuongDan, MoTa, AnhBia,
                  (SELECT COUNT(*) FROM dbo.BoSuuTapSanPham x JOIN dbo.SanPham s ON s.MaSanPham = x.MaSanPham
                   WHERE x.MaBoSuuTap = c.MaBoSuuTap AND s.TrangThai = 'DangBan') AS SoSanPham
           FROM dbo.BoSuuTap c WHERE {DieuKienHoatDong} ORDER BY NgayTao DESC")));
});

app.MapGet("/api/bo-suu-tap/{duongDan}", async (string duongDan) =>
{
    await using var db = Mo();
    object? c = await db.QueryFirstOrDefaultAsync(
        $"SELECT MaBoSuuTap, TenBoSuuTap, DuongDan, MoTa, AnhBia FROM dbo.BoSuuTap WHERE DuongDan = @duongDan AND {DieuKienHoatDong}", new { duongDan });
    return c is null ? Kq.Loi(404, "Không tìm thấy bộ sưu tập.") : Kq.Ok(TienIch.Dong(c));
});

app.MapGet("/api/banner", async (string? viTri) =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        $@"SELECT MaBanner, TieuDe, DuongDanAnh, DuongDanAnhDienThoai, LienKet, ViTri FROM dbo.Banner
           WHERE ViTri = @viTri AND {DieuKienHoatDong} ORDER BY ThuTu, MaBanner", new { viTri = string.IsNullOrEmpty(viTri) ? "TrangChu" : viTri })));
});

// ---- đánh giá
app.MapGet("/api/danh-gia", async (int maSanPham, int? trang, int? kichThuoc) =>
{
    var (tr, kt) = Trang(trang, kichThuoc, 50);
    await using var db = Mo();
    var ds = await db.QueryAsync(
        @"SELECT TenNguoiDanhGia, SoSao, NoiDung, DaMuaHang, NgayTao FROM dbo.DanhGia
          WHERE MaSanPham = @maSanPham AND TrangThai = 'HienThi' ORDER BY NgayTao DESC OFFSET @bd ROWS FETCH NEXT @kt ROWS ONLY",
        new { maSanPham, bd = (tr - 1) * kt, kt });
    var phanBo = await db.QueryAsync(
        "SELECT SoSao, COUNT(*) AS SoLuong FROM dbo.DanhGia WHERE MaSanPham = @maSanPham AND TrangThai = 'HienThi' GROUP BY SoSao", new { maSanPham });
    return Kq.Ok(new { danhSach = TienIch.Ds(ds), phanBo = TienIch.Ds(phanBo), trang = tr, kichThuoc = kt });
});

app.MapPost("/api/danh-gia", async (DanhGiaVao d, ClaimsPrincipal u, IHttpClientFactory hc) =>
{
    if (d.SoSao is < 1 or > 5) return Kq.Loi(422, "Số sao phải từ 1 đến 5.");
    var noiDung = d.NoiDung?.Trim();
    if (noiDung is { Length: > 1000 }) return Kq.Loi(422, "Nội dung đánh giá tối đa 1000 ký tự.");
    var ma = MaNguoiDung(u);
    int? maDon;
    try
    {
        var kq = await hc.CreateClient("donhang").GetAsync($"noi-bo/don-hang/da-mua?maNguoiDung={ma}&maSanPham={d.MaSanPham}");
        kq.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await kq.Content.ReadAsStringAsync());
        if (!doc.RootElement.GetProperty("daMua").GetBoolean()) return Kq.Loi(403, "Chỉ khách đã nhận hàng mới có thể đánh giá sản phẩm này.");
        maDon = doc.RootElement.TryGetProperty("maDonHang", out var m) && m.ValueKind == JsonValueKind.Number ? m.GetInt32() : null;
    }
    catch (Exception)
    {
        return Kq.Loi(503, "Chưa kiểm tra được lịch sử mua hàng. Vui lòng thử lại sau.");
    }
    await using var db = Mo();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.SanPham WHERE MaSanPham = @ma", new { ma = d.MaSanPham }) == 0)
        return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    try
    {
        await db.ExecuteAsync(
            @"INSERT INTO dbo.DanhGia (MaSanPham, MaNguoiDung, MaDonHang, TenNguoiDanhGia, SoSao, NoiDung, DaMuaHang, TrangThai)
              VALUES (@MaSanPham, @ma, @maDon, @ten, @SoSao, @noiDung, 1, 'ChoDuyet')",
            new { d.MaSanPham, ma, maDon, ten = u.FindFirstValue("ten") ?? "Khách hàng", d.SoSao, noiDung });
    }
    catch (SqlException e) when (LoiTrung(e))
    {
        return Kq.Loi(409, "Bạn đã đánh giá sản phẩm này rồi.");
    }
    return Kq.Tao(new { thongBao = "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi cửa hàng duyệt." });
}).RequireAuthorization();

// ---- yêu thích
app.MapGet("/api/yeu-thich", async (ClaimsPrincipal u) =>
{
    await using var db = Mo();
    var ds = TienIch.Ds(await db.QueryAsync(
        $@"SELECT {CotSanPham} FROM dbo.YeuThich y JOIN dbo.SanPham s ON s.MaSanPham = y.MaSanPham
           WHERE y.MaNguoiDung = @ma AND s.TrangThai = 'DangBan' ORDER BY y.NgayTao DESC", new { ma = MaNguoiDung(u) }));
    await GanMauSac(db, ds);
    return Kq.Ok(ds);
}).RequireAuthorization();

app.MapPut("/api/yeu-thich/{maSanPham:int}", async (int maSanPham, ClaimsPrincipal u) =>
{
    await using var db = Mo();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.SanPham WHERE MaSanPham = @maSanPham AND TrangThai = 'DangBan'", new { maSanPham }) == 0)
        return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    await db.ExecuteAsync(
        "IF NOT EXISTS (SELECT 1 FROM dbo.YeuThich WHERE MaNguoiDung = @ma AND MaSanPham = @maSanPham) INSERT INTO dbo.YeuThich (MaNguoiDung, MaSanPham) VALUES (@ma, @maSanPham)",
        new { ma = MaNguoiDung(u), maSanPham });
    return Kq.Ok();
}).RequireAuthorization();

app.MapDelete("/api/yeu-thich/{maSanPham:int}", async (int maSanPham, ClaimsPrincipal u) =>
{
    await using var db = Mo();
    await db.ExecuteAsync("DELETE FROM dbo.YeuThich WHERE MaNguoiDung = @ma AND MaSanPham = @maSanPham", new { ma = MaNguoiDung(u), maSanPham });
    return Kq.Ok();
}).RequireAuthorization();

// ===================================================================== NỘI BỘ (chỉ các dịch vụ khác gọi)
var noiBo = app.MapGroup("/noi-bo").AddEndpointFilter(async (ctx, next) =>
{
    var gui = Encoding.UTF8.GetBytes(ctx.HttpContext.Request.Headers["X-Khoa-Noi-Bo"].ToString());
    if (!CryptographicOperations.FixedTimeEquals(gui, Encoding.UTF8.GetBytes(khoaNoiBo)))
        return Kq.Loi(401, "Không được phép.");
    return await next(ctx);
});

noiBo.MapPost("/bien-the/lay", async (YeuCauLayBienThe yc) =>
{
    var ids = (yc.Ids ?? new()).Distinct().Take(200).ToList();
    if (ids.Count == 0) return Kq.Ok(new List<object>());
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        @"SELECT b.MaBienThe, b.MaSanPham, s.TenSanPham, s.DuongDan, b.KichCo, b.MauSac, b.MaHang,
                 COALESCE(b.GiaRieng, s.GiaBan) AS Gia, b.SoLuongTon - b.SoLuongGiuCho AS ConLai, b.HienThi, s.TrangThai AS TrangThaiSanPham,
                 (SELECT TOP 1 h.DuongDanAnh FROM dbo.HinhAnhSanPham h WHERE h.MaSanPham = s.MaSanPham
                  ORDER BY CASE WHEN h.MauSac = b.MauSac THEN 0 ELSE 1 END, h.LaAnhChinh DESC, h.ThuTu, h.MaHinhAnh) AS DuongDanAnh
          FROM dbo.BienTheSanPham b JOIN dbo.SanPham s ON s.MaSanPham = b.MaSanPham WHERE b.MaBienThe IN @ids", new { ids })));
});

const string GhiLichSu =
    "INSERT INTO dbo.LichSuTonKho (MaBienThe, LoaiBienDong, ThayDoiTon, ThayDoiGiuCho, MaThamChieu, GhiChu) VALUES (@id, @loai, @ton, @giu, @ref, @ghiChu)";

async Task<List<TongKho>> TongTheoThamChieu(SqlConnection db, SqlTransaction tx, string maThamChieu) =>
    (await db.QueryAsync<TongKho>(
        @"SELECT MaBienThe,
                 SUM(CASE WHEN LoaiBienDong IN ('GiuCho','NhaGiuCho','Ban') THEN ThayDoiGiuCho ELSE 0 END) AS Giu,
                 SUM(CASE WHEN LoaiBienDong IN ('Ban','HoanKho') THEN ThayDoiTon ELSE 0 END) AS Ton
          FROM dbo.LichSuTonKho WITH (UPDLOCK, HOLDLOCK)
          WHERE MaThamChieu = @m AND LoaiBienDong IN ('GiuCho','NhaGiuCho','Ban','HoanKho') GROUP BY MaBienThe",
        new { m = maThamChieu }, tx)).ToList();

noiBo.MapPost("/kho/giu-cho", async (YeuCauKho yc) =>
{
    if (string.IsNullOrWhiteSpace(yc.MaThamChieu) || yc.MaThamChieu.Length > 50 || yc.Dong is null || yc.Dong.Count == 0)
        return Kq.Loi(400, "Thiếu dữ liệu giữ chỗ.");
    var gop = yc.Dong.GroupBy(x => x.MaBienThe).Select(g => new DongKho(g.Key, g.Sum(x => x.SoLuong))).ToList();
    if (gop.Any(x => x.SoLuong <= 0 || x.SoLuong > 99)) return Kq.Loi(400, "Số lượng không hợp lệ.");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var daGiu = await db.ExecuteScalarAsync<int>(
        "SELECT COUNT(*) FROM dbo.LichSuTonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaThamChieu = @m AND LoaiBienDong = 'GiuCho'", new { m = yc.MaThamChieu }, tx);
    if (daGiu > 0) { await tx.CommitAsync(); return Kq.Ok(new { trangThai = "DaGiuTruoc" }); }
    foreach (var d in gop)
    {
        var n = await db.ExecuteAsync(
            @"UPDATE b SET b.SoLuongGiuCho = b.SoLuongGiuCho + @sl
              FROM dbo.BienTheSanPham b JOIN dbo.SanPham s ON s.MaSanPham = b.MaSanPham
              WHERE b.MaBienThe = @id AND b.HienThi = 1 AND s.TrangThai = 'DangBan' AND b.SoLuongTon - b.SoLuongGiuCho >= @sl",
            new { id = d.MaBienThe, sl = d.SoLuong }, tx);
        if (n == 0)
        {
            await tx.RollbackAsync();
            return Kq.Loi(409, "Sản phẩm không đủ hàng.", new { loi = "Sản phẩm không đủ hàng.", maBienThe = d.MaBienThe });
        }
        await db.ExecuteAsync(GhiLichSu, new { id = d.MaBienThe, loai = "GiuCho", ton = 0, giu = d.SoLuong, @ref = yc.MaThamChieu, ghiChu = (string?)null }, tx);
    }
    await tx.CommitAsync();
    return Kq.Ok(new { trangThai = "DaGiu" });
});

noiBo.MapPost("/kho/nha-giu-cho", async (YeuCauKho yc) =>
{
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var tong = await TongTheoThamChieu(db, tx, yc.MaThamChieu);
    var soNha = 0;
    foreach (var t in tong.Where(t => t.Giu > 0))
    {
        var n = await db.ExecuteAsync(
            "UPDATE dbo.BienTheSanPham SET SoLuongGiuCho = SoLuongGiuCho - @g WHERE MaBienThe = @id AND SoLuongGiuCho >= @g", new { g = t.Giu, id = t.MaBienThe }, tx);
        if (n == 0) continue;
        await db.ExecuteAsync(GhiLichSu, new { id = t.MaBienThe, loai = "NhaGiuCho", ton = 0, giu = -t.Giu, @ref = yc.MaThamChieu, ghiChu = (string?)null }, tx);
        soNha++;
    }
    await tx.CommitAsync();
    return Kq.Ok(new { trangThai = soNha > 0 ? "DaNha" : "KhongCoGiuCho" });
});

noiBo.MapPost("/kho/xac-nhan-ban", async (YeuCauKho yc) =>
{
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var tong = await TongTheoThamChieu(db, tx, yc.MaThamChieu);
    var canBan = tong.Where(t => t.Giu > 0).ToList();
    if (canBan.Count == 0)
    {
        await tx.CommitAsync();
        return tong.Any(t => t.Ton < 0) ? Kq.Ok(new { trangThai = "DaBan" }) : Kq.Loi(409, "Không còn giữ chỗ cho đơn này.");
    }
    foreach (var t in canBan)
    {
        var n = await db.ExecuteAsync(
            @"UPDATE dbo.BienTheSanPham SET SoLuongTon = SoLuongTon - @g, SoLuongGiuCho = SoLuongGiuCho - @g
              WHERE MaBienThe = @id AND SoLuongGiuCho >= @g AND SoLuongTon >= @g", new { g = t.Giu, id = t.MaBienThe }, tx);
        if (n == 0) { await tx.RollbackAsync(); return Kq.Loi(409, "Tồn kho không khớp, không thể xác nhận bán."); }
        await db.ExecuteAsync(
            "UPDATE s SET s.SoLuongDaBan = s.SoLuongDaBan + @g FROM dbo.SanPham s JOIN dbo.BienTheSanPham b ON b.MaSanPham = s.MaSanPham WHERE b.MaBienThe = @id",
            new { g = t.Giu, id = t.MaBienThe }, tx);
        await db.ExecuteAsync(GhiLichSu, new { id = t.MaBienThe, loai = "Ban", ton = -t.Giu, giu = -t.Giu, @ref = yc.MaThamChieu, ghiChu = (string?)null }, tx);
    }
    await tx.CommitAsync();
    return Kq.Ok(new { trangThai = "DaBan" });
});

noiBo.MapPost("/kho/hoan-kho", async (YeuCauKho yc) =>
{
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var tong = await TongTheoThamChieu(db, tx, yc.MaThamChieu);
    var yeuCau = yc.Dong?.GroupBy(x => x.MaBienThe).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));
    var soHoan = 0;
    foreach (var t in tong.Where(t => t.Ton < 0))
    {
        var daBan = -t.Ton;
        var muon = yeuCau is null ? daBan : (yeuCau.TryGetValue(t.MaBienThe, out var q) ? q : 0);
        var sl = Math.Min(muon, daBan);
        if (sl <= 0) continue;
        await db.ExecuteAsync("UPDATE dbo.BienTheSanPham SET SoLuongTon = SoLuongTon + @sl WHERE MaBienThe = @id", new { sl, id = t.MaBienThe }, tx);
        await db.ExecuteAsync(
            @"UPDATE s SET s.SoLuongDaBan = CASE WHEN s.SoLuongDaBan >= @sl THEN s.SoLuongDaBan - @sl ELSE 0 END
              FROM dbo.SanPham s JOIN dbo.BienTheSanPham b ON b.MaSanPham = s.MaSanPham WHERE b.MaBienThe = @id", new { sl, id = t.MaBienThe }, tx);
        await db.ExecuteAsync(GhiLichSu, new { id = t.MaBienThe, loai = "HoanKho", ton = sl, giu = 0, @ref = yc.MaThamChieu, ghiChu = (string?)null }, tx);
        soHoan++;
    }
    await tx.CommitAsync();
    return Kq.Ok(new { trangThai = soHoan > 0 ? "DaHoan" : "KhongCoGiHoan" });
});

// ===================================================================== QUẢN TRỊ
var qt = app.MapGroup("/api/quan-tri").RequireAuthorization("QuanTri");

// ---- sản phẩm
qt.MapGet("/san-pham", async (string? tuKhoa, string? trangThai, int? trang, int? kichThuoc) =>
{
    var (tr, kt) = Trang(trang, kichThuoc, 100);
    var dk = new List<string> { "1 = 1" };
    var p = new DynamicParameters();
    if (!string.IsNullOrWhiteSpace(tuKhoa)) { dk.Add("(s.TenKhongDau LIKE @tk OR EXISTS (SELECT 1 FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham AND b.MaHang LIKE @tk2))"); p.Add("tk", "%" + TienIch.ThoatLike(TienIch.BoDau(tuKhoa.Trim())) + "%"); p.Add("tk2", "%" + TienIch.ThoatLike(tuKhoa.Trim()) + "%"); }
    if (!string.IsNullOrWhiteSpace(trangThai)) { dk.Add("s.TrangThai = @tt"); p.Add("tt", trangThai); }
    p.Add("bd", (tr - 1) * kt); p.Add("kt", kt);
    var where = string.Join(" AND ", dk);
    await using var db = Mo();
    var tong = await db.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM dbo.SanPham s WHERE {where}", p);
    var ds = await db.QueryAsync(
        $@"SELECT s.MaSanPham, s.MaDanhMuc, c.TenDanhMuc, s.TenSanPham, s.DuongDan, s.GiaGoc, s.GiaBan, s.TrangThai, s.NoiBat, s.SoLuongDaBan,
                  (SELECT ISNULL(SUM(SoLuongTon), 0) FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham) AS TongTon,
                  (SELECT ISNULL(SUM(SoLuongGiuCho), 0) FROM dbo.BienTheSanPham b WHERE b.MaSanPham = s.MaSanPham) AS TongGiuCho,
                  (SELECT TOP 1 h.DuongDanAnh FROM dbo.HinhAnhSanPham h WHERE h.MaSanPham = s.MaSanPham ORDER BY h.LaAnhChinh DESC, h.ThuTu) AS AnhChinh
           FROM dbo.SanPham s JOIN dbo.DanhMuc c ON c.MaDanhMuc = s.MaDanhMuc WHERE {where}
           ORDER BY s.MaSanPham DESC OFFSET @bd ROWS FETCH NEXT @kt ROWS ONLY", p);
    return Kq.Ok(new { tong, trang = tr, kichThuoc = kt, danhSach = TienIch.Ds(ds) });
});

qt.MapGet("/san-pham/{ma:int}", async (int ma) =>
{
    await using var db = Mo();
    object? sp = await db.QueryFirstOrDefaultAsync("SELECT * FROM dbo.SanPham WHERE MaSanPham = @ma", new { ma });
    if (sp is null) return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    return Kq.Ok(new
    {
        sanPham = TienIch.Dong(sp),
        bienThe = TienIch.Ds(await db.QueryAsync("SELECT * FROM dbo.BienTheSanPham WHERE MaSanPham = @ma ORDER BY MauSac, MaBienThe", new { ma })),
        hinhAnh = TienIch.Ds(await db.QueryAsync("SELECT * FROM dbo.HinhAnhSanPham WHERE MaSanPham = @ma ORDER BY LaAnhChinh DESC, ThuTu, MaHinhAnh", new { ma })),
    });
});

string? KiemTraSanPham(SanPhamVao d)
{
    if (string.IsNullOrWhiteSpace(d.TenSanPham) || d.TenSanPham.Length > 200) return "Tên sản phẩm bắt buộc, tối đa 200 ký tự.";
    if (d.GiaGoc < 0 || d.GiaBan < 0 || d.GiaBan > d.GiaGoc) return "Giá bán phải nhỏ hơn hoặc bằng giá gốc.";
    if (d.TrangThai is not (null or "An" or "DangBan" or "NgungBan")) return "Trạng thái không hợp lệ.";
    return null;
}

qt.MapPost("/san-pham", async (SanPhamVao d) =>
{
    if (KiemTraSanPham(d) is { } loi) return Kq.Loi(422, loi);
    await using var db = Mo();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.DanhMuc WHERE MaDanhMuc = @m", new { m = d.MaDanhMuc }) == 0)
        return Kq.Loi(422, "Danh mục không tồn tại.");
    var goc = TienIch.Slug(d.TenSanPham, 200);
    var duongDan = goc;
    for (var i = 2; await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.SanPham WHERE DuongDan = @duongDan", new { duongDan }) > 0; i++)
        duongDan = $"{goc}-{i}";
    var ma = await db.ExecuteScalarAsync<int>(
        @"INSERT INTO dbo.SanPham (MaDanhMuc, TenSanPham, TenKhongDau, DuongDan, ThuongHieu, ChatLieu, MoTaNgan, MoTa, GiaGoc, GiaBan, TrangThai, NoiBat)
          OUTPUT INSERTED.MaSanPham VALUES (@MaDanhMuc, @ten, @khongDau, @duongDan, @ThuongHieu, @ChatLieu, @MoTaNgan, @MoTa, @GiaGoc, @GiaBan, @tt, @NoiBat)",
        new { d.MaDanhMuc, ten = d.TenSanPham.Trim(), khongDau = TienIch.BoDau(d.TenSanPham.Trim()), duongDan, d.ThuongHieu, d.ChatLieu, d.MoTaNgan, d.MoTa, d.GiaGoc, d.GiaBan, tt = d.TrangThai ?? "An", d.NoiBat });
    return Kq.Tao(new { maSanPham = ma, duongDan });
});

qt.MapPut("/san-pham/{ma:int}", async (int ma, SanPhamVao d) =>
{
    if (KiemTraSanPham(d) is { } loi) return Kq.Loi(422, loi);
    await using var db = Mo();
    var n = await db.ExecuteAsync(
        @"UPDATE dbo.SanPham SET MaDanhMuc = @MaDanhMuc, TenSanPham = @ten, TenKhongDau = @khongDau, ThuongHieu = @ThuongHieu, ChatLieu = @ChatLieu,
            MoTaNgan = @MoTaNgan, MoTa = @MoTa, GiaGoc = @GiaGoc, GiaBan = @GiaBan, TrangThai = @tt, NoiBat = @NoiBat, NgayCapNhat = SYSUTCDATETIME()
          WHERE MaSanPham = @ma",
        new { ma, d.MaDanhMuc, ten = d.TenSanPham.Trim(), khongDau = TienIch.BoDau(d.TenSanPham.Trim()), d.ThuongHieu, d.ChatLieu, d.MoTaNgan, d.MoTa, d.GiaGoc, d.GiaBan, tt = d.TrangThai ?? "An", d.NoiBat });
    return n == 0 ? Kq.Loi(404, "Không tìm thấy sản phẩm.") : Kq.Ok();
});

// ---- biến thể
qt.MapPost("/san-pham/{ma:int}/bien-the", async (int ma, BienTheVao d, ClaimsPrincipal u) =>
{
    var kichCo = d.KichCo?.Trim().ToUpperInvariant() ?? "";
    var mauSac = d.MauSac?.Trim() ?? "";
    if (kichCo.Length is 0 or > 10 || mauSac.Length is 0 or > 50) return Kq.Loi(422, "Kích cỡ (tối đa 10 ký tự) và màu sắc là bắt buộc.");
    if (d.SoLuongTon is < 0 or > 1_000_000) return Kq.Loi(422, "Số lượng tồn không hợp lệ.");
    if (d.MaMau is { Length: > 0 } && !System.Text.RegularExpressions.Regex.IsMatch(d.MaMau, "^#[0-9A-Fa-f]{6}$")) return Kq.Loi(422, "Mã màu phải dạng #RRGGBB.");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.SanPham WHERE MaSanPham = @ma", new { ma }, tx) == 0)
        return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    var maHang = string.IsNullOrWhiteSpace(d.MaHang) ? $"SP{ma}-{kichCo}-{TienIch.Slug(mauSac, 20).ToUpperInvariant()}" : d.MaHang.Trim();
    int mb;
    try
    {
        mb = await db.ExecuteScalarAsync<int>(
            @"INSERT INTO dbo.BienTheSanPham (MaSanPham, MaHang, KichCo, MauSac, MaMau, GiaRieng, SoLuongTon, HienThi)
              OUTPUT INSERTED.MaBienThe VALUES (@ma, @maHang, @kichCo, @mauSac, @MaMau, @GiaRieng, @SoLuongTon, @hienThi)",
            new { ma, maHang, kichCo, mauSac, d.MaMau, d.GiaRieng, d.SoLuongTon, hienThi = d.HienThi ?? true }, tx);
    }
    catch (SqlException e) when (LoiTrung(e))
    {
        return Kq.Loi(409, "Biến thể (kích cỡ + màu) hoặc mã hàng đã tồn tại.");
    }
    if (d.SoLuongTon > 0)
        await db.ExecuteAsync("INSERT INTO dbo.LichSuTonKho (MaBienThe, LoaiBienDong, ThayDoiTon, ThayDoiGiuCho, GhiChu, NguoiThucHien) VALUES (@mb, 'NhapKho', @sl, 0, N'Tồn ban đầu', @nv)",
            new { mb, sl = d.SoLuongTon, nv = MaNguoiDung(u) }, tx);
    await tx.CommitAsync();
    return Kq.Tao(new { maBienThe = mb, maHang });
});

qt.MapPut("/bien-the/{ma:int}", async (int ma, BienTheSua d) =>
{
    if (d.MaMau is { Length: > 0 } && !System.Text.RegularExpressions.Regex.IsMatch(d.MaMau, "^#[0-9A-Fa-f]{6}$")) return Kq.Loi(422, "Mã màu phải dạng #RRGGBB.");
    await using var db = Mo();
    var n = await db.ExecuteAsync(
        @"UPDATE dbo.BienTheSanPham SET MaMau = COALESCE(@MaMau, MaMau),
            GiaRieng = CASE WHEN @XoaGiaRieng = 1 THEN NULL WHEN @GiaRieng IS NOT NULL THEN @GiaRieng ELSE GiaRieng END,
            HienThi = COALESCE(@HienThi, HienThi) WHERE MaBienThe = @ma",
        new { ma, d.MaMau, d.GiaRieng, d.HienThi, d.XoaGiaRieng });
    return n == 0 ? Kq.Loi(404, "Không tìm thấy biến thể.") : Kq.Ok();
});

// ---- hình ảnh
qt.MapPost("/upload-anh", async (HttpRequest rq) =>
{
    if (!rq.HasFormContentType) return Kq.Loi(400, "Cần gửi tệp ảnh dạng multipart/form-data.");
    var form = await rq.ReadFormAsync();
    var tep = form.Files.FirstOrDefault();
    if (tep is null || tep.Length == 0) return Kq.Loi(400, "Chưa chọn ảnh.");
    if (tep.Length > 5 * 1024 * 1024) return Kq.Loi(413, "Ảnh tối đa 5 MB.");
    var dau = new byte[12];
    await using (var doc = tep.OpenReadStream())
    {
        var da = await doc.ReadAtLeastAsync(dau, dau.Length, throwOnEndOfStream: false);
        if (da < 12) return Kq.Loi(400, "Tệp không phải ảnh hợp lệ.");
    }
    // nhận dạng bằng chữ ký byte, không tin tên tệp/Content-Type do người dùng gửi
    string? duoi = null;
    if (dau[0] == 0xFF && dau[1] == 0xD8 && dau[2] == 0xFF) duoi = ".jpg";
    else if (dau[0] == 0x89 && dau[1] == 0x50 && dau[2] == 0x4E && dau[3] == 0x47) duoi = ".png";
    else if (dau[0] == 0x52 && dau[1] == 0x49 && dau[2] == 0x46 && dau[3] == 0x46 && dau[8] == 0x57 && dau[9] == 0x45 && dau[10] == 0x42 && dau[11] == 0x50) duoi = ".webp";
    if (duoi is null) return Kq.Loi(415, "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
    var ten = Guid.NewGuid().ToString("N") + duoi;
    await using (var ra = File.Create(Path.Combine(thuMucAnh, ten)))
    await using (var vao = tep.OpenReadStream())
        await vao.CopyToAsync(ra);
    return Kq.Tao(new { duongDan = "/anh/" + ten });
});

qt.MapPost("/san-pham/{ma:int}/hinh-anh", async (int ma, HinhAnhVao d) =>
{
    if (!d.DuongDanAnh.StartsWith("/anh/") || d.DuongDanAnh.Contains("..")) return Kq.Loi(422, "Đường dẫn ảnh không hợp lệ (hãy tải ảnh lên trước).");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.SanPham WHERE MaSanPham = @ma", new { ma }, tx) == 0)
        return Kq.Loi(404, "Không tìm thấy sản phẩm.");
    var coAnh = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.HinhAnhSanPham WHERE MaSanPham = @ma", new { ma }, tx);
    var chinh = d.LaAnhChinh || coAnh == 0;
    if (chinh) await db.ExecuteAsync("UPDATE dbo.HinhAnhSanPham SET LaAnhChinh = 0 WHERE MaSanPham = @ma AND LaAnhChinh = 1", new { ma }, tx);
    var id = await db.ExecuteScalarAsync<int>(
        @"INSERT INTO dbo.HinhAnhSanPham (MaSanPham, MauSac, DuongDanAnh, ChuThich, LaAnhChinh, ThuTu)
          OUTPUT INSERTED.MaHinhAnh VALUES (@ma, @MauSac, @DuongDanAnh, @ChuThich, @chinh, @ThuTu)", new { ma, d.MauSac, d.DuongDanAnh, d.ChuThich, chinh, d.ThuTu }, tx);
    await tx.CommitAsync();
    return Kq.Tao(new { maHinhAnh = id });
});

qt.MapPut("/hinh-anh/{ma:int}", async (int ma, HinhAnhVao d) =>
{
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var maSp = await db.ExecuteScalarAsync<int?>("SELECT MaSanPham FROM dbo.HinhAnhSanPham WHERE MaHinhAnh = @ma", new { ma }, tx);
    if (maSp is null) return Kq.Loi(404, "Không tìm thấy ảnh.");
    if (d.LaAnhChinh) await db.ExecuteAsync("UPDATE dbo.HinhAnhSanPham SET LaAnhChinh = 0 WHERE MaSanPham = @maSp AND LaAnhChinh = 1", new { maSp }, tx);
    await db.ExecuteAsync("UPDATE dbo.HinhAnhSanPham SET MauSac = @MauSac, ChuThich = @ChuThich, ThuTu = @ThuTu, LaAnhChinh = @LaAnhChinh WHERE MaHinhAnh = @ma",
        new { ma, d.MauSac, d.ChuThich, d.ThuTu, d.LaAnhChinh }, tx);
    await tx.CommitAsync();
    return Kq.Ok();
});

qt.MapDelete("/hinh-anh/{ma:int}", async (int ma) =>
{
    await using var db = Mo();
    var duong = await db.ExecuteScalarAsync<string?>("DELETE FROM dbo.HinhAnhSanPham OUTPUT DELETED.DuongDanAnh WHERE MaHinhAnh = @ma", new { ma });
    if (duong is null) return Kq.Loi(404, "Không tìm thấy ảnh.");
    if (duong.StartsWith("/anh/"))
        try { File.Delete(Path.Combine(thuMucAnh, Path.GetFileName(duong))); } catch (IOException) { }
    return Kq.Ok();
});

// ---- kho
qt.MapPost("/kho/nhap", async (NhapKhoVao d, ClaimsPrincipal u) =>
{
    if (d.SoLuong is < 1 or > 100000) return Kq.Loi(422, "Số lượng nhập từ 1 đến 100000.");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var n = await db.ExecuteAsync("UPDATE dbo.BienTheSanPham SET SoLuongTon = SoLuongTon + @sl WHERE MaBienThe = @id", new { sl = d.SoLuong, id = d.MaBienThe }, tx);
    if (n == 0) return Kq.Loi(404, "Không tìm thấy biến thể.");
    await db.ExecuteAsync("INSERT INTO dbo.LichSuTonKho (MaBienThe, LoaiBienDong, ThayDoiTon, ThayDoiGiuCho, GhiChu, NguoiThucHien) VALUES (@id, 'NhapKho', @sl, 0, @gc, @nv)",
        new { id = d.MaBienThe, sl = d.SoLuong, gc = d.GhiChu, nv = MaNguoiDung(u) }, tx);
    await tx.CommitAsync();
    return Kq.Ok();
});

qt.MapPost("/kho/dieu-chinh", async (DieuChinhKhoVao d, ClaimsPrincipal u) =>
{
    if (d.TonMoi is < 0 or > 1_000_000) return Kq.Loi(422, "Số lượng tồn không hợp lệ.");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var cu = await db.ExecuteScalarAsync<int?>(
        "UPDATE dbo.BienTheSanPham SET SoLuongTon = @moi OUTPUT DELETED.SoLuongTon WHERE MaBienThe = @id AND @moi >= SoLuongGiuCho",
        new { moi = d.TonMoi, id = d.MaBienThe }, tx);
    if (cu is null) return Kq.Loi(409, "Không tìm thấy biến thể, hoặc tồn mới thấp hơn số đang giữ chỗ cho đơn hàng.");
    if (d.TonMoi != cu)
        await db.ExecuteAsync("INSERT INTO dbo.LichSuTonKho (MaBienThe, LoaiBienDong, ThayDoiTon, ThayDoiGiuCho, GhiChu, NguoiThucHien) VALUES (@id, 'DieuChinh', @dt, 0, @gc, @nv)",
            new { id = d.MaBienThe, dt = d.TonMoi - cu.Value, gc = d.GhiChu, nv = MaNguoiDung(u) }, tx);
    await tx.CommitAsync();
    return Kq.Ok();
});

qt.MapGet("/kho/lich-su", async (int? maBienThe, int? trang, int? kichThuoc) =>
{
    var (tr, kt) = Trang(trang, kichThuoc, 100);
    await using var db = Mo();
    var ds = await db.QueryAsync(
        @"SELECT l.MaLichSu, l.MaBienThe, b.MaHang, l.LoaiBienDong, l.ThayDoiTon, l.ThayDoiGiuCho, l.MaThamChieu, l.GhiChu, l.NguoiThucHien, l.NgayTao
          FROM dbo.LichSuTonKho l JOIN dbo.BienTheSanPham b ON b.MaBienThe = l.MaBienThe
          WHERE (@mb IS NULL OR l.MaBienThe = @mb) ORDER BY l.MaLichSu DESC OFFSET @bd ROWS FETCH NEXT @kt ROWS ONLY",
        new { mb = maBienThe, bd = (tr - 1) * kt, kt });
    return Kq.Ok(TienIch.Ds(ds));
});

qt.MapGet("/kho/ton-thap", async (int? nguong) =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        @"SELECT b.MaBienThe, b.MaHang, s.TenSanPham, b.KichCo, b.MauSac, b.SoLuongTon, b.SoLuongGiuCho, b.SoLuongTon - b.SoLuongGiuCho AS ConLai
          FROM dbo.BienTheSanPham b JOIN dbo.SanPham s ON s.MaSanPham = b.MaSanPham
          WHERE s.TrangThai = 'DangBan' AND b.HienThi = 1 AND b.SoLuongTon - b.SoLuongGiuCho <= @nguong ORDER BY ConLai, s.TenSanPham", new { nguong = nguong ?? 5 })));
});

// ---- danh mục
qt.MapGet("/danh-muc", async () =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync("SELECT * FROM dbo.DanhMuc ORDER BY ThuTu, TenDanhMuc")));
});

qt.MapPost("/danh-muc", async (DanhMucVao d) =>
{
    if (string.IsNullOrWhiteSpace(d.TenDanhMuc) || d.TenDanhMuc.Length > 100) return Kq.Loi(422, "Tên danh mục bắt buộc, tối đa 100 ký tự.");
    await using var db = Mo();
    var goc = TienIch.Slug(d.TenDanhMuc, 110);
    var duongDan = goc;
    for (var i = 2; await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.DanhMuc WHERE DuongDan = @duongDan", new { duongDan }) > 0; i++) duongDan = $"{goc}-{i}";
    var ma = await db.ExecuteScalarAsync<int>(
        "INSERT INTO dbo.DanhMuc (MaDanhMucCha, TenDanhMuc, TenKhongDau, DuongDan, MoTa, ThuTu, HienThi) OUTPUT INSERTED.MaDanhMuc VALUES (@MaDanhMucCha, @ten, @kd, @duongDan, @MoTa, @ThuTu, @HienThi)",
        new { d.MaDanhMucCha, ten = d.TenDanhMuc.Trim(), kd = TienIch.BoDau(d.TenDanhMuc.Trim()), duongDan, d.MoTa, d.ThuTu, d.HienThi });
    return Kq.Tao(new { maDanhMuc = ma, duongDan });
});

qt.MapPut("/danh-muc/{ma:int}", async (int ma, DanhMucVao d) =>
{
    if (string.IsNullOrWhiteSpace(d.TenDanhMuc)) return Kq.Loi(422, "Tên danh mục bắt buộc.");
    if (d.MaDanhMucCha == ma) return Kq.Loi(422, "Danh mục không thể là cha của chính nó.");
    await using var db = Mo();
    var n = await db.ExecuteAsync(
        "UPDATE dbo.DanhMuc SET MaDanhMucCha = @MaDanhMucCha, TenDanhMuc = @ten, TenKhongDau = @kd, MoTa = @MoTa, ThuTu = @ThuTu, HienThi = @HienThi WHERE MaDanhMuc = @ma",
        new { ma, d.MaDanhMucCha, ten = d.TenDanhMuc.Trim(), kd = TienIch.BoDau(d.TenDanhMuc.Trim()), d.MoTa, d.ThuTu, d.HienThi });
    return n == 0 ? Kq.Loi(404, "Không tìm thấy danh mục.") : Kq.Ok();
});

qt.MapDelete("/danh-muc/{ma:int}", async (int ma) =>
{
    await using var db = Mo();
    var dangDung = await db.ExecuteScalarAsync<int>(
        "SELECT (SELECT COUNT(*) FROM dbo.SanPham WHERE MaDanhMuc = @ma) + (SELECT COUNT(*) FROM dbo.DanhMuc WHERE MaDanhMucCha = @ma)", new { ma });
    if (dangDung > 0) return Kq.Loi(409, "Danh mục còn sản phẩm hoặc danh mục con, không thể xóa. Hãy ẩn danh mục thay vì xóa.");
    await db.ExecuteAsync("DELETE FROM dbo.DanhMuc WHERE MaDanhMuc = @ma", new { ma });
    return Kq.Ok();
});

// ---- bộ sưu tập
qt.MapGet("/bo-suu-tap", async () =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        @"SELECT c.*, (SELECT COUNT(*) FROM dbo.BoSuuTapSanPham x WHERE x.MaBoSuuTap = c.MaBoSuuTap) AS SoSanPham FROM dbo.BoSuuTap c ORDER BY c.MaBoSuuTap DESC")));
});

qt.MapGet("/bo-suu-tap/{ma:int}/san-pham", async (int ma) =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        "SELECT x.MaSanPham, s.TenSanPham, x.ThuTu FROM dbo.BoSuuTapSanPham x JOIN dbo.SanPham s ON s.MaSanPham = x.MaSanPham WHERE x.MaBoSuuTap = @ma ORDER BY x.ThuTu", new { ma })));
});

qt.MapPost("/bo-suu-tap", async (BoSuuTapVao d) =>
{
    if (string.IsNullOrWhiteSpace(d.TenBoSuuTap)) return Kq.Loi(422, "Tên bộ sưu tập bắt buộc.");
    if (d.NgayBatDau is not null && d.NgayKetThuc is not null && d.NgayKetThuc <= d.NgayBatDau) return Kq.Loi(422, "Ngày kết thúc phải sau ngày bắt đầu.");
    await using var db = Mo();
    var goc = TienIch.Slug(d.TenBoSuuTap, 150);
    var duongDan = goc;
    for (var i = 2; await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.BoSuuTap WHERE DuongDan = @duongDan", new { duongDan }) > 0; i++) duongDan = $"{goc}-{i}";
    var ma = await db.ExecuteScalarAsync<int>(
        "INSERT INTO dbo.BoSuuTap (TenBoSuuTap, DuongDan, MoTa, AnhBia, HienThi, NgayBatDau, NgayKetThuc) OUTPUT INSERTED.MaBoSuuTap VALUES (@TenBoSuuTap, @duongDan, @MoTa, @AnhBia, @HienThi, @NgayBatDau, @NgayKetThuc)",
        new { d.TenBoSuuTap, duongDan, d.MoTa, d.AnhBia, d.HienThi, d.NgayBatDau, d.NgayKetThuc });
    return Kq.Tao(new { maBoSuuTap = ma, duongDan });
});

qt.MapPut("/bo-suu-tap/{ma:int}", async (int ma, BoSuuTapVao d) =>
{
    if (d.NgayBatDau is not null && d.NgayKetThuc is not null && d.NgayKetThuc <= d.NgayBatDau) return Kq.Loi(422, "Ngày kết thúc phải sau ngày bắt đầu.");
    await using var db = Mo();
    var n = await db.ExecuteAsync(
        "UPDATE dbo.BoSuuTap SET TenBoSuuTap = @TenBoSuuTap, MoTa = @MoTa, AnhBia = @AnhBia, HienThi = @HienThi, NgayBatDau = @NgayBatDau, NgayKetThuc = @NgayKetThuc WHERE MaBoSuuTap = @ma",
        new { ma, d.TenBoSuuTap, d.MoTa, d.AnhBia, d.HienThi, d.NgayBatDau, d.NgayKetThuc });
    return n == 0 ? Kq.Loi(404, "Không tìm thấy bộ sưu tập.") : Kq.Ok();
});

qt.MapPut("/bo-suu-tap/{ma:int}/san-pham", async (int ma, DanhSachSanPhamVao d) =>
{
    var ids = (d.MaSanPham ?? new()).Distinct().ToList();
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.BoSuuTap WHERE MaBoSuuTap = @ma", new { ma }, tx) == 0)
        return Kq.Loi(404, "Không tìm thấy bộ sưu tập.");
    await db.ExecuteAsync("DELETE FROM dbo.BoSuuTapSanPham WHERE MaBoSuuTap = @ma", new { ma }, tx);
    for (var i = 0; i < ids.Count; i++)
        await db.ExecuteAsync(
            "INSERT INTO dbo.BoSuuTapSanPham (MaBoSuuTap, MaSanPham, ThuTu) SELECT @ma, MaSanPham, @tt FROM dbo.SanPham WHERE MaSanPham = @sp", new { ma, sp = ids[i], tt = i }, tx);
    await tx.CommitAsync();
    return Kq.Ok();
});

// ---- đánh giá
qt.MapGet("/danh-gia", async (string? trangThai, int? trang, int? kichThuoc) =>
{
    var (tr, kt) = Trang(trang, kichThuoc, 100);
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync(
        @"SELECT d.MaDanhGia, d.MaSanPham, s.TenSanPham, d.TenNguoiDanhGia, d.SoSao, d.NoiDung, d.DaMuaHang, d.TrangThai, d.NgayTao
          FROM dbo.DanhGia d JOIN dbo.SanPham s ON s.MaSanPham = d.MaSanPham WHERE (@tt IS NULL OR d.TrangThai = @tt)
          ORDER BY d.NgayTao DESC OFFSET @bd ROWS FETCH NEXT @kt ROWS ONLY", new { tt = string.IsNullOrEmpty(trangThai) ? null : trangThai, bd = (tr - 1) * kt, kt })));
});

qt.MapPatch("/danh-gia/{ma:int}", async (int ma, DuyetDanhGia d) =>
{
    if (d.TrangThai is not ("HienThi" or "An" or "ChoDuyet")) return Kq.Loi(422, "Trạng thái không hợp lệ.");
    await using var db = Mo();
    await db.OpenAsync();
    await using var tx = (SqlTransaction)await db.BeginTransactionAsync();
    var maSp = await db.ExecuteScalarAsync<int?>("UPDATE dbo.DanhGia SET TrangThai = @tt OUTPUT INSERTED.MaSanPham WHERE MaDanhGia = @ma", new { tt = d.TrangThai, ma }, tx);
    if (maSp is null) return Kq.Loi(404, "Không tìm thấy đánh giá.");
    await db.ExecuteAsync(
        @"UPDATE dbo.SanPham SET
            DiemDanhGiaTB = ISNULL((SELECT CAST(AVG(CAST(SoSao AS DECIMAL(5,2))) AS DECIMAL(3,2)) FROM dbo.DanhGia WHERE MaSanPham = @sp AND TrangThai = 'HienThi'), 0),
            SoLuotDanhGia = (SELECT COUNT(*) FROM dbo.DanhGia WHERE MaSanPham = @sp AND TrangThai = 'HienThi')
          WHERE MaSanPham = @sp", new { sp = maSp }, tx);
    await tx.CommitAsync();
    return Kq.Ok();
});

// ---- banner
qt.MapGet("/banner", async () =>
{
    await using var db = Mo();
    return Kq.Ok(TienIch.Ds(await db.QueryAsync("SELECT * FROM dbo.Banner ORDER BY ViTri, ThuTu, MaBanner")));
});

string? KiemTraBanner(BannerVao d)
{
    if (string.IsNullOrWhiteSpace(d.TieuDe) || string.IsNullOrWhiteSpace(d.DuongDanAnh)) return "Tiêu đề và ảnh là bắt buộc.";
    if (d.ViTri is not (null or "TrangChu" or "DanhMuc")) return "Vị trí không hợp lệ.";
    if (d.LienKet is { Length: > 0 } && !(d.LienKet.StartsWith('/') && !d.LienKet.StartsWith("//")) && !d.LienKet.StartsWith("https://")) return "Liên kết phải bắt đầu bằng / hoặc https://";
    return null;
}

qt.MapPost("/banner", async (BannerVao d) =>
{
    if (KiemTraBanner(d) is { } loi) return Kq.Loi(422, loi);
    await using var db = Mo();
    var ma = await db.ExecuteScalarAsync<int>(
        @"INSERT INTO dbo.Banner (TieuDe, DuongDanAnh, DuongDanAnhDienThoai, LienKet, ViTri, ThuTu, HienThi, NgayBatDau, NgayKetThuc)
          OUTPUT INSERTED.MaBanner VALUES (@TieuDe, @DuongDanAnh, @DuongDanAnhDienThoai, @LienKet, @viTri, @ThuTu, @HienThi, @NgayBatDau, @NgayKetThuc)",
        new { d.TieuDe, d.DuongDanAnh, d.DuongDanAnhDienThoai, d.LienKet, viTri = d.ViTri ?? "TrangChu", d.ThuTu, d.HienThi, d.NgayBatDau, d.NgayKetThuc });
    return Kq.Tao(new { maBanner = ma });
});

qt.MapPut("/banner/{ma:int}", async (int ma, BannerVao d) =>
{
    if (KiemTraBanner(d) is { } loi) return Kq.Loi(422, loi);
    await using var db = Mo();
    var n = await db.ExecuteAsync(
        @"UPDATE dbo.Banner SET TieuDe = @TieuDe, DuongDanAnh = @DuongDanAnh, DuongDanAnhDienThoai = @DuongDanAnhDienThoai, LienKet = @LienKet,
            ViTri = @viTri, ThuTu = @ThuTu, HienThi = @HienThi, NgayBatDau = @NgayBatDau, NgayKetThuc = @NgayKetThuc WHERE MaBanner = @ma",
        new { ma, d.TieuDe, d.DuongDanAnh, d.DuongDanAnhDienThoai, d.LienKet, viTri = d.ViTri ?? "TrangChu", d.ThuTu, d.HienThi, d.NgayBatDau, d.NgayKetThuc });
    return n == 0 ? Kq.Loi(404, "Không tìm thấy banner.") : Kq.Ok();
});

qt.MapDelete("/banner/{ma:int}", async (int ma) =>
{
    await using var db = Mo();
    await db.ExecuteAsync("DELETE FROM dbo.Banner WHERE MaBanner = @ma", new { ma });
    return Kq.Ok();
});

app.Run();
