package it.pv.payments.repository;

import it.pv.payments.domain.DeliveryConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryConfigRepository extends JpaRepository<DeliveryConfig, Long> {
}
