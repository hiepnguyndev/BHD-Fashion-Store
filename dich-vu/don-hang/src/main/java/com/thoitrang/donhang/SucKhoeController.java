package com.thoitrang.donhang;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SucKhoeController {
    private final JdbcTemplate jdbc;

    public SucKhoeController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, String> suc() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("trangThai", "ok");
    }
}
