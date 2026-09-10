package it.pv.payments.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import it.pv.payments.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTokenTtlSeconds;
    private final long refreshTokenTtlSeconds;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-ttl-seconds:43200}") long accessTokenTtlSeconds,
            @Value("${app.jwt.refresh-ttl-seconds:2592000}") long refreshTokenTtlSeconds,
            org.springframework.core.env.Environment environment
    ) {
        if (environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))
                && (secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32 || secret.startsWith("dev-only"))) {
            throw new IllegalStateException("JWT_SECRET deve contenere almeno 32 byte casuali in produzione");
        }
        // La secret deve avere almeno 32 byte per HS256: la espandiamo se piu' corta (comodo in locale).
        String padded = secret.length() >= 32 ? secret : (secret + "0".repeat(32 - secret.length()));
        this.key = Keys.hmacShaKeyFor(padded.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("ruolo", user.getRole().getName())
                .claim("type", "access")
                .claim("version", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenTtlSeconds)))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim("type", "refresh")
                .claim("version", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(refreshTokenTtlSeconds)))
                .signWith(key)
                .compact();
    }

    /**
     * Token che autorizza il download di UN SOLO file specifico, senza richiedere un login: serve per i link
     * ai PDF nei messaggi Telegram, che vengono aperti direttamente dal browser senza header Authorization.
     */
    public String generateFileDownloadToken(Long orderFileId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(orderFileId))
                .claim("type", "file-download")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(30L * 24 * 3600)))
                .signWith(key)
                .compact();
    }

    public String generatePasswordResetToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim("type", "pwreset")
                .claim("version", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key)
                .compact();
    }

    public boolean isCurrent(Claims claims, User user) {
        Number version = claims.get("version", Number.class);
        return version != null && version.longValue() == user.getTokenVersion();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
