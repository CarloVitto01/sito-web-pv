package it.pv.payments.service;

import it.pv.payments.domain.Role;
import it.pv.payments.domain.User;
import it.pv.payments.repository.RoleRepository;
import it.pv.payments.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Gestione utenti lato admin (UtentiGestionale): elenco, cambio ruolo, eliminazione. */
@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserAdminService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public List<User> listAll() { return userRepository.findAll(); }

    @Transactional
    public User changeRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ruolo non trovato"));
        user.setRole(role);
        return userRepository.save(user);
    }

    @Transactional
    public void delete(String userId) {
        userRepository.deleteById(userId);
    }
}
