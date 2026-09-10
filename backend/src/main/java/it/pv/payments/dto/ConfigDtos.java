package it.pv.payments.dto;

import java.math.BigDecimal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** DTO usati per (de)serializzare i campi JSON delle config singleton. Non sono entita' JPA. */
public class ConfigDtos {

    public record InterniA4(@NotNull @DecimalMin("0") BigDecimal foglio, @NotNull @DecimalMin("0") BigDecimal biancoNero, @NotNull @DecimalMin("0") BigDecimal colore,
                             @NotNull @DecimalMin("0") BigDecimal anelli, @NotNull @DecimalMin("0") BigDecimal fascetta, @NotNull @DecimalMin("0") BigDecimal ciappatura, @NotNull @DecimalMin("0") BigDecimal spirale) {}

    public record InterniA3(@NotNull @DecimalMin("0") BigDecimal foglio, @NotNull @DecimalMin("0") BigDecimal biancoNero, @NotNull @DecimalMin("0") BigDecimal colore, @NotNull @DecimalMin("0") BigDecimal plastificazione) {}

    /** unita: per_foglio | per_ordine | percentuale | per_fascicolo */
    public record CostExtra(String id, String nome, String unita, @NotNull @DecimalMin("0") BigDecimal costo,
                             String note, boolean attivo, String campo, String match) {}

    public record TimeRange(String start, String end) {}

    public record DateRange(String from, String to) {}

    public record BasePromo(boolean enabled, String name, String description, @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percent,
                             Integer minPdf, String startsAt, String endsAt) {}

    public record StudentPromo(boolean enabled, String name, String description, @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percent,
                                Integer minPdf, String startsAt, String endsAt,
                                String targetCourse, Integer targetEnrollmentYear) {}

    public record A4CostsPayload(@NotNull @DecimalMin("0") BigDecimal foglio, @NotNull @DecimalMin("0") BigDecimal biancoNero, @NotNull @DecimalMin("0") BigDecimal colore, @NotNull @DecimalMin("0") BigDecimal anelli,
                                  @NotNull @DecimalMin("0") BigDecimal fascetta, @NotNull @DecimalMin("0") BigDecimal ciappatura, @NotNull @DecimalMin("0") BigDecimal spirale,
                                  @Valid InterniA4 interni, List<@Valid CostExtra> costiAcquisto) {}

    public record A3CostsPayload(@NotNull @DecimalMin("0") BigDecimal grammaturaNormale, @NotNull @DecimalMin("0") BigDecimal grammaturaCartoncino, @NotNull @DecimalMin("0") BigDecimal biancoNero,
                                  @NotNull @DecimalMin("0") BigDecimal colore, @NotNull @DecimalMin("0") BigDecimal plastificazione,
                                  @Valid InterniA3 interni, List<@Valid CostExtra> costiAcquisto) {}

    public record DeliveryPayload(List<Integer> weekdays, List<TimeRange> timeRanges, Integer slotsAhead,
                                   String timezone, Integer minLeadDays, List<String> blacklistDates,
                                   List<DateRange> blacklistRanges) {}

    public record PromoPayload(@NotNull @Valid BasePromo generalPromo, @NotNull @Valid StudentPromo studentPromo) {}
}
