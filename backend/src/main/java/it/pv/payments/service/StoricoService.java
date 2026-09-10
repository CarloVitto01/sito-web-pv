package it.pv.payments.service;

import it.pv.payments.domain.Order;
import it.pv.payments.dto.ConfigDtos.CostExtra;
import it.pv.payments.dto.ConfigDtos.InterniA3;
import it.pv.payments.dto.ConfigDtos.InterniA4;
import it.pv.payments.dto.OrderDtos.OrderResponse;
import it.pv.payments.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

/**
 * Storico ordini e calcolo margine (costi interni), equivalente di StoricoDati.tsx.
 * Nota: il calcolo dei costiAcquisto (extra generici configurabili in gestionale) e' un'approssimazione
 * del comportamento originale, che matchava ogni extra su campi specifici dell'ordine in modo non
 * completamente documentato: qui ogni extra attivo viene applicato secondo la sua "unita'"
 * (per_foglio / per_ordine / per_fascicolo / percentuale) sul totale interno gia' calcolato.
 */
@Service
public class StoricoService {

    private final OrderRepository orderRepository;
    private final ConfigService configService;
    private final OrderService orderService;

    public StoricoService(OrderRepository orderRepository, ConfigService configService, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.configService = configService;
        this.orderService = orderService;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listAllResponses() {
        return orderRepository.findAll().stream().filter(orderService::isConfirmed).map(orderService::toResponse).toList();
    }

    @Transactional
    public OrderResponse freezeWithBreakdown(String orderId) {
        Order order = orderRepository.findLockedById(orderId).orElseThrow();
        if (order.isFrozen()) return orderService.toResponse(order);
        BigDecimal costiInterni = computeCostiInterni(order);
        order.setCostiInterni(costiInterni);
        order.setFrozen(true);
        order.setFrozenAt(Instant.now());
        return orderService.toResponse(orderRepository.save(order));
    }

    public BigDecimal computeCostiInterni(Order order) {
        BigDecimal totale;
        if ("A4".equalsIgnoreCase(order.getTipo())) {
            InterniA4 interni = configService.getA4Interni();
            if (order.getFiles() != null && !order.getFiles().isEmpty()
                    && order.getFiles().stream().allMatch(f -> f.getInchiostro() != null && f.getNumeroCopie() != null)) {
                boolean separate = order.getNumeroPDF() > 1 && "NO".equalsIgnoreCase(order.getRilegaturaUnica());
                if (separate) {
                    totale = BigDecimal.ZERO;
                    for (var file : order.getFiles()) {
                        int pages = selectedPages(file.getPagineLabel(), file.getPages());
                        int sheets = sheets(pages, file.getPagina(), file.getLayout());
                        totale = totale.add(a4Cost(interni, sheets, file.getNumeroCopie(), file.getInchiostro(),
                                file.getPagina(), file.getRilegatura()));
                    }
                } else {
                    totale = a4Cost(interni, nz(order.getNFogliPerCopia()), nz(order.getNumeroCopie()),
                            order.getInchiostro(), order.getPagina(), order.getRilegatura());
                }
            } else {
                // Vecchi ordini senza impostazioni per-file: mantieni il percorso compatibile.
                totale = a4Cost(interni, nz(order.getNFogliPerCopia()), nz(order.getNumeroCopie()),
                        order.getInchiostro(), order.getPagina(), order.getRilegatura());
            }
            totale = totale.add(a4Extras(configService.getA4CostiAcquisto(), order, interni, totale));
        } else {
            InterniA3 interni = configService.getA3Interni();
            BigDecimal inchiostro = "colore".equalsIgnoreCase(order.getInchiostro()) ? interni.colore() : interni.biancoNero();
            BigDecimal costoPerFoglio = interni.foglio().add(inchiostro.multiply(BigDecimal.valueOf(duplex(order.getPagina()) ? 2 : 1)));
            totale = costoPerFoglio.multiply(BigDecimal.valueOf(nz(order.getNFogli())));
            if ("SI".equalsIgnoreCase(order.getPlastificazione())) {
                int allPages = order.getFiles().stream().mapToInt(f -> nz(f.getPages())).sum();
                totale = totale.add(interni.plastificazione().multiply(BigDecimal.valueOf(
                        (long) selectedPages(order.getPagine(), allPages) * nz(order.getNumeroCopie()))));
            }
            totale = totale.add(applyExtras(configService.getA3CostiAcquisto(), order, totale));
        }
        return totale.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal a4Extras(List<CostExtra> extras, Order order, InterniA4 costs, BigDecimal base) {
        boolean separate = order.getNumeroPDF() != null && order.getNumeroPDF() > 1
                && "NO".equalsIgnoreCase(order.getRilegaturaUnica())
                && order.getFiles().stream().allMatch(f -> f.getInchiostro() != null && f.getNumeroCopie() != null);
        if (!separate) return applyExtras(extras, order, base);
        var perOrder = extras.stream().filter(e -> e.unita() == null || "per_ordine".equals(e.unita())).toList();
        var perFile = extras.stream().filter(e -> e.unita() != null && !"per_ordine".equals(e.unita())).toList();
        BigDecimal total = applyExtras(perOrder, order, base);
        for (var file : order.getFiles()) {
            int sheets = sheets(selectedPages(file.getPagineLabel(), file.getPages()), file.getPagina(), file.getLayout());
            Order scope = new Order(); scope.setTipo("A4"); scope.setInchiostro(file.getInchiostro());
            scope.setRilegatura(file.getRilegatura()); scope.setPagina(file.getPagina()); scope.setLayout(file.getLayout());
            scope.setNFogli(sheets * file.getNumeroCopie()); scope.setFascicoli(file.getNumeroCopie());
            BigDecimal fileBase = a4Cost(costs, sheets, file.getNumeroCopie(), file.getInchiostro(), file.getPagina(), file.getRilegatura());
            total = total.add(applyExtras(perFile, scope, fileBase));
        }
        return total;
    }

    private boolean duplex(String side) { return "Fronte-retro".equalsIgnoreCase(side) || "FRONTE_RETRO".equalsIgnoreCase(side); }
    private int selectedPages(String label, Integer allPages) {
        if (label == null || "Tutte".equalsIgnoreCase(label)) return nz(allPages);
        String[] range = label.split("-");
        if (range.length != 2) throw new IllegalArgumentException("Intervallo storico non valido");
        return Integer.parseInt(range[1].trim()) - Integer.parseInt(range[0].trim()) + 1;
    }
    private int sheets(int pages, String side, String layout) {
        int sheets = duplex(side) ? (pages + 1) / 2 : pages;
        return layout != null && layout.toLowerCase().contains("2 pagine in 1") ? (sheets + 1) / 2 : sheets;
    }
    private BigDecimal a4Cost(InterniA4 costs, int sheets, int copies, String ink, String side, String binding) {
        BigDecimal inkCost = "biancoenero".equalsIgnoreCase(ink) ? costs.biancoNero() : costs.colore();
        BigDecimal bindingCost = switch (binding == null ? "" : binding.toUpperCase(java.util.Locale.ROOT)) {
            case "ANELLI" -> costs.anelli();
            case "FASCETTA" -> costs.fascetta();
            case "CIAPPATURA" -> costs.ciappatura();
            case "SPIRALE" -> costs.spirale();
            default -> BigDecimal.ZERO;
        };
        return costs.foglio().add(inkCost.multiply(BigDecimal.valueOf(duplex(side) ? 2 : 1)))
                .multiply(BigDecimal.valueOf(sheets)).add(bindingCost).multiply(BigDecimal.valueOf(copies));
    }
    private boolean matches(CostExtra extra, Order order) {
        if (extra.campo() == null || extra.campo().isBlank() || extra.match() == null || extra.match().isBlank()) return true;
        String value = switch (extra.campo()) {
            case "inchiostro" -> order.getInchiostro();
            case "rilegatura" -> order.getRilegatura();
            case "grammatura" -> order.getGrammatura();
            case "plastificazione" -> order.getPlastificazione();
            case "pagina" -> order.getPagina();
            case "layout" -> order.getLayout();
            case "tipo" -> order.getTipo();
            default -> null;
        };
        return value != null && value.toLowerCase(java.util.Locale.ROOT).contains(extra.match().toLowerCase(java.util.Locale.ROOT));
    }

    private BigDecimal applyExtras(List<CostExtra> extras, Order order, BigDecimal baseSoFar) {
        BigDecimal sum = BigDecimal.ZERO;
        for (CostExtra e : extras) {
            if (!e.attivo() || e.costo() == null || !matches(e, order)) continue;
            switch (e.unita() == null ? "" : e.unita()) {
                case "per_foglio" -> sum = sum.add(e.costo().multiply(BigDecimal.valueOf(nz(order.getNFogli()))));
                case "per_fascicolo" -> sum = sum.add(e.costo().multiply(BigDecimal.valueOf(nz(order.getFascicoli()))));
                case "percentuale" -> sum = sum.add(baseSoFar.multiply(e.costo()).divide(BigDecimal.valueOf(100)));
                default -> sum = sum.add(e.costo()); // per_ordine
            }
        }
        return sum;
    }

    private int nz(Integer v) { return v == null ? 0 : v; }
}
