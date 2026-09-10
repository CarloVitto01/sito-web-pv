package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Riga singleton (id sempre 1) con i costi di vendita/interni per la stampa A4. */
@Entity
@Table(name = "config_a4")
public class ConfigA4 {
    @Id
    private Long id = 1L;

    private BigDecimal foglio;
    private BigDecimal biancoNero;
    private BigDecimal colore;
    private BigDecimal anelli;
    private BigDecimal fascetta;
    private BigDecimal ciappatura;
    private BigDecimal spirale;

    /** JSON di InterniA4Dto (costi reali/interni usati per il calcolo margine). */
    @Lob
    private String interniJson;

    /** JSON di List<CostExtraDto>. */
    @Lob
    private String costiAcquistoJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getFoglio() { return foglio; }
    public void setFoglio(BigDecimal foglio) { this.foglio = foglio; }
    public BigDecimal getBiancoNero() { return biancoNero; }
    public void setBiancoNero(BigDecimal biancoNero) { this.biancoNero = biancoNero; }
    public BigDecimal getColore() { return colore; }
    public void setColore(BigDecimal colore) { this.colore = colore; }
    public BigDecimal getAnelli() { return anelli; }
    public void setAnelli(BigDecimal anelli) { this.anelli = anelli; }
    public BigDecimal getFascetta() { return fascetta; }
    public void setFascetta(BigDecimal fascetta) { this.fascetta = fascetta; }
    public BigDecimal getCiappatura() { return ciappatura; }
    public void setCiappatura(BigDecimal ciappatura) { this.ciappatura = ciappatura; }
    public BigDecimal getSpirale() { return spirale; }
    public void setSpirale(BigDecimal spirale) { this.spirale = spirale; }
    public String getInterniJson() { return interniJson; }
    public void setInterniJson(String interniJson) { this.interniJson = interniJson; }
    public String getCostiAcquistoJson() { return costiAcquistoJson; }
    public void setCostiAcquistoJson(String costiAcquistoJson) { this.costiAcquistoJson = costiAcquistoJson; }
}
