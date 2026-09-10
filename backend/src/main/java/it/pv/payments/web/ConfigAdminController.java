package it.pv.payments.web;

import it.pv.payments.domain.ConfigA3;
import it.pv.payments.domain.ConfigA4;
import it.pv.payments.domain.FeesConfig;
import it.pv.payments.domain.HomeBanner;
import it.pv.payments.dto.ConfigDtos.*;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.service.ConfigService;
import org.springframework.web.bind.annotation.*;

/** Endpoint di scrittura/lettura delle configurazioni gestite dal gestionale (una pagina = un page-slug RBAC). */
@RestController
@RequestMapping("/api/admin/config")
public class ConfigAdminController {

    private final ConfigService configService;
    private final AccessGuard accessGuard;

    public ConfigAdminController(ConfigService configService, AccessGuard accessGuard) {
        this.configService = configService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/a4-costs")
    public A4CostsPayload getA4() {
        accessGuard.requirePage("gestionaleA4");
        ConfigA4 c = configService.getA4();
        return new A4CostsPayload(c.getFoglio(), c.getBiancoNero(), c.getColore(), c.getAnelli(), c.getFascetta(),
                c.getCiappatura(), c.getSpirale(), configService.getA4Interni(), configService.getA4CostiAcquisto());
    }

    @PutMapping("/a4-costs")
    public void saveA4(@jakarta.validation.Valid @RequestBody A4CostsPayload payload) {
        accessGuard.requirePage("gestionaleA4");
        configService.saveA4(payload);
    }

    @GetMapping("/a3-costs")
    public A3CostsPayload getA3() {
        accessGuard.requirePage("gestionaleA3");
        ConfigA3 c = configService.getA3();
        return new A3CostsPayload(c.getGrammaturaNormale(), c.getGrammaturaCartoncino(), c.getBiancoNero(),
                c.getColore(), c.getPlastificazione(), configService.getA3Interni(), configService.getA3CostiAcquisto());
    }

    @PutMapping("/a3-costs")
    public void saveA3(@jakarta.validation.Valid @RequestBody A3CostsPayload payload) {
        accessGuard.requirePage("gestionaleA3");
        configService.saveA3(payload);
    }

    @GetMapping("/fees")
    public FeesConfig getFees() {
        accessGuard.requirePage("tasse");
        return configService.getFees();
    }

    @PutMapping("/fees")
    public void saveFees(@jakarta.validation.Valid @RequestBody FeesConfig payload) {
        accessGuard.requirePage("tasse");
        configService.saveFees(payload);
    }

    @GetMapping("/delivery")
    public DeliveryPayload getDelivery() {
        accessGuard.requirePage("consegna");
        return configService.getDeliveryPayload();
    }

    @PutMapping("/delivery")
    public void saveDelivery(@jakarta.validation.Valid @RequestBody DeliveryPayload payload) {
        accessGuard.requirePage("consegna");
        configService.saveDelivery(payload);
    }

    @GetMapping("/promo")
    public PromoPayload getPromo() {
        accessGuard.requirePage("sconti");
        return configService.getPromoPayload();
    }

    @PutMapping("/promo")
    public void savePromo(@jakarta.validation.Valid @RequestBody PromoPayload payload) {
        accessGuard.requirePage("sconti");
        configService.savePromo(payload);
    }

    @GetMapping("/banner")
    public HomeBanner getBanner() {
        accessGuard.requirePage("banner");
        return configService.getBanner();
    }

    @PutMapping("/banner")
    public void saveBanner(@jakarta.validation.Valid @RequestBody HomeBanner payload) {
        accessGuard.requirePage("banner");
        configService.saveBanner(payload);
    }
}
