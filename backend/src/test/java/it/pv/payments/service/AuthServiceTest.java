package it.pv.payments.service;

import it.pv.payments.domain.User;
import it.pv.payments.dto.AuthDtos.*;
import it.pv.payments.repository.*;
import it.pv.payments.security.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    UserRepository users = mock(UserRepository.class);
    JwtService jwt = new JwtService("test-secret-with-at-least-32-bytes-long", 3600, 86400, new MockEnvironment());
    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    AuthService service = new AuthService(users, mock(RoleRepository.class), encoder, jwt,
            mock(EmailService.class), mock(FirebaseLegacyPasswordVerifier.class), "http://localhost:3000");
    @Test void resetRemovesLegacyPasswordAndRevokesExistingTokens() {
        User user = new User(); user.setId("user"); user.setLegacyPasswordHash("old"); user.setLegacyPasswordSalt("salt");
        when(users.findLockedById("user")).thenReturn(Optional.of(user));
        String reset = jwt.generatePasswordResetToken(user);
        String refresh = jwt.generateRefreshToken(user);
        service.resetPasswordConfirm(new ResetPasswordConfirmRequest(reset, "NewPassword!"));
        assertNull(user.getLegacyPasswordHash()); assertNull(user.getLegacyPasswordSalt());
        assertTrue(encoder.matches("NewPassword!", user.getPasswordHash()));
        assertFalse(jwt.isCurrent(jwt.parse(refresh), user));
        assertThrows(ResponseStatusException.class, () -> service.resetPasswordConfirm(new ResetPasswordConfirmRequest(reset, "Different!")));
    }
    @Test void revokedRefreshCannotCreateNewSession() {
        User user = new User(); user.setId("user");
        String refresh = jwt.generateRefreshToken(user); user.revokeTokens();
        when(users.findById("user")).thenReturn(Optional.of(user));
        assertThrows(ResponseStatusException.class, () -> service.refresh(new RefreshRequest(refresh)));
    }
    @Test void rejectsWeakProductionSecret() {
        MockEnvironment env = new MockEnvironment(); env.setActiveProfiles("prod");
        assertThrows(IllegalStateException.class, () -> new JwtService("dev-only-local-secret-change-me", 1, 1, env));
    }
}
