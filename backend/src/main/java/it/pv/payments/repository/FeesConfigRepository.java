package it.pv.payments.repository;

import it.pv.payments.domain.FeesConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeesConfigRepository extends JpaRepository<FeesConfig, Long> {
}
