package it.pv.payments.web;

import it.pv.payments.dto.AuthDtos.*;
import it.pv.payments.security.CurrentUser;
import it.pv.payments.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    @GetMapping("/me")
    public UserDto me() {
        return authService.me(CurrentUser.get().userId());
    }

    @PutMapping("/me")
    public UserDto updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        return authService.updateProfile(CurrentUser.get().userId(), req);
    }

    @PostMapping("/logout")
    public void logout() {
        authService.logout(CurrentUser.get().userId());
    }

    @PostMapping("/change-password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(CurrentUser.get().userId(), req);
    }

    @PostMapping("/recover-password")
    public void recoverPassword(@Valid @RequestBody RecoverPasswordRequest req) {
        authService.recoverPassword(req);
    }

    @PostMapping("/recover-email")
    public java.util.Map<String, String> recoverEmail(@Valid @RequestBody RecoverEmailRequest req) {
        return java.util.Map.of("maskedEmail", authService.recoverEmailMasked(req));
    }

    @PostMapping("/reset-password-confirm")
    public void resetPasswordConfirm(@Valid @RequestBody ResetPasswordConfirmRequest req) {
        authService.resetPasswordConfirm(req);
    }
}
