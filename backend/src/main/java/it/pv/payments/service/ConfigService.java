package it.pv.payments.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.pv.payments.domain.*;
import it.pv.payments.dto.ConfigDtos.*;
import it.pv.payments.repository.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/** CRUD delle configurazioni singleton usate dal gestionale (costi, tasse, consegne, promo, banner). */
@Service
public class ConfigService {

    private final ConfigA4Repository a4Repo;
    private final ConfigA3Repository a3Repo;
    private final FeesConfigRepository feesRepo;
    private final DeliveryConfigRepository deliveryRepo;
    private final PromoConfigRepository promoRepo;
    private final HomeBannerRepository bannerRepo;
    private final ObjectMapper mapper;

    public ConfigService(ConfigA4Repository a4Repo, ConfigA3Repository a3Repo, FeesConfigRepository feesRepo,
                          DeliveryConfigRepository deliveryRepo, PromoConfigRepository promoRepo,
                          HomeBannerRepository bannerRepo, ObjectMapper mapper) {
        this.a4Repo = a4Repo;
        this.a3Repo = a3Repo;
        this.feesRepo = feesRepo;
        this.deliveryRepo = deliveryRepo;
        this.promoRepo = promoRepo;
        this.bannerRepo = bannerRepo;
        this.mapper = mapper;
    }

    // ---- A4 ----
    public ConfigA4 getA4() { return a4Repo.findById(1L).orElseGet(this::defaultA4); }

    public ConfigA4 saveA4(A4CostsPayload p) {
        ConfigA4 cfg = getA4();
        cfg.setFoglio(p.foglio()); cfg.setBiancoNero(p.biancoNero()); cfg.setColore(p.colore());
        cfg.setAnelli(p.anelli()); cfg.setFascetta(p.fascetta()); cfg.setCiappatura(p.ciappatura()); cfg.setSpirale(p.spirale());
        cfg.setInterniJson(writeJson(p.interni()));
        cfg.setCostiAcquistoJson(writeJson(p.costiAcquisto()));
        return a4Repo.save(cfg);
    }

    public InterniA4 getA4Interni() {
        return readJson(getA4().getInterniJson(), InterniA4.class,
                new InterniA4(java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
                        java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO));
    }

    public List<CostExtra> getA4CostiAcquisto() { return readJsonListOf(getA4().getCostiAcquistoJson(), CostExtra.class); }
    public List<CostExtra> getA3CostiAcquisto() { return readJsonListOf(getA3().getCostiAcquistoJson(), CostExtra.class); }

    public InterniA3 getA3Interni() {
        return readJson(getA3().getInterniJson(), InterniA3.class,
                new InterniA3(java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO));
    }

    private ConfigA4 defaultA4() {
        ConfigA4 cfg = new ConfigA4();
        var z = java.math.BigDecimal.ZERO;
        cfg.setFoglio(z); cfg.setBiancoNero(z); cfg.setColore(z); cfg.setAnelli(z); cfg.setFascetta(z);
        cfg.setCiappatura(z); cfg.setSpirale(z);
        return a4Repo.save(cfg);
    }

    // ---- A3 ----
    public ConfigA3 getA3() { return a3Repo.findById(1L).orElseGet(this::defaultA3); }

    public ConfigA3 saveA3(A3CostsPayload p) {
        ConfigA3 cfg = getA3();
        cfg.setGrammaturaNormale(p.grammaturaNormale()); cfg.setGrammaturaCartoncino(p.grammaturaCartoncino());
        cfg.setBiancoNero(p.biancoNero()); cfg.setColore(p.colore()); cfg.setPlastificazione(p.plastificazione());
        cfg.setInterniJson(writeJson(p.interni()));
        cfg.setCostiAcquistoJson(writeJson(p.costiAcquisto()));
        return a3Repo.save(cfg);
    }

    private ConfigA3 defaultA3() {
        ConfigA3 cfg = new ConfigA3();
        var z = java.math.BigDecimal.ZERO;
        cfg.setGrammaturaNormale(z); cfg.setGrammaturaCartoncino(z); cfg.setBiancoNero(z); cfg.setColore(z); cfg.setPlastificazione(z);
        return a3Repo.save(cfg);
    }

    // ---- Fees ----
    public FeesConfig getFees() { return feesRepo.findById(1L).orElseGet(this::defaultFees); }

    public FeesConfig saveFees(FeesConfig payload) {
        FeesConfig cfg = getFees();
        cfg.setIvaRate(payload.getIvaRate());
        cfg.setTransportFeeEuro(payload.getTransportFeeEuro());
        cfg.setPaypalPercent(payload.getPaypalPercent());
        cfg.setPaypalFixed(payload.getPaypalFixed());
        return feesRepo.save(cfg);
    }

    private FeesConfig defaultFees() {
        FeesConfig cfg = new FeesConfig();
        cfg.setIvaRate(new java.math.BigDecimal("0.22"));
        cfg.setTransportFeeEuro(java.math.BigDecimal.ONE);
        cfg.setPaypalPercent(new java.math.BigDecimal("0.0349"));
        cfg.setPaypalFixed(new java.math.BigDecimal("0.35"));
        return feesRepo.save(cfg);
    }

    // ---- Delivery ----
    public DeliveryConfig getDelivery() { return deliveryRepo.findById(1L).orElseGet(this::defaultDelivery); }

    public DeliveryConfig saveDelivery(DeliveryPayload p) {
        DeliveryConfig cfg = getDelivery();
        cfg.setWeekdaysJson(writeJson(p.weekdays()));
        cfg.setTimeRangesJson(writeJson(p.timeRanges()));
        cfg.setSlotsAhead(p.slotsAhead());
        cfg.setTimezone(p.timezone());
        cfg.setMinLeadDays(p.minLeadDays());
        cfg.setBlacklistDatesJson(writeJson(p.blacklistDates()));
        cfg.setBlacklistRangesJson(writeJson(p.blacklistRanges()));
        return deliveryRepo.save(cfg);
    }

    public DeliveryPayload getDeliveryPayload() {
        DeliveryConfig cfg = getDelivery();
        return new DeliveryPayload(
                readJsonList(cfg.getWeekdaysJson()),
                readJsonListOf(cfg.getTimeRangesJson(), TimeRange.class),
                cfg.getSlotsAhead(), cfg.getTimezone(), cfg.getMinLeadDays(),
                readJsonListOf(cfg.getBlacklistDatesJson(), String.class),
                readJsonListOf(cfg.getBlacklistRangesJson(), DateRange.class)
        );
    }

    private DeliveryConfig defaultDelivery() {
        DeliveryConfig cfg = new DeliveryConfig();
        cfg.setSlotsAhead(14);
        cfg.setMinLeadDays(1);
        cfg.setTimezone("Europe/Rome");
        return deliveryRepo.save(cfg);
    }

    // ---- Promo ----
    public PromoConfig getPromo() { return promoRepo.findById(1L).orElseGet(this::defaultPromo); }

    public PromoConfig savePromo(PromoPayload p) {
        PromoConfig cfg = getPromo();
        cfg.setGeneralPromoJson(writeJson(p.generalPromo()));
        cfg.setStudentPromoJson(writeJson(p.studentPromo()));
        cfg.setUpdatedAt(Instant.now());
        return promoRepo.save(cfg);
    }

    public PromoPayload getPromoPayload() {
        PromoConfig cfg = getPromo();
        BasePromo general = readJson(cfg.getGeneralPromoJson(), BasePromo.class,
                new BasePromo(false, "Promo generale", "", java.math.BigDecimal.ZERO, 1, "", ""));
        StudentPromo student = readJson(cfg.getStudentPromoJson(), StudentPromo.class,
                new StudentPromo(false, "Promo facolta/corso", "", java.math.BigDecimal.ZERO, 1, "", "", "", null));
        return new PromoPayload(general, student);
    }

    private PromoConfig defaultPromo() {
        PromoConfig cfg = new PromoConfig();
        cfg.setUpdatedAt(Instant.now());
        return promoRepo.save(cfg);
    }

    // ---- Banner ----
    public HomeBanner getBanner() { return bannerRepo.findById(1L).orElseGet(this::defaultBanner); }

    public HomeBanner saveBanner(HomeBanner payload) {
        HomeBanner cfg = getBanner();
        cfg.setEnabled(payload.isEnabled());
        cfg.setText(payload.getText());
        cfg.setVariant(payload.getVariant());
        cfg.setUpdatedAt(Instant.now());
        return bannerRepo.save(cfg);
    }

    private HomeBanner defaultBanner() {
        HomeBanner cfg = new HomeBanner();
        cfg.setEnabled(false);
        cfg.setVariant("info");
        cfg.setUpdatedAt(Instant.now());
        return bannerRepo.save(cfg);
    }

    // ---- json helpers ----
    private String writeJson(Object o) {
        try { return o == null ? null : mapper.writeValueAsString(o); } catch (Exception e) { throw new IllegalArgumentException("Configurazione non serializzabile", e); }
    }

    private <T> T readJson(String json, Class<T> type, T fallback) {
        if (json == null || json.isBlank()) return fallback;
        try { return mapper.readValue(json, type); } catch (Exception e) { return fallback; }
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> readJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return mapper.readValue(json, List.class); } catch (Exception e) { return List.of(); }
    }

    private <T> List<T> readJsonListOf(String json, Class<T> elementType) {
        if (json == null || json.isBlank()) return List.of();
        try {
            var type = mapper.getTypeFactory().constructCollectionType(List.class, elementType);
            return mapper.readValue(json, type);
        } catch (Exception e) { return List.of(); }
    }
}
