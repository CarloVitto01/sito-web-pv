package it.pv.payments.config;

import it.pv.payments.domain.PlasticaColor;
import it.pv.payments.domain.Role;
import it.pv.payments.domain.User;
import it.pv.payments.repository.PlasticaColorRepository;
import it.pv.payments.repository.RoleRepository;
import it.pv.payments.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Popola ruoli, permessi di default e un utente admin di comodo al primo avvio in locale, cosi' l'app e'
 * subito testabile senza dover inserire dati a mano in un DB vuoto.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private static final Set<String> ALL_PAGES = Set.of(
            "gestionaleA4", "gestionaleA3", "utentiGestionale", "storicoDati", "gestione-accessi",
            "qr-generator", "tasse", "plastiche", "banner", "consegna", "sconti"
    );

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PlasticaColorRepository plasticaColorRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public DataSeeder(RoleRepository roleRepository, UserRepository userRepository,
                       PlasticaColorRepository plasticaColorRepository, PasswordEncoder passwordEncoder,
                       Environment environment) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.plasticaColorRepository = plasticaColorRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        roleRepository.findByName("PublicUser").orElseGet(() -> {
            Role r = new Role();
            r.setName("PublicUser");
            r.setPageAccess(Set.of());
            return roleRepository.save(r);
        });

        Role adminRole = roleRepository.findByName("Admin").orElseGet(() -> {
            Role r = new Role();
            r.setName("Admin");
            r.setPageAccess(ALL_PAGES);
            return roleRepository.save(r);
        });

        if (plasticaColorRepository.count() == 0) {
            seedDefaultPlastiche();
        }

        seedLocalAdminUser(adminRole);
    }

    private void seedDefaultPlastiche() {
        record Seed(String name, String hex, String price) {}
        var defaults = new Seed[]{
                new Seed("Trasparente", "#FFFFFF", "0.00"),
                new Seed("Nera", "#000000", "0.50"),
                new Seed("Blu", "#1E3A8A", "0.50"),
                new Seed("Rossa", "#B91C1C", "0.50"),
        };
        int order = 0;
        for (var s : defaults) {
            PlasticaColor p = new PlasticaColor();
            p.setName(s.name());
            p.setHex(s.hex());
            p.setPriceEuro(new BigDecimal(s.price()));
            p.setEnabled(true);
            p.setSortOrder(order++);
            plasticaColorRepository.save(p);
        }
    }

    private void seedLocalAdminUser(Role adminRole) {
        if (!environment.acceptsProfiles(org.springframework.core.env.Profiles.of("local"))) return;
        if (userRepository.existsByEmailIgnoreCase("admin@local.test")) return;
        User admin = new User();
        admin.setEmail("admin@local.test");
        admin.setPasswordHash(passwordEncoder.encode("Admin123!"));
        admin.setDisplayName("Admin");
        admin.setCognome("Locale");
        admin.setRole(adminRole);
        userRepository.save(admin);
        log.info("==============================================================");
        log.info(" Utente admin di test creato per l'ambiente locale:");
        log.info("   email:    admin@local.test");
        log.info("   password: Admin123!");
        log.info(" Cambia queste credenziali prima di andare in produzione.");
        log.info("==============================================================");
    }
}
