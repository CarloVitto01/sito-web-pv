package it.pv.payments.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public class AuthDtos {

    public record RegisterRequest(
            @Email @NotBlank @Size(max = 254) String email,
            @Size(min = 6, max = 72) @NotBlank String password,
            @Size(max = 200) String displayName,
            @Size(max = 200) String cognome,
            @Size(max = 200) String telefono,
            @Size(max = 200) String corsoLaurea,
            @Size(max = 200) String annoAccademico
    ) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UserDto(
            String id, String email, String displayName, String cognome, String telefono,
            @Size(max = 200) String corsoLaurea, String annoAccademico, String ruolo, Set<String> pageAccess
    ) {}

    public record AuthResponse(String accessToken, String refreshToken, UserDto user) {}

    public record UpdateProfileRequest(
            @Size(max = 200) String displayName, String cognome, String telefono, String corsoLaurea, String annoAccademico
    ) {}

    public record RecoverPasswordRequest(@NotBlank String telefono, @Email @NotBlank @Size(max = 254) String email) {}

    public record RecoverEmailRequest(@NotBlank String telefono) {}

    public record ResetPasswordConfirmRequest(@NotBlank String token, @Size(min = 6, max = 72) @NotBlank String newPassword) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword, @Size(min = 6, max = 72) @NotBlank String newPassword) {}
}
