package com.thoitrang.donhang;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

    @Bean
    JwtDecoder jwtDecoder(AppConfig cau) throws Exception {
        Path duongDan = Path.of(cau.thuMucKhoa(), "public.pem");
        for (int i = 0; i < 60 && !Files.exists(duongDan); i++) Thread.sleep(1000);
        String pem = Files.readString(duongDan)
                .replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", "");
        RSAPublicKey khoa = (RSAPublicKey) KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(pem)));
        NimbusJwtDecoder giaiMa = NimbusJwtDecoder.withPublicKey(khoa).build();
        giaiMa.setJwtValidator(JwtValidators.createDefaultWithIssuer("thoitrang-nguoidung"));
        return giaiMa;
    }

    @Bean
    SecurityFilterChain chuoiLoc(HttpSecurity http, AppConfig cau) throws Exception {
        JwtGrantedAuthoritiesConverter quyen = new JwtGrantedAuthoritiesConverter();
        quyen.setAuthoritiesClaimName("vai_tro");
        quyen.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter doi = new JwtAuthenticationConverter();
        doi.setJwtGrantedAuthoritiesConverter(quyen);

        http.csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new KhoaNoiBoFilter(cau.khoaNoiBo()), BearerTokenAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/health", "/noi-bo/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/don-hang").permitAll()
                        .requestMatchers("/api/don-hang/tra-cuu", "/api/don-hang/tra-cuu/**").permitAll()
                        .requestMatchers("/api/phieu-giam-gia/kiem-tra", "/api/phieu-giam-gia/cong-khai").permitAll()
                        .requestMatchers("/api/quan-tri/**").hasRole("QuanTri")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(doi)));
        return http.build();
    }

    /** Mọi đường dẫn /noi-bo/ phải kèm khóa nội bộ đúng; nếu không trả 401. */
    static final class KhoaNoiBoFilter extends OncePerRequestFilter {
        private final byte[] khoa;

        KhoaNoiBoFilter(String khoa) {
            this.khoa = khoa.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest req) {
            return !req.getRequestURI().startsWith("/noi-bo/");
        }

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            String gui = req.getHeader("X-Khoa-Noi-Bo");
            if (gui == null || !MessageDigest.isEqual(gui.getBytes(StandardCharsets.UTF_8), khoa)) {
                res.setStatus(401);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"loi\":\"Không được phép.\"}");
                return;
            }
            chain.doFilter(req, res);
        }
    }
}
