package it.pv.payments.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.ignoringRequestMatchers("/api/payments/**"));
    http.authorizeHttpRequests(reg -> reg
        .requestMatchers("/api/payments/**", "/actuator/health").permitAll()
        .anyRequest().authenticated()
    );
    return http.build();
  }
}
