package it.pv.payments.service;

import it.pv.payments.dto.OrderDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Arrays;

final class OrderValidation {
    private OrderValidation() {}
    static void validate(CreateOrderRequest req) {
        copies(req.numeroCopie());
        choice(req.metodoPagamento(), "PAYPAL", "CASH");
        choice(req.tipo(), "A4", "A3");
        boolean a4 = "A4".equals(req.tipo());
        printing(req.inchiostro(), req.pagina(), req.layout(), req.rilegatura(), a4);
        if (a4) {
            choice(req.rilegaturaUnica(), "SI", "NO");
            if (req.plasticaId() != null && ("Nessuna".equalsIgnoreCase(req.rilegatura()) || "Ciappatura".equalsIgnoreCase(req.rilegatura()))) {
                bad("Plastica non prevista per questa rilegatura");
            }
            int totalCopies = 0;
            for (FileInput file : req.files()) {
                int copies = file.numeroCopie() == null ? req.numeroCopie() : file.numeroCopie();
                copies(copies);
                String binding = or(file.rilegatura(), req.rilegatura());
                if (file.plasticaId() != null && ("Nessuna".equalsIgnoreCase(binding) || "Ciappatura".equalsIgnoreCase(binding))) {
                    bad("Plastica non prevista per questa rilegatura");
                }
                totalCopies = Math.addExact(totalCopies, copies);
                printing(or(file.inchiostro(), req.inchiostro()), or(file.pagina(), req.pagina()),
                        or(file.layout(), req.layout()), or(file.rilegatura(), req.rilegatura()), true);
            }
            if (req.files().size() > 1 && "NO".equals(req.rilegaturaUnica()) && totalCopies != req.numeroCopie()) {
                bad("Numero copie incoerente con i singoli file");
            }
        } else {
            choice(req.grammatura(), "Normale", "Cartoncino");
            choice(req.plastificazione(), "Si", "No");
        }
        if (Boolean.TRUE.equals(req.isStudent()) != (req.delivery() != null)) bad("Consegna incoerente");
    }
    private static void printing(String ink, String side, String layout, String binding, boolean a4) {
        choice(ink, "biancoenero", "colore");
        choice(side, "Fronte", "Fronte-retro");
        if (a4) {
            choice(layout, "Verticale", "Orizzontale", "2 pagine in 1 orizzontale", "2 pagine in 1 verticale");
            choice(binding, "Anelli", "Fascetta", "Ciappatura", "Spirale", "Nessuna");
        } else choice(layout, "Auto", "Verticale", "Orizzontale");
    }
    private static String or(String value, String fallback) { return value == null ? fallback : value; }
    private static void copies(Integer value) {
        if (value == null || value < 1 || value > 10000) bad("Numero copie non valido (1-10000)");
    }
    private static void choice(String value, String... allowed) {
        if (value == null || Arrays.stream(allowed).noneMatch(v -> v.equalsIgnoreCase(value))) bad("Opzione di stampa non valida");
    }
    private static void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
