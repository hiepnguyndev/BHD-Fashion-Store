package com.fashionstore.order;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Lỗi nghiệp vụ: mã HTTP + câu thông báo tiếng Việt hiển thị cho khách. */
public class ApiError {
    private ApiError() {
    }

    public static class LoiNghiepVu extends RuntimeException {
        private final int ma;
        private final Map<String, Object> them;

        public LoiNghiepVu(int ma, String noiDung) {
            this(ma, noiDung, null);
        }

        public LoiNghiepVu(int ma, String noiDung, Map<String, Object> them) {
            super(noiDung);
            this.ma = ma;
            this.them = them;
        }

        public int ma() {
            return ma;
        }

        public Map<String, Object> them() {
            return them;
        }
    }

    @RestControllerAdvice
    public static class Xuly {
        private static final Logger log = LoggerFactory.getLogger(Xuly.class);

        @ExceptionHandler(LoiNghiepVu.class)
        public ResponseEntity<Map<String, Object>> nghiepVu(LoiNghiepVu e) {
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("loi", e.getMessage());
            if (e.them() != null) body.putAll(e.them());
            return ResponseEntity.status(e.ma()).body(body);
        }

        @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
        public ResponseEntity<Map<String, Object>> duLieuSai(Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("loi", "Dữ liệu gửi lên không hợp lệ."));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<Map<String, Object>> khac(Exception e) {
            log.error("Lỗi không lường trước", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("loi", "Có lỗi hệ thống. Vui lòng thử lại sau."));
        }
    }
}
