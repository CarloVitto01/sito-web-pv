package it.pv.payments.web;

import it.pv.payments.domain.Role;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.service.RoleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;
    private final AccessGuard accessGuard;

    public RoleController(RoleService roleService, AccessGuard accessGuard) {
        this.roleService = roleService;
        this.accessGuard = accessGuard;
    }

    public record UpsertRoleRequest(Set<String> pageAccess) {}

    @GetMapping
    public List<Role> list() {
        accessGuard.requirePage("gestione-accessi");
        return roleService.listAll();
    }

    @PutMapping("/{name}")
    public Role upsert(@PathVariable String name, @RequestBody UpsertRoleRequest req) {
        accessGuard.requirePage("gestione-accessi");
        return roleService.upsert(name, req.pageAccess());
    }

    @DeleteMapping("/{name}")
    public void delete(@PathVariable String name) {
        accessGuard.requirePage("gestione-accessi");
        roleService.delete(name);
    }
}
