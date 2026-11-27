package com.fashionstore.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduledJobs {
    private static final Logger log = LoggerFactory.getLogger(ScheduledJobs.class);
    private final OrderService dv;

    public ScheduledJobs(OrderService dv) {
        this.dv = dv;
    }

    /** Mỗi 30 giây: hủy đơn quá hạn thanh toán (trả hàng giữ chỗ) hoặc chuyển tiếp nếu tiền đã vào. */
    @Scheduled(fixedDelay = 30_000, initialDelay = 20_000)
    public void hetHanThanhToan() {
        try {
            dv.xuLyHetHan();
        } catch (RuntimeException e) {
            log.warn("Quét đơn hết hạn lỗi: {}", e.getMessage());
        }
    }
}
