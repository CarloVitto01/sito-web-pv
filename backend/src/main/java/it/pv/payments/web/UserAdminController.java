package it.pv.payments.web;

import it.pv.payments.domain.User;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.service.UserAdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Gestione utenti (UtentiGestionale): non restituisce mai passwordHash al client. */
@RestController
@RequestMapping("/api/users")
public class UserAdminController {

    private final UserAdminService userAdminService;
    private final AccessGuard accessGuard;

    public UserAdminController(UserAdminService userAdminService, AccessGuard accessGuard) {
        this.userAdminService = userAdminService;
        this.accessGuard = accessGuard;
    }

    public record UserSummary(String id, String email, String displayName, String cognome, String telefono,
                               String corsoLaurea, String annoAccademico, String ruolo) {}

    public record ChangeRoleRequest(String ruolo) {}

    @GetMapping
    public List<UserSummary> list() {
        accessGuard.requirePage("utentiGestionale");
        return userAdminService.listAll().stream().map(this::toSummary).toList();
    }

    @PatchMapping("/{id}/role")
    public UserSummary changeRole(@PathVariable String id, @RequestBody ChangeRoleRequest req) {
        accessGuard.requirePage("utentiGestionale");
        return toSummary(userAdminService.changeRole(id, req.ruolo()));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        accessGuard.requirePage("utentiGestionale");
        userAdminService.delete(id);
    }

    private UserSummary toSummary(User u) {
        return new UserSummary(u.getId(), u.getEmail(), u.getDisplayName(), u.getCognome(), u.getTelefono(),
                u.getCorsoLaurea(), u.getAnnoAccademico(), u.getRole() != null ? u.getRole().getName() : null);
    }
}
