package it.pv.payments.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** Riga singleton (id sempre 1): promozioni attive (generale + studenti). */
@Entity
@Table(name = "config_promo")
public class PromoConfig {
    @Id
    private Long id = 1L;

    /** JSON di GeneralPromoDto */
    @Lob
    private String generalPromoJson;

    /** JSON di StudentPromoDto */
    @Lob
    private String studentPromoJson;

    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getGeneralPromoJson() { return generalPromoJson; }
    public void setGeneralPromoJson(String generalPromoJson) { this.generalPromoJson = generalPromoJson; }
    public String getStudentPromoJson() { return studentPromoJson; }
    public void setStudentPromoJson(String studentPromoJson) { this.studentPromoJson = studentPromoJson; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
