package it.pv.payments.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    return http
        // Abilita CORS (usa il bean sotto)
        .cors(Customizer.withDefaults())

        // Le nostre API di pagamento non usano CSRF token
        .csrf(csrf -> csrf.ignoringRequestMatchers("/api/paypal/**", "/api/payments/**"))

        // Niente sessioni server-side per le API
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

        // Disabilita login form & basic auth (non servono per le API pubbliche)
        .formLogin(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)

        .authorizeHttpRequests(reg -> reg
            // Preflight
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            // API aperte
            .requestMatchers("/api/paypal/**", "/api/payments/**", "/actuator/health").permitAll()
            // Tutto il resto autenticato (se non ti serve, puoi aprire anche questo)
            .anyRequest().authenticated())
        .build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowCredentials(true);
    cfg.setAllowedOrigins(List.of(
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.216:3000",
        "https://photoandvision.it"));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
    cfg.setExposedHeaders(List.of("Location")); // opzionale

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);
    return source;
  }
}