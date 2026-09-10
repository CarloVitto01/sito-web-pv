package it.pv.payments.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Riga singleton (id sempre 1): IVA, trasporto, fee PayPal. */
@Entity
@Table(name = "config_fees")
public class FeesConfig {
    @Id
    private Long id = 1L;

    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.DecimalMin("0")
    @jakarta.validation.constraints.DecimalMax("1")
    private BigDecimal ivaRate;
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.DecimalMin("0")
    private BigDecimal transportFeeEuro;
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.DecimalMin("0")
    @jakarta.validation.constraints.DecimalMax("1")
    private BigDecimal paypalPercent;
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.DecimalMin("0")
    private BigDecimal paypalFixed;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getIvaRate() { return ivaRate; }
    public void setIvaRate(BigDecimal ivaRate) { this.ivaRate = ivaRate; }
    public BigDecimal getTransportFeeEuro() { return transportFeeEuro; }
    public void setTransportFeeEuro(BigDecimal transportFeeEuro) { this.transportFeeEuro = transportFeeEuro; }
    public BigDecimal getPaypalPercent() { return paypalPercent; }
    public void setPaypalPercent(BigDecimal paypalPercent) { this.paypalPercent = paypalPercent; }
    public BigDecimal getPaypalFixed() { return paypalFixed; }
    public void setPaypalFixed(BigDecimal paypalFixed) { this.paypalFixed = paypalFixed; }
}
