package it.pv.payments.repository;

import it.pv.payments.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {
    java.util.Optional<Order> findByRequestId(String requestId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select o from Order o where o.id = :id")
    java.util.Optional<Order> findLockedById(@org.springframework.data.repository.query.Param("id") String id);

    List<Order> findByTipoOrderByTimestampDesc(String tipo);
    List<Order> findByUser_IdOrderByTimestampDesc(String userId);
}
