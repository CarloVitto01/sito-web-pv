package it.pv.payments.service;

import it.pv.payments.domain.ConfigA3;
import it.pv.payments.domain.ConfigA4;
import it.pv.payments.domain.User;
import it.pv.payments.dto.ConfigDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

/**
 * Motore di calcolo prezzi lato server: replica fedelmente la logica che prima girava client-side in
 * PdfPrintPage.tsx (preventivo) e RiepilogoOrdine(A3).tsx (sconti/IVA/trasporto/fee PayPal), cosi' che il
 * totale pagato non dipenda piu' da un valore inviato dal browser.
 */
@Service
public class PricingService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final ConfigService configService;

    public PricingService(ConfigService configService) {
        this.configService = configService;
    }

    public record GeometryA4(int pagineSelezionate, int fogliPerCopia, int fascicoli) {}

    /**
     * @param pagesPerFile pagine di ciascun file, usate SOLO quando la rilegatura non e' unica: ogni file
     *                     forma un fascicolo rilegato a se' stante, quindi la sua paginazione fronte-retro
     *                     (e l'eventuale layout "2 in 1") va calcolata sulle sue sole pagine - un file con un
     *                     numero dispari di pagine non puo' condividere l'ultimo foglio con il file successivo,
     *                     dato che finiscono in due rilegature fisicamente separate.
     */
    public GeometryA4 computeGeometryA4(int realTotalPages, boolean rangeAll, Integer rangeFrom, Integer rangeTo,
                                         String pagina, String layout, int numeroCopie, String rilegaturaUnica,
                                         int numeroPDF, List<Integer> pagesPerFile) {
        int pagineSel = rangeAll ? realTotalPages : validateRange(rangeFrom, rangeTo, realTotalPages);
        boolean unica = numeroPDF == 1 || "SI".equalsIgnoreCase(rilegaturaUnica);

        int fogli;
        if (unica || pagesPerFile == null || pagesPerFile.isEmpty()) {
            fogli = isFronteRetro(pagina) ? ceilDiv(pagineSel, 2) : pagineSel;
            if (isDuePagine(layout)) fogli = ceilDiv(fogli, 2);
        } else {
            fogli = 0;
            for (int filePagine : pagesPerFile) {
                int f = isFronteRetro(pagina) ? ceilDiv(filePagine, 2) : filePagine;
                if (isDuePagine(layout)) f = ceilDiv(f, 2);
                fogli += f;
            }
        }

        int fascicoli = unica ? numeroCopie : numeroPDF * numeroCopie;
        return new GeometryA4(pagineSel, Math.max(0, fogli), fascicoli);
    }

    public int computeGeometryA3Fogli(int realTotalPages, boolean rangeAll, Integer rangeFrom, Integer rangeTo, String pagina) {
        int pagineSel = rangeAll ? realTotalPages : validateRange(rangeFrom, rangeTo, realTotalPages);
        int fogli = isFronteRetro(pagina) ? ceilDiv(pagineSel, 2) : pagineSel;
        return Math.max(0, fogli);
    }

    /** "Fronte-retro" e' l'etichetta usata dal frontend (identica per A4 e A3). */
    private boolean isFronteRetro(String pagina) {
        return "Fronte-retro".equalsIgnoreCase(pagina) || "FRONTE_RETRO".equalsIgnoreCase(pagina);
    }

    /** I due layout A4 "2 in 1" dimezzano il numero di fogli rispetto alle pagine selezionate. */
    private boolean isDuePagine(String layout) {
        if (layout == null) return false;
        String l = layout.toLowerCase();
        return l.contains("2 pagine in 1") || l.equals("duepagorizz") || l.equals("duepagvert");
    }

    private int validateRange(Integer from, Integer to, int totalPages) {
        if (from == null || to == null || from < 1 || to < from || to > totalPages) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Intervallo di pagine non valido");
        }
        return to - from + 1;
    }

    private int ceilDiv(int a, int b) {
        return (int) Math.ceil(a / (double) b);
    }

    public ConfigA4 getConfigA4() {
        return configService.getA4();
    }

    public ConfigA3 getConfigA3() {
        return configService.getA3();
    }

    /**
     * @param rilegaturaPerFile usata solo quando la rilegatura NON e' unica: una rilegatura (anche diversa)
     *                          per ciascun file caricato. Se assente/vuota, ricade su {@code rilegatura} per
     *                          tutti i file (comportamento precedente).
     */
    public BigDecimal computeBaseLordoA4(ConfigA4 cfg, GeometryA4 geo, int numeroCopie, int numeroPDF,
                                          String inchiostro, String pagina, String rilegatura, String rilegaturaUnica,
                                          List<String> rilegaturaPerFile, BigDecimal extraPlasticaPerCopia) {
        BigDecimal prezzoInchiostro = "biancoenero".equalsIgnoreCase(inchiostro) ? cfg.getBiancoNero() : cfg.getColore();
        BigDecimal costoInchiostroPerFoglio = isFronteRetro(pagina)
                ? prezzoInchiostro.multiply(BigDecimal.valueOf(2)) : prezzoInchiostro;

        BigDecimal totale = BigDecimal.valueOf(geo.fogliPerCopia())
                .multiply(cfg.getFoglio().add(costoInchiostroPerFoglio));
        totale = totale.multiply(BigDecimal.valueOf(numeroCopie));

        boolean unica = numeroPDF == 1 || "SI".equalsIgnoreCase(rilegaturaUnica);
        BigDecimal prezzoRilegaturaTotale;
        if (unica) {
            prezzoRilegaturaTotale = rilegaturaCost(cfg, rilegatura).multiply(BigDecimal.valueOf(numeroCopie));
        } else {
            List<String> perFile = (rilegaturaPerFile != null && !rilegaturaPerFile.isEmpty())
                    ? rilegaturaPerFile
                    : Collections.nCopies(numeroPDF, rilegatura);
            BigDecimal sum = BigDecimal.ZERO;
            for (String r : perFile) sum = sum.add(rilegaturaCost(cfg, r));
            prezzoRilegaturaTotale = sum.multiply(BigDecimal.valueOf(numeroCopie));
        }
        totale = totale.add(prezzoRilegaturaTotale);

        if (extraPlasticaPerCopia != null && extraPlasticaPerCopia.signum() > 0) {
            totale = totale.add(extraPlasticaPerCopia.multiply(BigDecimal.valueOf(numeroCopie)));
        }

        if (numeroCopie == 0) return ZERO;
        return totale.setScale(2, RoundingMode.HALF_UP);
    }

    /** Impostazioni di stampa di un singolo file, usate solo nel percorso "rilegatura separata". */
    public record PerFileConfig(int pages, String inchiostro, String pagina, String layout, String rilegatura,
                                 BigDecimal plasticaExtra, int numeroCopie,
                                 boolean rangeAll, Integer rangeFrom, Integer rangeTo) {}

    public record SeparataResult(BigDecimal baseLordo, int nFogli, int nFogliPerCopiaTotale, int fascicoli) {}

    /**
     * Ogni file e' un fascicolo rilegato a se' stante: pagine selezionate, fogli, inchiostro, rilegatura,
     * plastica e numero di copie sono calcolati e sommati indipendentemente per ciascuno, invece di un
     * unico calcolo condiviso moltiplicato per un numeroCopie comune a tutto l'ordine.
     */
    public SeparataResult computeBaseLordoA4Separata(ConfigA4 cfg, List<PerFileConfig> files) {
        BigDecimal totale = BigDecimal.ZERO;
        int nFogliTotale = 0;
        int nFogliPerCopiaTotale = 0;
        int fascicoli = 0;

        for (PerFileConfig f : files) {
            int pagineSel = f.rangeAll() ? f.pages() : validateRange(f.rangeFrom(), f.rangeTo(), f.pages());

            int fogliPerCopia = isFronteRetro(f.pagina()) ? ceilDiv(pagineSel, 2) : pagineSel;
            if (isDuePagine(f.layout())) fogliPerCopia = ceilDiv(fogliPerCopia, 2);
            fogliPerCopia = Math.max(0, fogliPerCopia);

            BigDecimal prezzoInchiostro = "biancoenero".equalsIgnoreCase(f.inchiostro()) ? cfg.getBiancoNero() : cfg.getColore();
            BigDecimal costoInchiostroPerFoglio = isFronteRetro(f.pagina())
                    ? prezzoInchiostro.multiply(BigDecimal.valueOf(2)) : prezzoInchiostro;

            BigDecimal perCopia = BigDecimal.valueOf(fogliPerCopia).multiply(cfg.getFoglio().add(costoInchiostroPerFoglio));
            perCopia = perCopia.add(rilegaturaCost(cfg, f.rilegatura()));
            if (f.plasticaExtra() != null && f.plasticaExtra().signum() > 0) {
                perCopia = perCopia.add(f.plasticaExtra());
            }

            int copie = Math.max(0, f.numeroCopie());
            totale = totale.add(perCopia.multiply(BigDecimal.valueOf(copie)));
            nFogliTotale += fogliPerCopia * copie;
            nFogliPerCopiaTotale += fogliPerCopia;
            fascicoli += copie;
        }

        return new SeparataResult(totale.setScale(2, RoundingMode.HALF_UP), nFogliTotale, nFogliPerCopiaTotale, Math.max(1, fascicoli));
    }

    private BigDecimal rilegaturaCost(ConfigA4 cfg, String rilegatura) {
        return switch (rilegatura == null ? "" : rilegatura.toUpperCase()) {
            case "ANELLI" -> cfg.getAnelli();
            case "FASCETTA" -> cfg.getFascetta();
            case "CIAPPATURA" -> cfg.getCiappatura();
            case "SPIRALE" -> cfg.getSpirale();
            default -> BigDecimal.ZERO;
        };
    }

    public BigDecimal computeBaseLordoA3(ConfigA3 cfg, int fogli, int pagineSel, int numeroCopie,
                                          String grammatura, String inchiostro, String pagina, String plastificazione) {
        BigDecimal costoFoglio = "CARTONCINO".equalsIgnoreCase(grammatura) ? cfg.getGrammaturaCartoncino() : cfg.getGrammaturaNormale();
        BigDecimal costoInchiostro = "colore".equalsIgnoreCase(inchiostro) ? cfg.getColore() : cfg.getBiancoNero();
        BigDecimal inchiostroTotale = isFronteRetro(pagina)
                ? costoInchiostro.multiply(BigDecimal.valueOf(2)) : costoInchiostro;

        BigDecimal totale = BigDecimal.valueOf(fogli).multiply(costoFoglio.add(inchiostroTotale));
        totale = totale.multiply(BigDecimal.valueOf(numeroCopie));

        if ("SI".equalsIgnoreCase(plastificazione)) {
            totale = totale.add(cfg.getPlastificazione().multiply(BigDecimal.valueOf((long) pagineSel * numeroCopie)));
        }

        if (numeroCopie == 0) return ZERO;
        return totale.setScale(2, RoundingMode.HALF_UP);
    }

    public record Totals(BigDecimal baseLordo, BigDecimal scontoGenerale, BigDecimal scontoStudenti,
                          BigDecimal imponibile, BigDecimal iva, BigDecimal trasporto, BigDecimal paypalFee,
                          BigDecimal totaleFinale) {}

    public Totals computeTotals(BigDecimal baseLordo, int numeroPDF, User user, boolean isStudentDelivery, String metodoPagamento) {
        var fees = configService.getFees();
        var promo = configService.getPromoPayload();

        BasePromo generalPromo = promo.generalPromo();
        StudentPromo studentPromo = promo.studentPromo();

        BigDecimal base = round2(baseLordo);

        boolean generalActive = isPromoActiveToday(generalPromo.enabled(), generalPromo.percent(), generalPromo.minPdf(),
                generalPromo.startsAt(), generalPromo.endsAt(), numeroPDF);
        BigDecimal scontoGenerale = ZERO;
        if (generalActive) {
            scontoGenerale = round2(base.multiply(generalPromo.percent()).divide(BigDecimal.valueOf(100)));
        }
        BigDecimal baseDopoGenerale = round2(base.subtract(scontoGenerale));

        boolean studentActive = isPromoActiveToday(studentPromo.enabled(), studentPromo.percent(), studentPromo.minPdf(),
                studentPromo.startsAt(), studentPromo.endsAt(), numeroPDF) && userMatchesStudentPromo(user, studentPromo);
        BigDecimal scontoStudenti = ZERO;
        if (studentActive) {
            scontoStudenti = round2(baseDopoGenerale.multiply(studentPromo.percent()).divide(BigDecimal.valueOf(100)));
        }
        BigDecimal imponibile = round2(baseDopoGenerale.subtract(scontoStudenti));

        BigDecimal iva = round2(imponibile.multiply(fees.getIvaRate()));
        BigDecimal trasporto = isStudentDelivery ? round2(fees.getTransportFeeEuro()) : ZERO;
        BigDecimal subTotale = round2(imponibile.add(iva).add(trasporto));

        BigDecimal paypalFee = ZERO;
        BigDecimal totale = subTotale;
        if ("PAYPAL".equalsIgnoreCase(metodoPagamento)) {
            paypalFee = round2(subTotale.multiply(fees.getPaypalPercent()).add(fees.getPaypalFixed()));
            totale = round2(subTotale.add(paypalFee));
        }

        return new Totals(base, scontoGenerale, scontoStudenti, imponibile, iva, trasporto, paypalFee, totale);
    }

    private boolean isPromoActiveToday(boolean enabled, BigDecimal percent, Integer minPdf, String startsAt, String endsAt, int numeroPDF) {
        if (!enabled) return false;
        if (numeroPDF < (minPdf == null ? 1 : minPdf)) return false;
        if (percent == null || percent.signum() <= 0) return false;
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        if (startsAt != null && !startsAt.isBlank() && today.compareTo(startsAt) < 0) return false;
        if (endsAt != null && !endsAt.isBlank() && today.compareTo(endsAt) > 0) return false;
        return true;
    }

    private boolean userMatchesStudentPromo(User user, StudentPromo promo) {
        if (user == null) return false;
        String userCourse = normalize(user.getCorsoLaurea());
        String targetCourse = normalize(promo.targetCourse());
        if (userCourse.isEmpty() || targetCourse.isEmpty()) return false;
        boolean courseMatches = userCourse.equals(targetCourse) || userCourse.contains(targetCourse) || targetCourse.contains(userCourse);
        if (!courseMatches) return false;
        Integer userYear = parseIntOrNull(user.getAnnoAccademico());
        return userYear != null && promo.targetEnrollmentYear() != null && userYear.equals(promo.targetEnrollmentYear());
    }

    private Integer parseIntOrNull(String s) {
        try { return s == null ? null : Integer.valueOf(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private BigDecimal round2(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
