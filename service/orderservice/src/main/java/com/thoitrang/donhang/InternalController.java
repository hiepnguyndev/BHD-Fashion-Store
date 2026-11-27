package com.thoitrang.donhang;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API nội bộ giữa các dịch vụ (đã có KhoaNoiBoFilter chặn mọi lời gọi thiếu khóa). */
@RestController
@RequestMapping("/noi-bo")
public class InternalController {
    private final OrderService dv;

    public InternalController(OrderService dv) {
        this.dv = dv;
    }

    /** PaymentService báo đã nhận đủ tiền. Trả ketQua = ok | donDaHuy. */
    @PostMapping("/don-hang/{id}/da-thanh-toan")
    public Map<String, Object> daThanhToan(@PathVariable int id, @RequestBody(required = false) Requests.DaThanhToan yc) {
        return Map.of("ketQua", dv.thanhToanThanhCong(id, yc));
    }

    /** ProductService hỏi: khách này đã nhận hàng sản phẩm này chưa (để cho phép đánh giá). */
    @GetMapping("/don-hang/da-mua")
    public Map<String, Object> daMua(@RequestParam int maNguoiDung, @RequestParam int maSanPham) {
        return dv.daMua(maNguoiDung, maSanPham);
    }

}
