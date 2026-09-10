package it.pv.payments.service;

import it.pv.payments.domain.Order;
import it.pv.payments.domain.OrderFile;
import it.pv.payments.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Notifica su Telegram alla creazione di un ordine. Prima veniva fatta client-side con i token del bot
 * esposti nel bundle pubblico: qui gira solo lato server, con i token letti da variabili d'ambiente.
 */
@Service
public class TelegramNotifier {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);

    private final RestTemplate http = new org.springframework.boot.web.client.RestTemplateBuilder()
            .setConnectTimeout(java.time.Duration.ofSeconds(5)).setReadTimeout(java.time.Duration.ofSeconds(10)).build();

    private final String tokenA4;
    private final String chatIdA4;
    private final String tokenA3;
    private final String chatIdA3;
    private final String downloadBaseUrl;
    private final JwtService jwtService;

    public TelegramNotifier(
            @Value("${app.telegram.a4.token:}") String tokenA4,
            @Value("${app.telegram.a4.chat-id:}") String chatIdA4,
            @Value("${app.telegram.a3.token:}") String tokenA3,
            @Value("${app.telegram.a3.chat-id:}") String chatIdA3,
            @Value("${app.public-base-url:http://localhost:8080}") String downloadBaseUrl,
            JwtService jwtService
    ) {
        this.tokenA4 = tokenA4;
        this.chatIdA4 = chatIdA4;
        this.tokenA3 = tokenA3;
        this.chatIdA3 = chatIdA3;
        this.downloadBaseUrl = downloadBaseUrl;
        this.jwtService = jwtService;
    }

    public void notifyNewOrder(Order order) {
        String token = "A4".equals(order.getTipo()) ? tokenA4 : tokenA3;
        String chatId = "A4".equals(order.getTipo()) ? chatIdA4 : chatIdA3;
        if (token == null || token.isBlank() || chatId == null || chatId.isBlank()) {
            log.info("Telegram non configurato per {}, notifica saltata (ordine {})", order.getTipo(), order.getId());
            return;
        }

        // HTML come parse_mode: a differenza del Markdown "legacy" di Telegram, non tratta come
        // formattazione i caratteri (_ * ` [) che possono comparire in nomi/cognomi/nomi-file, quindi
        // basta escapare & < > nei valori dinamici (fatto in nz/esc) per evitare messaggi rifiutati (400)
        // o markup rotto. Serve anche per rendere cliccabile il link di download come testo "File".
        StringBuilder sb = new StringBuilder();
        sb.append("=====================\n");
        sb.append("  NUOVO ORDINE ").append(esc(order.getTipo())).append("\n");
        sb.append("=====================\n\n");

        sb.append("📝 Dettagli Ordine:\n");
        sb.append("Nome: ").append(nz(order.getNome())).append("\n");
        sb.append("Cognome: ").append(nz(order.getCognome())).append("\n");
        sb.append("Email: ").append(nz(order.getEmail())).append("\n");
        sb.append("Telefono: ").append(nz(order.getTelefono())).append("\n");
        if (order.getCorsoLaurea() != null && !order.getCorsoLaurea().isBlank()) {
            sb.append("Corso Laurea: ").append(esc(order.getCorsoLaurea())).append("\n");
        }
        if (order.getAnnoAccademico() != null && !order.getAnnoAccademico().isBlank()) {
            sb.append("Anno Accademico: ").append(esc(order.getAnnoAccademico())).append("\n");
        }
        sb.append("\n");

        boolean rilegaturaSeparata = order.getNumeroPDF() != null && order.getNumeroPDF() > 1
                && "NO".equalsIgnoreCase(order.getRilegaturaUnica());

        sb.append("📁 File caricati: 📄\n");
        int i = 1;
        for (OrderFile f : order.getFiles()) {
            String downloadToken = jwtService.generateFileDownloadToken(f.getId());
            String downloadUrl = downloadBaseUrl + "/api/files/download/" + f.getId() + "?token=" + downloadToken;
            sb.append("- File ").append(i++).append(" - ").append(f.getPages()).append(" pagine: ")
              .append("<a href=\"").append(esc(downloadUrl)).append("\">File</a>").append("\n");

            // con rilegatura separata ogni file ha impostazioni proprie: le mostro qui sotto al file,
            // le righe globali equivalenti piu' in basso vengono nascoste perche' ridondanti/fuorvianti
            if (rilegaturaSeparata) {
                sb.append("  ↳ Colore: ").append(coloreLabel(f.getInchiostro()))
                  .append(" · Pagina: ").append(nz(f.getPagina()))
                  .append(" · Layout: ").append(nz(f.getLayout()))
                  .append(" · Rilegatura: ").append(nz(f.getRilegatura()))
                  .append(" · Plastica: ").append(f.getPlasticaName() != null ? esc(f.getPlasticaName()) : "-")
                  .append(" · Pagine: ").append(nz(f.getPagineLabel()))
                  .append(" · Copie: ").append(f.getNumeroCopie() != null ? f.getNumeroCopie() : "-")
                  .append("\n");
            }
        }
        sb.append("\n");

        sb.append("📒 Rilegatura unica: ").append(nz(order.getRilegaturaUnica())).append("\n");
        if (!rilegaturaSeparata) {
            // con rilegatura separata queste righe sono ridondanti col dettaglio per-file sopra
            sb.append("🎨 Colore: ").append(nz(order.getColore())).append("\n");
            sb.append("📄 Pagina: ").append(nz(order.getPagina())).append("\n");
            sb.append("📐 Layout: ").append(nz(order.getLayout())).append("\n");
            sb.append("📒 Rilegatura: ").append(nz(order.getRilegatura())).append("\n");
            sb.append("🧱 Plastica: ").append(order.getPlasticaName() != null ? esc(order.getPlasticaName()) : "-").append("\n");
            sb.append("Pagine: ").append(nz(order.getPagine())).append("\n");
            sb.append("🔢 Copie: ").append(order.getNumeroCopie()).append("\n\n");
        } else {
            sb.append("\n");
        }

        if (order.getDeliveryDateISO() != null) {
            sb.append("🚚 Consegna: ").append(nz(order.getDeliveryDayLabel())).append(" • ")
              .append(nz(order.getDeliveryTimeRange())).append("\n\n");
        }

        sb.append("💳 Metodo di pagamento: ").append(nz(order.getMetodoPagamento())).append("\n");
        sb.append("✅ Stato pagamento: ").append(nz(order.getStatoPagamento())).append("\n");
        sb.append("💰 Totale finale: ").append(formatEuro(order.getTotaleFinale())).append("\n");

        String text = sb.length() > 3900 ? sb.substring(0, 3900) : sb.toString();

        try {
            var headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("chat_id", chatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");
            var response = http.postForEntity("https://api.telegram.org/bot" + token + "/sendMessage",
                    new HttpEntity<>(body, headers), String.class);
            log.info("Notifica Telegram inviata per ordine {}: {}", order.getId(), response.getStatusCode());
        } catch (Exception ex) {
            log.warn("Invio notifica Telegram fallito per ordine {}: {}", order.getId(), ex.getClass().getSimpleName());
        }
    }

    private static String nz(String value) {
        return value == null || value.isBlank() ? "-" : esc(value);
    }

    private static String esc(String value) {
        if (value == null) return "-";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String coloreLabel(String inchiostro) {
        return "biancoenero".equalsIgnoreCase(inchiostro) ? "Bianco e nero" : "Colore";
    }

    private static String formatEuro(java.math.BigDecimal value) {
        if (value == null) return "-";
        return value.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace('.', ',') + " €";
    }
}
