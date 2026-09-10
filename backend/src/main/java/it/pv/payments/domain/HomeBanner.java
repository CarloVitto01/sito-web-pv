package it.pv.payments.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** Riga singleton (id sempre 1): banner mostrato in home. */
@Entity
@Table(name = "config_banner")
public class HomeBanner {
    @Id
    private Long id = 1L;

    private boolean enabled;

    @Lob
    private String text;

    /** "info" | "warning" | "success" | "error" | "christmas" */
    private String variant;

    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
