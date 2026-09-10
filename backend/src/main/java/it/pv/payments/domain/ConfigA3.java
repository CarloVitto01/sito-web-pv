package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Riga singleton (id sempre 1) con i costi di vendita/interni per la stampa A3. */
@Entity
@Table(name = "config_a3")
public class ConfigA3 {
    @Id
    private Long id = 1L;

    private BigDecimal grammaturaNormale;
    private BigDecimal grammaturaCartoncino;
    private BigDecimal biancoNero;
    private BigDecimal colore;
    private BigDecimal plastificazione;

    @Lob
    private String interniJson;

    @Lob
    private String costiAcquistoJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getGrammaturaNormale() { return grammaturaNormale; }
    public void setGrammaturaNormale(BigDecimal grammaturaNormale) { this.grammaturaNormale = grammaturaNormale; }
    public BigDecimal getGrammaturaCartoncino() { return grammaturaCartoncino; }
    public void setGrammaturaCartoncino(BigDecimal grammaturaCartoncino) { this.grammaturaCartoncino = grammaturaCartoncino; }
    public BigDecimal getBiancoNero() { return biancoNero; }
    public void setBiancoNero(BigDecimal biancoNero) { this.biancoNero = biancoNero; }
    public BigDecimal getColore() { return colore; }
    public void setColore(BigDecimal colore) { this.colore = colore; }
    public BigDecimal getPlastificazione() { return plastificazione; }
    public void setPlastificazione(BigDecimal plastificazione) { this.plastificazione = plastificazione; }
    public String getInterniJson() { return interniJson; }
    public void setInterniJson(String interniJson) { this.interniJson = interniJson; }
    public String getCostiAcquistoJson() { return costiAcquistoJson; }
    public void setCostiAcquistoJson(String costiAcquistoJson) { this.costiAcquistoJson = costiAcquistoJson; }
}
