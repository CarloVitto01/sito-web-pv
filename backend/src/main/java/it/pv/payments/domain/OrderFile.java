package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_files")
public class OrderFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private Integer fileIndex;
    private String originalFileName;

    @Column(nullable = false)
    private String storagePath;

    private Integer pages;

    // rilegatura per-file (solo A4, quando rilegaturaUnica = NO): se unica, rispecchia l'ordine
    private String rilegatura;

    // plastica per-file (solo A4, quando rilegaturaUnica = NO)
    private Long plasticaId;
    private String plasticaName;
    private String plasticaHex;
    private BigDecimal plasticaExtraEuro;

    // impostazioni di stampa per-file (solo A4): se rilegatura unica, rispecchiano l'ordine; se
    // separata, sono la scelta specifica di questo file
    private String inchiostro;
    private String pagina;
    private String layout;
    private String pagineLabel; // "Tutte" oppure "da-a"
    private Integer numeroCopie;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Integer getFileIndex() { return fileIndex; }
    public void setFileIndex(Integer fileIndex) { this.fileIndex = fileIndex; }
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }
    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    public Integer getPages() { return pages; }
    public void setPages(Integer pages) { this.pages = pages; }
    public String getRilegatura() { return rilegatura; }
    public void setRilegatura(String rilegatura) { this.rilegatura = rilegatura; }
    public Long getPlasticaId() { return plasticaId; }
    public void setPlasticaId(Long plasticaId) { this.plasticaId = plasticaId; }
    public String getPlasticaName() { return plasticaName; }
    public void setPlasticaName(String plasticaName) { this.plasticaName = plasticaName; }
    public String getPlasticaHex() { return plasticaHex; }
    public void setPlasticaHex(String plasticaHex) { this.plasticaHex = plasticaHex; }
    public BigDecimal getPlasticaExtraEuro() { return plasticaExtraEuro; }
    public void setPlasticaExtraEuro(BigDecimal plasticaExtraEuro) { this.plasticaExtraEuro = plasticaExtraEuro; }
    public String getInchiostro() { return inchiostro; }
    public void setInchiostro(String inchiostro) { this.inchiostro = inchiostro; }
    public String getPagina() { return pagina; }
    public void setPagina(String pagina) { this.pagina = pagina; }
    public String getLayout() { return layout; }
    public void setLayout(String layout) { this.layout = layout; }
    public String getPagineLabel() { return pagineLabel; }
    public void setPagineLabel(String pagineLabel) { this.pagineLabel = pagineLabel; }
    public Integer getNumeroCopie() { return numeroCopie; }
    public void setNumeroCopie(Integer numeroCopie) { this.numeroCopie = numeroCopie; }
}
