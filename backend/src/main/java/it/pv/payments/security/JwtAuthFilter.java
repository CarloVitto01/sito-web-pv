package it.pv.payments.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    private final it.pv.payments.repository.UserRepository users;

    public JwtAuthFilter(JwtService jwtService, it.pv.payments.repository.UserRepository users) {
        this.users = users;
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = jwtService.parse(token);
                if ("access".equals(claims.get("type", String.class))) {
                    String userId = claims.getSubject();
                    var user = users.findById(userId).orElse(null);
                    if (user != null && jwtService.isCurrent(claims, user)) {
                        String ruolo = user.getRole().getName();
                        var principal = new AuthenticatedUser(userId, user.getEmail(), ruolo);
                        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + ruolo));
                        var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // token assente/non valido: la richiesta prosegue come anonima,
                // sara' eventualmente respinta da un endpoint che richiede autenticazione.
            }
        }
        filterChain.doFilter(request, response);
    }
}
