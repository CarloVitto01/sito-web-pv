package it.pv.payments.security;

import it.pv.payments.repository.RoleRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Verifica lato server che il ruolo dell'utente autenticato abbia accesso ad una pagina/funzionalita' del
 * gestionale, replicando la logica di src/utils/checkAccess.ts ma in modo non aggirabile dal client.
 */
@Component
public class AccessGuard {

    private final RoleRepository roleRepository;

    public AccessGuard(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public void requirePage(String pageSlug) {
        AuthenticatedUser user = CurrentUser.get();
        if (!hasPageAccess(user, pageSlug)) {
            throw new AccessDeniedException("Accesso negato a " + pageSlug);
        }
    }

    /** Variante che non lancia eccezioni: utile per controlli "o l'uno o l'altro" (es. proprietario oppure admin). */
    public boolean hasPageAccess(AuthenticatedUser user, String pageSlug) {
        return roleRepository.findByName(user.ruolo())
                .map(role -> role.getPageAccess().contains(pageSlug))
                .orElse(false);
    }
}
