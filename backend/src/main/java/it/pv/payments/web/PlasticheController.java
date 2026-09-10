package it.pv.payments.web;

import it.pv.payments.domain.PlasticaColor;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.service.PlasticaColorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/plastiche")
public class PlasticheController {

    private final PlasticaColorService plasticaColorService;
    private final AccessGuard accessGuard;

    public PlasticheController(PlasticaColorService plasticaColorService, AccessGuard accessGuard) {
        this.plasticaColorService = plasticaColorService;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    public List<PlasticaColor> list() {
        accessGuard.requirePage("plastiche");
        return plasticaColorService.listAll();
    }

    @PostMapping
    public PlasticaColor upsert(@RequestBody PlasticaColor payload) {
        accessGuard.requirePage("plastiche");
        return plasticaColorService.upsert(payload);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        accessGuard.requirePage("plastiche");
        plasticaColorService.delete(id);
    }
}
