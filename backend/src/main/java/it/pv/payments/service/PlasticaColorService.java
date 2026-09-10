package it.pv.payments.service;

import it.pv.payments.domain.PlasticaColor;
import it.pv.payments.repository.PlasticaColorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PlasticaColorService {

    private final PlasticaColorRepository repository;

    public PlasticaColorService(PlasticaColorRepository repository) {
        this.repository = repository;
    }

    public List<PlasticaColor> listAll() { return repository.findAllByOrderBySortOrderAsc(); }

    public List<PlasticaColor> listEnabled() { return repository.findAllByOrderBySortOrderAsc().stream().filter(PlasticaColor::isEnabled).toList(); }

    public PlasticaColor upsert(PlasticaColor p) {
        if (p.getId() != null && !repository.existsById(p.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Colore non trovato");
        }
        return repository.save(p);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
