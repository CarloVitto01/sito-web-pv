package it.pv.payments.security;

import it.pv.payments.domain.*;
import it.pv.payments.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {
    JwtService jwt = new JwtService("test-secret-with-at-least-32-bytes-long", 3600, 86400, new MockEnvironment());
    UserRepository users = mock(UserRepository.class);
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void roleChangesTakeEffectWithoutWaitingForTokenExpiry() throws Exception {
        User user = new User(); user.setId("user"); user.setEmail("user@example.test");
        Role admin = new Role(); admin.setName("Admin"); user.setRole(admin);
        String token = jwt.generateAccessToken(user);
        Role publicRole = new Role(); publicRole.setName("PublicUser"); user.setRole(publicRole);
        when(users.findById("user")).thenReturn(Optional.of(user));
        request(token);
        assertEquals("PublicUser", CurrentUser.get().ruolo());
    }
    @Test void deletedUsersAndRevokedTokensCannotAuthenticate() throws Exception {
        User user = new User(); user.setId("user"); Role role = new Role(); role.setName("Admin"); user.setRole(role);
        String token = jwt.generateAccessToken(user); user.revokeTokens();
        when(users.findById("user")).thenReturn(Optional.of(user));
        request(token); assertNull(CurrentUser.getOrNull());
        when(users.findById("user")).thenReturn(Optional.empty());
        request(token); assertNull(CurrentUser.getOrNull());
    }
    private void request(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer " + token);
        new JwtAuthFilter(jwt, users).doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }
}
