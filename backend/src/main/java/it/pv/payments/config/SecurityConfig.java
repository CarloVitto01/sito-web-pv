package it.pv.payments.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain sc(HttpSecurity http) throws Exception {
   http.csrf(csrf -> csrf.disable())
    .cors(cors -> cors.configurationSource(req -> {
      var c = new org.springframework.web.cors.CorsConfiguration();
      c.setAllowedOrigins(java.util.List.of(
        "https://photoandvision.it","https://www.photoandvision.it","http://photoandvision.it","http://localhost:3000"
      ));
      c.setAllowedMethods(java.util.List.of("POST","GET","OPTIONS"));
      c.setAllowedHeaders(java.util.List.of("Content-Type","Authorization"));
      c.setAllowCredentials(true);
      return c;
    }))
    .authorizeHttpRequests(a -> a.requestMatchers("/api/paypal/**").permitAll().anyRequest().permitAll());
    return http.build();
  }
}
