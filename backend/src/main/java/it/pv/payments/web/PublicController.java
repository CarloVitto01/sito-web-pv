package it.pv.payments.web;

import it.pv.payments.domain.ConfigA3;
import it.pv.payments.domain.ConfigA4;
import it.pv.payments.domain.HomeBanner;
import it.pv.payments.domain.PlasticaColor;
import it.pv.payments.dto.ConfigDtos.DeliveryPayload;
import it.pv.payments.dto.ConfigDtos.PromoPayload;
import it.pv.payments.service.ConfigService;
import it.pv.payments.service.PlasticaColorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Endpoint pubblici (nessuna autenticazione) usati per mostrare l'anteprima prezzo/opzioni nel flusso ordine.
 * Il prezzo finale non e' mai calcolato qui: viene sempre ricalcolato e verificato server-side alla creazione
 * dell'ordine (vedi OrderController), quindi qui possiamo restituire solo i dati di vendita (non "interni").
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final ConfigService configService;
    private final PlasticaColorService plasticaColorService;

    public PublicController(ConfigService configService, PlasticaColorService plasticaColorService) {
        this.configService = configService;
        this.plasticaColorService = plasticaColorService;
    }

    @GetMapping("/banner")
    public HomeBanner banner() {
        return configService.getBanner();
    }

    @GetMapping("/plastiche")
    public List<PlasticaColor> plastiche() {
        return plasticaColorService.listEnabled();
    }

    @GetMapping("/delivery-config")
    public DeliveryPayload deliveryConfig() {
        return configService.getDeliveryPayload();
    }

    @GetMapping("/promo-config")
    public PromoPayload promoConfig() {
        return configService.getPromoPayload();
    }

    @GetMapping("/fees-config")
    public Map<String, BigDecimal> feesConfig() {
        var f = configService.getFees();
        return Map.of(
                "ivaRate", f.getIvaRate(),
                "transportFeeEuro", f.getTransportFeeEuro(),
                "paypalPercent", f.getPaypalPercent(),
                "paypalFixed", f.getPaypalFixed()
        );
    }

    @GetMapping("/pricing-a4")
    public Map<String, BigDecimal> pricingA4() {
        ConfigA4 c = configService.getA4();
        return Map.of("foglio", c.getFoglio(), "biancoNero", c.getBiancoNero(), "colore", c.getColore(),
                "anelli", c.getAnelli(), "fascetta", c.getFascetta(), "ciappatura", c.getCiappatura(), "spirale", c.getSpirale());
    }

    @GetMapping("/pricing-a3")
    public Map<String, BigDecimal> pricingA3() {
        ConfigA3 c = configService.getA3();
        return Map.of("grammaturaNormale", c.getGrammaturaNormale(), "grammaturaCartoncino", c.getGrammaturaCartoncino(),
                "biancoNero", c.getBiancoNero(), "colore", c.getColore(), "plastificazione", c.getPlastificazione());
    }
}
