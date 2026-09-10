package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** "A4" oppure "A3" */
    @Column(nullable = false)
    private String tipo;

    // --- dati cliente (snapshot al momento dell'ordine) ---
    private String nome;
    private String cognome;
    private String email;
    private String telefono;
    private String corsoLaurea;
    private String annoAccademico;

    // --- configurazione stampa comune ---
    private Integer numeroPDF;
    private Integer numeroCopie;
    private String pagine; // label intervallo pagine ("Tutte" o "da-a")
    private String colore;
    private String pagina; // fronte / fronte-retro
    private String inchiostro;
    private Integer nFogli;
    private Integer nFogliPerCopia;
    private Integer fascicoli;

    // --- specifico A4 ---
    private String layout;
    private String rilegatura;
    private String rilegaturaUnica;
    private Long plasticaId;
    private String plasticaName;
    private String plasticaHex;
    private BigDecimal plasticaExtraEuro;
    private BigDecimal plasticaExtraPerCopia;
    private BigDecimal plasticaExtraTotale;

    // --- specifico A3 ---
    private String grammatura;
    private String plastificazione;

    // --- consegna ---
    private String deliveryDayLabel;
    private String deliveryTimeRange;
    private String deliveryDateISO;
    private Integer deliveryWeekday;
    private Boolean isStudentDelivery;

    // --- pagamento / pricing ---
    private String metodoPagamento;
    private String statoPagamento;
    @Column(unique = true)
    private String requestId;
    @Column(unique = true)
    private String paypalOrderId;
    @Column(unique = true)
    private String paypalCaptureId;
    public String getRequestId() { return requestId; }
    public void setRequestId(String value) { requestId = value; }
    public String getPaypalOrderId() { return paypalOrderId; }
    public void setPaypalOrderId(String value) { paypalOrderId = value; }
    public String getPaypalCaptureId() { return paypalCaptureId; }
    public void setPaypalCaptureId(String value) { paypalCaptureId = value; }

    private BigDecimal prezzoLordo;
    private BigDecimal scontoGenerale;
    private BigDecimal scontoStudenti;
    private BigDecimal imponibile;
    private BigDecimal iva;
    private BigDecimal trasporto;
    private BigDecimal paypalFee;
    private BigDecimal totaleFinale;
    private BigDecimal costiInterni;

    @Lob
    private String pricingSnapshotJson;

    private boolean frozen;
    private Instant frozenAt;

    private BigDecimal manualAdjustmentDelta;
    private String manualAdjustmentReason;
    private Instant manualAdjustmentUpdatedAt;

    private Instant timestamp;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderFile> files = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (timestamp == null) timestamp = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCognome() { return cognome; }
    public void setCognome(String cognome) { this.cognome = cognome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getCorsoLaurea() { return corsoLaurea; }
    public void setCorsoLaurea(String corsoLaurea) { this.corsoLaurea = corsoLaurea; }
    public String getAnnoAccademico() { return annoAccademico; }
    public void setAnnoAccademico(String annoAccademico) { this.annoAccademico = annoAccademico; }
    public Integer getNumeroPDF() { return numeroPDF; }
    public void setNumeroPDF(Integer numeroPDF) { this.numeroPDF = numeroPDF; }
    public Integer getNumeroCopie() { return numeroCopie; }
    public void setNumeroCopie(Integer numeroCopie) { this.numeroCopie = numeroCopie; }
    public String getPagine() { return pagine; }
    public void setPagine(String pagine) { this.pagine = pagine; }
    public String getColore() { return colore; }
    public void setColore(String colore) { this.colore = colore; }
    public String getPagina() { return pagina; }
    public void setPagina(String pagina) { this.pagina = pagina; }
    public String getInchiostro() { return inchiostro; }
    public void setInchiostro(String inchiostro) { this.inchiostro = inchiostro; }
    public Integer getNFogli() { return nFogli; }
    public void setNFogli(Integer nFogli) { this.nFogli = nFogli; }
    public Integer getNFogliPerCopia() { return nFogliPerCopia; }
    public void setNFogliPerCopia(Integer nFogliPerCopia) { this.nFogliPerCopia = nFogliPerCopia; }
    public Integer getFascicoli() { return fascicoli; }
    public void setFascicoli(Integer fascicoli) { this.fascicoli = fascicoli; }
    public String getLayout() { return layout; }
    public void setLayout(String layout) { this.layout = layout; }
    public String getRilegatura() { return rilegatura; }
    public void setRilegatura(String rilegatura) { this.rilegatura = rilegatura; }
    public String getRilegaturaUnica() { return rilegaturaUnica; }
    public void setRilegaturaUnica(String rilegaturaUnica) { this.rilegaturaUnica = rilegaturaUnica; }
    public Long getPlasticaId() { return plasticaId; }
    public void setPlasticaId(Long plasticaId) { this.plasticaId = plasticaId; }
    public String getPlasticaName() { return plasticaName; }
    public void setPlasticaName(String plasticaName) { this.plasticaName = plasticaName; }
    public String getPlasticaHex() { return plasticaHex; }
    public void setPlasticaHex(String plasticaHex) { this.plasticaHex = plasticaHex; }
    public BigDecimal getPlasticaExtraEuro() { return plasticaExtraEuro; }
    public void setPlasticaExtraEuro(BigDecimal plasticaExtraEuro) { this.plasticaExtraEuro = plasticaExtraEuro; }
    public BigDecimal getPlasticaExtraPerCopia() { return plasticaExtraPerCopia; }
    public void setPlasticaExtraPerCopia(BigDecimal plasticaExtraPerCopia) { this.plasticaExtraPerCopia = plasticaExtraPerCopia; }
    public BigDecimal getPlasticaExtraTotale() { return plasticaExtraTotale; }
    public void setPlasticaExtraTotale(BigDecimal plasticaExtraTotale) { this.plasticaExtraTotale = plasticaExtraTotale; }
    public String getGrammatura() { return grammatura; }
    public void setGrammatura(String grammatura) { this.grammatura = grammatura; }
    public String getPlastificazione() { return plastificazione; }
    public void setPlastificazione(String plastificazione) { this.plastificazione = plastificazione; }
    public String getDeliveryDayLabel() { return deliveryDayLabel; }
    public void setDeliveryDayLabel(String deliveryDayLabel) { this.deliveryDayLabel = deliveryDayLabel; }
    public String getDeliveryTimeRange() { return deliveryTimeRange; }
    public void setDeliveryTimeRange(String deliveryTimeRange) { this.deliveryTimeRange = deliveryTimeRange; }
    public String getDeliveryDateISO() { return deliveryDateISO; }
    public void setDeliveryDateISO(String deliveryDateISO) { this.deliveryDateISO = deliveryDateISO; }
    public Integer getDeliveryWeekday() { return deliveryWeekday; }
    public void setDeliveryWeekday(Integer deliveryWeekday) { this.deliveryWeekday = deliveryWeekday; }
    public Boolean getIsStudentDelivery() { return isStudentDelivery; }
    public void setIsStudentDelivery(Boolean isStudentDelivery) { this.isStudentDelivery = isStudentDelivery; }
    public String getMetodoPagamento() { return metodoPagamento; }
    public void setMetodoPagamento(String metodoPagamento) { this.metodoPagamento = metodoPagamento; }
    public String getStatoPagamento() { return statoPagamento; }
    public void setStatoPagamento(String statoPagamento) { this.statoPagamento = statoPagamento; }
    public BigDecimal getPrezzoLordo() { return prezzoLordo; }
    public void setPrezzoLordo(BigDecimal prezzoLordo) { this.prezzoLordo = prezzoLordo; }
    public BigDecimal getScontoGenerale() { return scontoGenerale; }
    public void setScontoGenerale(BigDecimal scontoGenerale) { this.scontoGenerale = scontoGenerale; }
    public BigDecimal getScontoStudenti() { return scontoStudenti; }
    public void setScontoStudenti(BigDecimal scontoStudenti) { this.scontoStudenti = scontoStudenti; }
    public BigDecimal getImponibile() { return imponibile; }
    public void setImponibile(BigDecimal imponibile) { this.imponibile = imponibile; }
    public BigDecimal getIva() { return iva; }
    public void setIva(BigDecimal iva) { this.iva = iva; }
    public BigDecimal getTrasporto() { return trasporto; }
    public void setTrasporto(BigDecimal trasporto) { this.trasporto = trasporto; }
    public BigDecimal getPaypalFee() { return paypalFee; }
    public void setPaypalFee(BigDecimal paypalFee) { this.paypalFee = paypalFee; }
    public BigDecimal getTotaleFinale() { return totaleFinale; }
    public void setTotaleFinale(BigDecimal totaleFinale) { this.totaleFinale = totaleFinale; }
    public BigDecimal getCostiInterni() { return costiInterni; }
    public void setCostiInterni(BigDecimal costiInterni) { this.costiInterni = costiInterni; }
    public String getPricingSnapshotJson() { return pricingSnapshotJson; }
    public void setPricingSnapshotJson(String pricingSnapshotJson) { this.pricingSnapshotJson = pricingSnapshotJson; }
    public boolean isFrozen() { return frozen; }
    public void setFrozen(boolean frozen) { this.frozen = frozen; }
    public Instant getFrozenAt() { return frozenAt; }
    public void setFrozenAt(Instant frozenAt) { this.frozenAt = frozenAt; }
    public BigDecimal getManualAdjustmentDelta() { return manualAdjustmentDelta; }
    public void setManualAdjustmentDelta(BigDecimal manualAdjustmentDelta) { this.manualAdjustmentDelta = manualAdjustmentDelta; }
    public String getManualAdjustmentReason() { return manualAdjustmentReason; }
    public void setManualAdjustmentReason(String manualAdjustmentReason) { this.manualAdjustmentReason = manualAdjustmentReason; }
    public Instant getManualAdjustmentUpdatedAt() { return manualAdjustmentUpdatedAt; }
    public void setManualAdjustmentUpdatedAt(Instant manualAdjustmentUpdatedAt) { this.manualAdjustmentUpdatedAt = manualAdjustmentUpdatedAt; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public List<OrderFile> getFiles() { return files; }
    public void setFiles(List<OrderFile> files) { this.files = files; }
}
