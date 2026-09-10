package it.pv.payments.repository;

import it.pv.payments.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> findLockedById(@org.springframework.data.repository.query.Param("id") String id);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByTelefonoAndEmailIgnoreCase(String telefono, String email);
    Optional<User> findByTelefono(String telefono);
    boolean existsByEmailIgnoreCase(String email);
}
