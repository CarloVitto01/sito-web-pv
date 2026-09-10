package it.pv.payments.repository;

import it.pv.payments.domain.PlasticaColor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlasticaColorRepository extends JpaRepository<PlasticaColor, Long> {
    List<PlasticaColor> findAllByOrderBySortOrderAsc();
}
