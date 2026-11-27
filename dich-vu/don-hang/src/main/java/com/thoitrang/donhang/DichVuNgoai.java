package com.thoitrang.donhang;

import com.thoitrang.donhang.Loi.LoiNghiepVu;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/** Gọi các dịch vụ khác (sản phẩm/kho, thanh toán, thông báo) bằng khóa nội bộ. */
@Component
public class DichVuNgoai {
    private static final Logger log = LoggerFactory.getLogger(DichVuNgoai.class);
    private static final ParameterizedTypeReference<List<Map<String, Object>>> DS = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<Map<String, Object>> BAN_DO = new ParameterizedTypeReference<>() {
    };

    private final RestClient sanPham;
    private final RestClient thanhToan;
    private final RestClient thongBao;

    public DichVuNgoai(CauHinhUngDung cau) {
        this.sanPham = tao(cau.sanPhamUrl(), cau.khoaNoiBo());
        this.thanhToan = tao(cau.thanhToanUrl(), cau.khoaNoiBo());
        this.thongBao = tao(cau.thongBaoUrl(), cau.khoaNoiBo());
    }

    private static RestClient tao(String url, String khoa) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory nha = new JdkClientHttpRequestFactory(http);
        nha.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().baseUrl(url).requestFactory(nha)
                .defaultHeader("X-Khoa-Noi-Bo", khoa).build();
    }

    // ---------------------------------------------------------------- sản phẩm / kho
    public Map<Integer, Map<String, Object>> layBienThe(List<Integer> ids) {
        try {
            List<Map<String, Object>> ds = sanPham.post().uri("/noi-bo/bien-the/lay")
                    .contentType(MediaType.APPLICATION_JSON).body(Map.of("ids", ids)).retrieve().body(DS);
            Map<Integer, Map<String, Object>> kq = new HashMap<>();
            if (ds != null) for (Map<String, Object> b : ds) kq.put(((Number) b.get("maBienThe")).intValue(), b);
            return kq;
        } catch (Exception e) {
            log.warn("Không lấy được biến thể: {}", e.getMessage());
            throw new LoiNghiepVu(503, "Chưa tải được thông tin sản phẩm. Vui lòng thử lại.");
        }
    }

    /** Giữ chỗ tồn kho cho đơn. 409 = không đủ hàng. */
    public void giuCho(String maThamChieu, List<Map<String, Object>> dong) {
        try {
            sanPham.post().uri("/noi-bo/kho/giu-cho").contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("maThamChieu", maThamChieu, "dong", dong)).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            throw new LoiNghiepVu(409, "Rất tiếc, một sản phẩm trong đơn vừa hết hàng. Vui lòng kiểm tra lại giỏ hàng.");
        } catch (Exception e) {
            log.warn("Giữ chỗ lỗi: {}", e.getMessage());
            throw new LoiNghiepVu(503, "Chưa giữ được hàng cho đơn. Vui lòng thử lại.");
        }
    }

    public void nhaGiuCho(String maThamChieu) {
        goiKho("/noi-bo/kho/nha-giu-cho", Map.of("maThamChieu", maThamChieu), false);
    }

    public void xacNhanBan(String maThamChieu) {
        goiKho("/noi-bo/kho/xac-nhan-ban", Map.of("maThamChieu", maThamChieu), true);
    }

    public void hoanKho(String maThamChieu, List<Map<String, Object>> dong) {
        Map<String, Object> body = new HashMap<>();
        body.put("maThamChieu", maThamChieu);
        if (dong != null) body.put("dong", dong);
        goiKho("/noi-bo/kho/hoan-kho", body, false);
    }

    public void giuChoDoiHang(String maThamChieu, List<Map<String, Object>> dong) {
        giuCho(maThamChieu, dong);
    }

    private void goiKho(String duongDan, Map<String, Object> body, boolean batBuoc) {
        try {
            sanPham.post().uri(duongDan).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            if (batBuoc) throw new LoiNghiepVu(409, "Không còn giữ chỗ tồn kho cho đơn này (có thể đã hết hạn giữ hàng).");
            log.warn("Kho trả 409 ở {}: {}", duongDan, e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Gọi kho {} lỗi: {}", duongDan, e.getMessage());
            throw new LoiNghiepVu(503, "Chưa cập nhật được kho. Vui lòng thử lại.");
        }
    }

    // ---------------------------------------------------------------- thanh toán
    public Map<String, Object> taoThanhToan(Map<String, Object> body) {
        try {
            return thanhToan.post().uri("/noi-bo/thanh-toan/tao").contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(BAN_DO);
        } catch (Exception e) {
            log.error("Tạo thanh toán lỗi: {}", e.getMessage());
            throw new LoiNghiepVu(503, "Chưa tạo được giao dịch thanh toán. Vui lòng thử lại.");
        }
    }

    /** Thông tin thanh toán của đơn; null nếu không lấy được (không làm hỏng trang chi tiết đơn). */
    public Map<String, Object> thanhToanCuaDon(int maDonHang) {
        try {
            return thanhToan.get().uri("/noi-bo/thanh-toan/don/{id}", maDonHang).retrieve().body(BAN_DO);
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        } catch (Exception e) {
            log.warn("Không lấy được thanh toán đơn {}: {}", maDonHang, e.getMessage());
            return null;
        }
    }

    public void huyThanhToan(int maDonHang) {
        try {
            thanhToan.post().uri("/noi-bo/thanh-toan/huy").contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("maDonHang", maDonHang)).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.error("Hủy thanh toán đơn {} lỗi: {}", maDonHang, e.getMessage());
            throw new LoiNghiepVu(503, "Chưa hủy được giao dịch thanh toán. Vui lòng thử lại.");
        }
    }

    public void codDaThu(int maDonHang) {
        try {
            thanhToan.post().uri("/noi-bo/thanh-toan/cod-da-thu").contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("maDonHang", maDonHang)).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.error("Ghi nhận COD đơn {} lỗi: {}", maDonHang, e.getMessage());
            throw new LoiNghiepVu(503, "Chưa ghi nhận được thu tiền COD. Vui lòng thử lại.");
        }
    }

    // ---------------------------------------------------------------- thông báo (không bao giờ làm hỏng nghiệp vụ chính)
    public void guiEmail(String mau, String den, Map<String, Object> duLieu, String maThamChieu) {
        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> body = new HashMap<>();
                body.put("mau", mau);
                body.put("den", den);
                body.put("duLieu", duLieu);
                body.put("maThamChieu", maThamChieu);
                thongBao.post().uri("/noi-bo/gui-email").contentType(MediaType.APPLICATION_JSON).body(body)
                        .retrieve().toBodilessEntity();
            } catch (Exception e) {
                log.warn("Không gửi được email {} cho {}: {}", mau, maThamChieu, e.getMessage());
            }
        });
    }

    public void thongBaoTrongApp(int maNguoiDung, String tieuDe, String noiDung, String lienKet) {
        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> body = new HashMap<>();
                body.put("maNguoiDung", maNguoiDung);
                body.put("tieuDe", tieuDe);
                body.put("noiDung", noiDung);
                body.put("lienKet", lienKet);
                thongBao.post().uri("/noi-bo/thong-bao").contentType(MediaType.APPLICATION_JSON).body(body)
                        .retrieve().toBodilessEntity();
            } catch (Exception e) {
                log.warn("Không tạo được thông báo trong ứng dụng: {}", e.getMessage());
            }
        });
    }
}
