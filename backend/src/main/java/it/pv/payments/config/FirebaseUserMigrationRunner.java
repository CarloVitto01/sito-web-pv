package it.pv.payments.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.pv.payments.domain.Role;
import it.pv.payments.domain.User;
import it.pv.payments.repository.RoleRepository;
import it.pv.payments.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Importa una tantum gli account esportati da Firebase (Auth + Firestore) in Postgres.
 * Si attiva SOLO con il profilo Spring "migrate-firebase-users" (vedi backend/migration/README.md):
 * di norma non gira mai, non serve rimuoverlo dopo l'uso.
 *
 * Le password NON vengono migrate (Firebase usa scrypt con parametri specifici del progetto, non
 * compatibili con il BCrypt usato qui): ad ogni utente importato viene assegnata una password casuale
 * e inutilizzabile, che dovra' reimpostare con "Password dimenticata" al primo accesso.
 */
@Component
@Profile("migrate-firebase-users")
public class FirebaseUserMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FirebaseUserMigrationRunner.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper mapper = new ObjectMapper();

    public FirebaseUserMigrationRunner(UserRepository userRepository, RoleRepository roleRepository,
                                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        File dir = new File("migration");
        File authFile = new File(dir, "auth-export.json");
        File firestoreUsersFile = new File(dir, "firestore-users.json");
        File firestoreRolesFile = new File(dir, "firestore-roles.json");

        log.info("=== Migrazione account Firebase: inizio ===");

        if (firestoreRolesFile.exists()) {
            importRoles(firestoreRolesFile);
        } else {
            log.warn("File {} non trovato: salto l'import dei ruoli personalizzati.", firestoreRolesFile.getPath());
        }

        if (!authFile.exists() || !firestoreUsersFile.exists()) {
            log.error("Servono entrambi i file {} e {} nella cartella backend/migration/ (vedi migration/README.md).",
                    authFile.getPath(), firestoreUsersFile.getPath());
            return;
        }

        JsonNode authRoot = mapper.readTree(authFile);
        JsonNode authUsers = authRoot.path("users");

        // uid -> email (e altri dati auth, se mai servissero) letti dall'export di Firebase Auth
        java.util.Map<String, JsonNode> authByUid = new java.util.HashMap<>();
        for (JsonNode u : authUsers) {
            authByUid.put(u.path("localId").asText(), u);
        }

        JsonNode firestoreUsers = mapper.readTree(firestoreUsersFile);

        int created = 0, skipped = 0, errors = 0;

        for (JsonNode doc : firestoreUsers) {
            String uid = doc.path("uid").asText(null);
            try {
                String email = textOrNull(doc, "email");
                if (email == null && authByUid.containsKey(uid)) {
                    email = textOrNull(authByUid.get(uid), "email");
                }
                if (email == null || email.isBlank()) {
                    log.warn("Utente {} senza email, saltato.", uid);
                    skipped++;
                    continue;
                }

                if (userRepository.existsByEmailIgnoreCase(email)) {
                    log.info("Utente {} gia' presente, saltato.", email);
                    skipped++;
                    continue;
                }

                String ruoloNome = textOrDefault(doc, "ruolo", "PublicUser");
                Role role = roleRepository.findByName(ruoloNome).orElseGet(() -> {
                    Role r = new Role();
                    r.setName(ruoloNome);
                    r.setPageAccess(Set.of());
                    return roleRepository.save(r);
                });

                User user = new User();
                if (uid != null && !uid.isBlank()) user.setId(uid); // mantiene lo stesso id di Firebase
                user.setEmail(email.trim().toLowerCase());
                user.setDisplayName(textOrNull(doc, "displayName"));
                user.setCognome(textOrNull(doc, "cognome"));
                user.setTelefono(textOrNull(doc, "telefono"));
                user.setCorsoLaurea(textOrNull(doc, "corsoLaurea"));
                user.setAnnoAccademico(textOrNull(doc, "annoAccademico"));
                user.setRole(role);

                // placeholder inutilizzabile finche' l'utente non fa il primo login: a quel punto AuthService
                // verifica la password col vecchio hash Firebase (sotto) e la converte subito in BCrypt.
                user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                JsonNode authUser = authByUid.get(uid);
                if (authUser != null) {
                    user.setLegacyPasswordHash(textOrNull(authUser, "passwordHash"));
                    user.setLegacyPasswordSalt(textOrNull(authUser, "salt"));
                }

                userRepository.save(user);
                created++;
            } catch (Exception e) {
                log.error("Errore importando l'utente {}: {}", uid, e.getMessage());
                errors++;
            }
        }

        log.info("=== Migrazione account Firebase completata: {} creati, {} saltati, {} errori ===",
                created, skipped, errors);
    }

    private void importRoles(File file) throws Exception {
        JsonNode roles = mapper.readTree(file);
        int count = 0;
        for (JsonNode r : roles) {
            String nome = textOrNull(r, "nome");
            if (nome == null || nome.isBlank()) continue;

            Set<String> pageAccess = new HashSet<>();
            for (JsonNode p : r.path("accessoPagine")) {
                pageAccess.add(p.asText());
            }

            Role role = roleRepository.findByName(nome).orElseGet(Role::new);
            role.setName(nome);
            role.setPageAccess(pageAccess);
            roleRepository.save(role);
            count++;
        }
        log.info("Importati/aggiornati {} ruoli da {}", count, file.getPath());
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    private String textOrDefault(JsonNode node, String field, String fallback) {
        String v = textOrNull(node, field);
        return (v == null || v.isBlank()) ? fallback : v;
    }
}
