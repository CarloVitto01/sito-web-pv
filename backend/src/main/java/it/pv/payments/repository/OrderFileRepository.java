package it.pv.payments.repository;

import it.pv.payments.domain.OrderFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderFileRepository extends JpaRepository<OrderFile, Long> {
    boolean existsByStoragePath(String storagePath);
}
