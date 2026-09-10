package it.pv.payments.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import it.pv.payments.domain.Role;
import it.pv.payments.domain.User;
import it.pv.payments.dto.AuthDtos.*;
import it.pv.payments.repository.RoleRepository;
import it.pv.payments.repository.UserRepository;
import it.pv.payments.security.FirebaseLegacyPasswordVerifier;
import it.pv.payments.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private static final String DEFAULT_ROLE = "PublicUser";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final FirebaseLegacyPasswordVerifier firebaseLegacyPasswordVerifier;
    private final String frontendBaseUrl;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                        PasswordEncoder passwordEncoder, JwtService jwtService, EmailService emailService,
                        FirebaseLegacyPasswordVerifier firebaseLegacyPasswordVerifier,
                        @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.firebaseLegacyPasswordVerifier = firebaseLegacyPasswordVerifier;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email gia' registrata");
        }
        Role defaultRole = roleRepository.findByName(DEFAULT_ROLE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Ruolo di default mancante"));

        User user = new User();
        user.setEmail(req.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setDisplayName(req.displayName());
        user.setCognome(req.cognome());
        user.setTelefono(req.telefono());
        user.setCorsoLaurea(req.corsoLaurea());
        user.setAnnoAccademico(req.annoAccademico());
        user.setRole(defaultRole);
        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide"));

        if (passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            return buildAuthResponse(user);
        }

        // Utente migrato da Firebase, mai ancora loggato con la password reale: proviamo col vecchio
        // algoritmo e, se corrisponde, la convertiamo subito in BCrypt cosi' non serve piu' in seguito.
        if (user.getLegacyPasswordHash() != null
                && firebaseLegacyPasswordVerifier.verify(req.password(), user.getLegacyPasswordSalt(), user.getLegacyPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
            user.setLegacyPasswordHash(null);
            user.setLegacyPasswordSalt(null);
            userRepository.save(user);
            return buildAuthResponse(user);
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide");
    }

    public AuthResponse refresh(RefreshRequest req) {
        Claims claims;
        try {
            claims = jwtService.parse(req.refreshToken());
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token non valido");
        }
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token non valido");
        }
        User user = userRepository.findById(claims.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utente non trovato"));
        if (!jwtService.isCurrent(claims, user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessione scaduta");
        }
        return buildAuthResponse(user);
    }

    @Transactional
    public void logout(String userId) {
        userRepository.findLockedById(userId).ifPresent(User::revokeTokens);
    }

    public UserDto me(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
        return toDto(user);
    }

    @Transactional
    public UserDto updateProfile(String userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
        if (req.displayName() != null) user.setDisplayName(req.displayName());
        if (req.cognome() != null) user.setCognome(req.cognome());
        if (req.telefono() != null) user.setTelefono(req.telefono());
        if (req.corsoLaurea() != null) user.setCorsoLaurea(req.corsoLaurea());
        if (req.annoAccademico() != null) user.setAnnoAccademico(req.annoAccademico());
        return toDto(userRepository.save(user));
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password attuale non corretta");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setLegacyPasswordHash(null);
        user.setLegacyPasswordSalt(null);
        user.revokeTokens();
        userRepository.save(user);
    }

    /** Verifica telefono+email (come il vecchio flusso Firestore) e invia una email con il link di reset. */
    public void recoverPassword(RecoverPasswordRequest req) {
        userRepository.findByTelefonoAndEmailIgnoreCase(req.telefono(), req.email()).ifPresent(user -> {
            String token = jwtService.generatePasswordResetToken(user);
            String link = frontendBaseUrl + "/resetpassword?token=" + token;
            emailService.send(user.getEmail(), "Reimposta la tua password",
                    "Clicca sul link per reimpostare la password (valido 1 ora): " + link);
        });
        // risposta sempre generica (200) anche se non trovato, per non rivelare quali telefono/email esistono
    }

    @Transactional
    public void resetPasswordConfirm(ResetPasswordConfirmRequest req) {
        Claims claims;
        try {
            claims = jwtService.parse(req.token());
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link di reset non valido o scaduto");
        }
        if (!"pwreset".equals(claims.get("type", String.class))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link di reset non valido");
        }
        User user = userRepository.findLockedById(claims.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utente non trovato"));
        if (!jwtService.isCurrent(claims, user)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link di reset gia' utilizzato o revocato");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setLegacyPasswordHash(null);
        user.setLegacyPasswordSalt(null);
        user.revokeTokens();
        userRepository.save(user);
    }

    /** Restituisce l'email mascherata associata al telefono, senza scaricare l'intera tabella utenti lato client. */
    public String recoverEmailMasked(RecoverEmailRequest req) {
        User user = userRepository.findByTelefono(req.telefono())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nessun account trovato per questo numero"));
        return maskEmail(user.getEmail());
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "*".repeat(Math.max(1, local.length() - 2)) + domain;
    }

    private AuthResponse buildAuthResponse(User user) {
        String access = jwtService.generateAccessToken(user);
        String refresh = jwtService.generateRefreshToken(user);
        return new AuthResponse(access, refresh, toDto(user));
    }

    private UserDto toDto(User user) {
        Role role = user.getRole();
        return new UserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.getCognome(),
                user.getTelefono(), user.getCorsoLaurea(), user.getAnnoAccademico(),
                role.getName(), role.getPageAccess());
    }
}
