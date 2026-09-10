package it.pv.payments.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class User {
    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    // Popolati solo per gli utenti importati da Firebase, in attesa del primo login: servono per verificare
    // la password col vecchio algoritmo (scrypt specifico di Firebase) prima di convertirla in BCrypt.
    // Una volta convertita la password, questi due campi vengono azzerati.
    @Column(name = "legacy_password_hash")
    private String legacyPasswordHash;
    @Column(name = "legacy_password_salt")
    private String legacyPasswordSalt;

    private String displayName;
    private String cognome;
    private String telefono;
    private String corsoLaurea;
    private String annoAccademico;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    private Long tokenVersion = 0L;

    public long getTokenVersion() { return tokenVersion == null ? 0L : tokenVersion; }
    public void revokeTokens() { tokenVersion = getTokenVersion() + 1; }

    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getLegacyPasswordHash() { return legacyPasswordHash; }
    public void setLegacyPasswordHash(String legacyPasswordHash) { this.legacyPasswordHash = legacyPasswordHash; }
    public String getLegacyPasswordSalt() { return legacyPasswordSalt; }
    public void setLegacyPasswordSalt(String legacyPasswordSalt) { this.legacyPasswordSalt = legacyPasswordSalt; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getCognome() { return cognome; }
    public void setCognome(String cognome) { this.cognome = cognome; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getCorsoLaurea() { return corsoLaurea; }
    public void setCorsoLaurea(String corsoLaurea) { this.corsoLaurea = corsoLaurea; }
    public String getAnnoAccademico() { return annoAccademico; }
    public void setAnnoAccademico(String annoAccademico) { this.annoAccademico = annoAccademico; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
