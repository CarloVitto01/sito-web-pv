package it.pv.payments.repository;

import it.pv.payments.domain.PromoConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromoConfigRepository extends JpaRepository<PromoConfig, Long> {
}
