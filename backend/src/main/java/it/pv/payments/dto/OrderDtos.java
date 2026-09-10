package it.pv.payments.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class OrderDtos {

    /**
     * I campi inchiostro/pagina/layout/rangeAll/rangeFrom/rangeTo/numeroCopie sono usati SOLO quando la
     * rilegatura e' separata (2+ file, rilegaturaUnica=NO): in quel caso ogni file e' un fascicolo a se'
     * stante con le proprie impostazioni di stampa. Con rilegatura unica restano null: il server ricade sui
     * valori top-level di {@link CreateOrderRequest}, identici per tutto l'ordine come prima.
     */
    public record FileInput(@NotBlank String storagePath, @NotBlank @Size(max = 200) String originalFileName, Integer pages, Long plasticaId,
                             String rilegatura, String inchiostro, String pagina, String layout,
                             Boolean rangeAll, Integer rangeFrom, Integer rangeTo, @Min(1) @Max(10000) Integer numeroCopie) {}

    public record DeliveryInput(String dayLabel, String timeRange, String dateISO, Integer weekday) {}

    /**
     * Richiesta di creazione ordine. Il prezzo NON viene mai accettato dal client: viene ricalcolato
     * server-side, cosi' come il numero di pagine reali (letto dai PDF caricati) e l'intervallo di stampa
     * selezionato (rangeFrom/rangeTo/rangeAll), per non fidarsi di valori che il client potrebbe alterare.
     */
    public record CreateOrderRequest(
            @NotBlank @Pattern(regexp = "A4|A3") String tipo, // "A4" | "A3"
            @NotEmpty @Size(max = 50) List<@NotNull @Valid FileInput> files,
            @NotNull @Min(1) @Max(50) Integer numeroPDF,
            @NotNull @Min(1) @Max(10000) Integer numeroCopie,
            boolean rangeAll,
            Integer rangeFrom,
            Integer rangeTo,
            String colore,
            String pagina,
            String inchiostro,
            String layout,
            String rilegatura,
            String rilegaturaUnica,
            Long plasticaId, // rilegatura unica: plastica dell'intero ordine. Rilegatura separata: vedi files[].plasticaId
            String grammatura,
            String plastificazione,
            Boolean isStudent,
            DeliveryInput delivery,
            @NotBlank @Pattern(regexp = "PAYPAL|CASH") String metodoPagamento, // "PAYPAL" | "CASH"
            String paypalCaptureId,
            @NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String requestId
    ) {}

    public record PricingBreakdown(
            BigDecimal baseLordo, BigDecimal scontoGenerale, BigDecimal scontoStudenti,
            BigDecimal imponibile, BigDecimal iva, BigDecimal trasporto, BigDecimal paypalFee,
            BigDecimal totaleFinale
    ) {}

    public record OrderFileDto(Long id, Integer fileIndex, String originalFileName, Integer pages,
                                String downloadUrl, Long plasticaId, String plasticaName,
                                String rilegatura, String inchiostro, String pagina, String layout,
                                String pagineLabel, Integer numeroCopie) {}

    public record OrderResponse(
            String id, String tipo, String nome, String cognome, String email, String telefono,
            Integer numeroPDF, Integer numeroCopie, String pagine, String colore, String pagina,
            String inchiostro, String layout, String rilegatura, String rilegaturaUnica,
            String grammatura, String plastificazione,
            String deliveryDayLabel, String deliveryTimeRange, String deliveryDateISO,
            String metodoPagamento, String statoPagamento,
            BigDecimal prezzoLordo, BigDecimal scontoGenerale, BigDecimal scontoStudenti,
            BigDecimal imponibile, BigDecimal iva, BigDecimal trasporto, BigDecimal paypalFee,
            BigDecimal totaleFinale, BigDecimal costiInterni,
            boolean frozen, BigDecimal manualAdjustmentDelta, String manualAdjustmentReason,
            Instant timestamp, List<OrderFileDto> files
    ) {}

    public record ManualAdjustmentRequest(BigDecimal delta, String reason) {}
}
