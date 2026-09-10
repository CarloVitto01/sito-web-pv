package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "plastica_colors")
public class PlasticaColor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String hex;
    private BigDecimal priceEuro;
    private boolean enabled = true;
    private Integer sortOrder = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getHex() { return hex; }
    public void setHex(String hex) { this.hex = hex; }
    public BigDecimal getPriceEuro() { return priceEuro; }
    public void setPriceEuro(BigDecimal priceEuro) { this.priceEuro = priceEuro; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
