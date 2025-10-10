package it.pv.payments.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

  @Bean
  public CorsFilter corsFilter() {
    CorsConfiguration cfg = new CorsConfiguration();
    // ✅ Produzione (dominio tuo)
    cfg.setAllowedOriginPatterns(List.of(
        "https://photoandvision.it",
        "https://www.photoandvision.it",
        "https://*.photoandvision.it",
        // ✅ Sviluppo (localhost)
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://192.168.1.216:*"));
    cfg.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("*"));
    cfg.setAllowCredentials(true);
    cfg.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return new CorsFilter(source);
  }
}