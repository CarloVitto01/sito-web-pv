package it.pv.payments.service;

import it.pv.payments.domain.Role;
import it.pv.payments.repository.RoleRepository;
import it.pv.payments.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

/** Gestione ruoli e relativi permessi di accesso alle pagine, equivalente della collection ruoliPagineAccesso. */
@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public RoleService(RoleRepository roleRepository, UserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
    }

    public List<Role> listAll() { return roleRepository.findAll(); }

    @Transactional
    public Role upsert(String name, Set<String> pageAccess) {
        Role role = roleRepository.findByName(name).orElseGet(() -> {
            Role r = new Role();
            r.setName(name);
            return r;
        });
        role.setPageAccess(pageAccess);
        return roleRepository.save(role);
    }

    @Transactional
    public void delete(String name) {
        Role role = roleRepository.findByName(name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ruolo non trovato"));
        if (!userRepository.findAll().stream().filter(u -> u.getRole() != null && u.getRole().getId().equals(role.getId())).toList().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ruolo assegnato ad almeno un utente: non puo' essere eliminato");
        }
        roleRepository.delete(role);
    }
}
