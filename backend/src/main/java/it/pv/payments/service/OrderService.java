package it.pv.payments.service;

import it.pv.payments.domain.*;
import it.pv.payments.dto.OrderDtos.*;
import it.pv.payments.repository.OrderRepository;
import it.pv.payments.repository.PlasticaColorRepository;
import it.pv.payments.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PlasticaColorRepository plasticaColorRepository;
    private final PricingService pricingService;
    private final FileStorageService fileStorageService;
    private final org.springframework.context.ApplicationEventPublisher events;

    public OrderService(OrderRepository orderRepository, UserRepository userRepository,
                         PlasticaColorRepository plasticaColorRepository, PricingService pricingService,
                         FileStorageService fileStorageService,
                         org.springframework.context.ApplicationEventPublisher events) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.plasticaColorRepository = plasticaColorRepository;
        this.pricingService = pricingService;
        this.fileStorageService = fileStorageService;
        this.events = events;
    }

    @Transactional
    public OrderResponse createOrder(String userId, CreateOrderRequest req) {
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utente non trovato"));

        var existing = orderRepository.findByRequestId(req.requestId());
        if (existing.isPresent()) {
            if (!existing.get().getUser().getId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Identificativo richiesta gia' utilizzato");
            }
            return toResponse(existing.get());
        }
        if (req.paypalCaptureId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Il pagamento deve essere confermato dal server");
        }
        if (req.files() == null || req.files().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nessun file caricato");
        }

        OrderValidation.validate(req);
        if (req.numeroPDF() != req.files().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numero PDF incoerente");
        }
        if (req.files().stream().map(FileInput::storagePath).distinct().count() != req.files().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File duplicati");
        }
        // pagine reali contate server-side alla fine dell'upload (FileStorageService.completeUpload) e
        // salvate sulla UploadSession: il client non puo' dichiararle, e non serve riparsare qui il PDF.
        List<Integer> pagesPerFile = req.files().stream()
                .map(f -> {
                    Integer pages = fileStorageService.requireOwnedFile(f.storagePath(), userId).getPageCount();
                    if (pages == null) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Upload non completo, ricarica il file");
                    }
                    return pages;
                })
                .toList();
        long pageCount = pagesPerFile.stream().mapToLong(Integer::longValue).sum();
        if (pageCount <= 0 || pageCount * req.numeroCopie() > 10_000_000L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantita' di stampa troppo elevata");
        }
        int realTotalPages = Math.toIntExact(pageCount);

        Order order = new Order();
        order.setUser(user);
        order.setRequestId(req.requestId());
        order.setTipo(req.tipo());
        order.setNome(user.getDisplayName());
        order.setCognome(user.getCognome());
        order.setEmail(user.getEmail());
        order.setTelefono(user.getTelefono());
        order.setCorsoLaurea(user.getCorsoLaurea());
        order.setAnnoAccademico(user.getAnnoAccademico());
        order.setNumeroPDF(req.numeroPDF());
        order.setNumeroCopie(req.numeroCopie());
        order.setColore(req.colore());
        order.setPagina(req.pagina());
        order.setInchiostro(req.inchiostro());
        order.setLayout(req.layout());
        order.setRilegatura(req.rilegatura());
        order.setRilegaturaUnica(req.rilegaturaUnica());
        order.setGrammatura(req.grammatura());
        order.setPlastificazione(req.plastificazione());

        BigDecimal baseLordo;
        int nFogli;
        int nFogliPerCopia;
        int fascicoli;

        boolean rilegaturaUnicaA4 = "A4".equalsIgnoreCase(req.tipo())
                && (req.numeroPDF() == 1 || "SI".equalsIgnoreCase(req.rilegaturaUnica()));
        boolean rilegaturaSeparata = "A4".equalsIgnoreCase(req.tipo()) && !rilegaturaUnicaA4;

        List<FileEffective> effectiveFiles = null;

        if (rilegaturaSeparata) {
            effectiveFiles = buildEffectiveFiles(req, pagesPerFile);
            var cfg = pricingService.getConfigA4();

            List<PricingService.PerFileConfig> perFileConfigs = new ArrayList<>();
            for (FileEffective f : effectiveFiles) {
                BigDecimal plasticaExtra = null;
                String rUpper = f.rilegatura() == null ? "" : f.rilegatura().toUpperCase();
                if (!rUpper.equals("CIAPPATURA") && !rUpper.equals("NESSUNA") && f.plasticaId() != null) {
                    plasticaExtra = plasticaPrice(f.plasticaId());
                }
                perFileConfigs.add(new PricingService.PerFileConfig(f.pages(), f.inchiostro(), f.pagina(), f.layout(),
                        f.rilegatura(), plasticaExtra, f.numeroCopie(), f.rangeAll(), f.rangeFrom(), f.rangeTo()));
            }

            var result = pricingService.computeBaseLordoA4Separata(cfg, perFileConfigs);
            baseLordo = result.baseLordo();
            nFogliPerCopia = result.nFogliPerCopiaTotale();
            nFogli = result.nFogli();
            fascicoli = result.fascicoli();

            // non esiste piu' un unico valore condiviso: l'ordine mostra un riepilogo "File N: valore"
            // per ciascuna impostazione, il dettaglio autorevole resta sui singoli OrderFile
            order.setColore(joinPerFile(effectiveFiles, f -> labelColore(f.inchiostro())));
            order.setPagina(joinPerFile(effectiveFiles, FileEffective::pagina));
            order.setInchiostro(joinPerFile(effectiveFiles, FileEffective::inchiostro));
            order.setLayout(joinPerFile(effectiveFiles, FileEffective::layout));
            order.setRilegatura(joinPerFile(effectiveFiles, FileEffective::rilegatura));
            order.setPagine(joinPerFile(effectiveFiles, f -> f.rangeAll() ? "Tutte" : f.rangeFrom() + "-" + f.rangeTo()));
            order.setNumeroCopie(effectiveFiles.stream().mapToInt(FileEffective::numeroCopie).sum());

            BigDecimal plasticaExtraTotale = BigDecimal.ZERO;
            for (int i = 0; i < effectiveFiles.size(); i++) {
                BigDecimal extra = perFileConfigs.get(i).plasticaExtra();
                if (extra != null && extra.signum() > 0) {
                    plasticaExtraTotale = plasticaExtraTotale.add(extra.multiply(BigDecimal.valueOf(effectiveFiles.get(i).numeroCopie())));
                }
            }
            order.setPlasticaExtraPerCopia(null);
            order.setPlasticaExtraTotale(plasticaExtraTotale.signum() > 0 ? plasticaExtraTotale : null);
        } else if ("A4".equalsIgnoreCase(req.tipo())) {
            var geo = pricingService.computeGeometryA4(realTotalPages, req.rangeAll(), req.rangeFrom(), req.rangeTo(),
                    req.pagina(), req.layout(), req.numeroCopie(), req.rilegaturaUnica(), req.numeroPDF(), pagesPerFile);
            BigDecimal extraPlasticaPerCopia = computeExtraPlasticaPerCopiaA4(req);
            var cfg = pricingService.getConfigA4();
            List<String> rilegaturaPerFile = req.files().stream().map(FileInput::rilegatura).toList();
            baseLordo = pricingService.computeBaseLordoA4(cfg, geo, req.numeroCopie(), req.numeroPDF(),
                    req.inchiostro(), req.pagina(), req.rilegatura(), req.rilegaturaUnica(), rilegaturaPerFile, extraPlasticaPerCopia);
            nFogliPerCopia = geo.fogliPerCopia();
            nFogli = geo.fogliPerCopia() * req.numeroCopie();
            fascicoli = geo.fascicoli();
            order.setPagine(req.rangeAll() ? "Tutte" : req.rangeFrom() + "-" + req.rangeTo());

            applyPlasticaSingle(order, req);
            order.setPlasticaExtraPerCopia(extraPlasticaPerCopia);
            order.setPlasticaExtraTotale(extraPlasticaPerCopia == null ? null
                    : extraPlasticaPerCopia.multiply(BigDecimal.valueOf(req.numeroCopie())));
        } else if ("A3".equalsIgnoreCase(req.tipo())) {
            int fogli = pricingService.computeGeometryA3Fogli(realTotalPages, req.rangeAll(), req.rangeFrom(), req.rangeTo(), req.pagina());
            int pagineSel = req.rangeAll() ? realTotalPages : (req.rangeTo() - req.rangeFrom() + 1);
            var cfg = pricingService.getConfigA3();
            baseLordo = pricingService.computeBaseLordoA3(cfg, fogli, pagineSel, req.numeroCopie(),
                    req.grammatura(), req.inchiostro(), req.pagina(), req.plastificazione());
            nFogliPerCopia = fogli;
            nFogli = fogli * req.numeroCopie();
            fascicoli = Math.max(1, req.numeroCopie());
            order.setPagine(req.rangeAll() ? "Tutte" : req.rangeFrom() + "-" + req.rangeTo());
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo ordine non valido");
        }

        order.setNFogli(nFogli);
        order.setNFogliPerCopia(nFogliPerCopia);
        order.setFascicoli(fascicoli);

        boolean isStudentDelivery = Boolean.TRUE.equals(req.isStudent());
        var totals = pricingService.computeTotals(baseLordo, req.numeroPDF(), user, isStudentDelivery, req.metodoPagamento());

        order.setPrezzoLordo(totals.baseLordo());
        order.setScontoGenerale(totals.scontoGenerale());
        order.setScontoStudenti(totals.scontoStudenti());
        order.setImponibile(totals.imponibile());
        order.setIva(totals.iva());
        order.setTrasporto(totals.trasporto());
        order.setPaypalFee(totals.paypalFee());
        order.setTotaleFinale(totals.totaleFinale());

        order.setMetodoPagamento("PAYPAL".equalsIgnoreCase(req.metodoPagamento()) ? "PayPal" : "Contanti");
        order.setStatoPagamento("PAYPAL".equalsIgnoreCase(req.metodoPagamento())
                ? "In attesa di pagamento"
                : "Da saldare alla consegna");

        order.setIsStudentDelivery(isStudentDelivery);
        if (req.delivery() != null) {
            order.setDeliveryDayLabel(req.delivery().dayLabel());
            order.setDeliveryTimeRange(req.delivery().timeRange());
            order.setDeliveryDateISO(req.delivery().dateISO());
            order.setDeliveryWeekday(req.delivery().weekday());
        }

        List<OrderFile> files = new ArrayList<>();
        for (int i = 0; i < req.files().size(); i++) {
            FileInput fi = req.files().get(i);
            OrderFile of = new OrderFile();
            of.setOrder(order);
            of.setFileIndex(i);
            of.setOriginalFileName(fi.originalFileName());
            of.setStoragePath(fi.storagePath());
            of.setPages(pagesPerFile.get(i));
            if ("A4".equalsIgnoreCase(req.tipo())) {
                if (rilegaturaSeparata) {
                    FileEffective f = effectiveFiles.get(i);
                    of.setRilegatura(f.rilegatura());
                    of.setInchiostro(f.inchiostro());
                    of.setPagina(f.pagina());
                    of.setLayout(f.layout());
                    of.setPagineLabel(f.rangeAll() ? "Tutte" : f.rangeFrom() + "-" + f.rangeTo());
                    of.setNumeroCopie(f.numeroCopie());
                    applyPlasticaToFile(of, fi.plasticaId());
                } else {
                    // rilegatura unica -> stessa configurazione dell'ordine per ogni file
                    of.setRilegatura(req.rilegatura());
                    of.setInchiostro(req.inchiostro());
                    of.setPagina(req.pagina());
                    of.setLayout(req.layout());
                    of.setPagineLabel(req.rangeAll() ? "Tutte" : req.rangeFrom() + "-" + req.rangeTo());
                    of.setNumeroCopie(req.numeroCopie());
                }
            }
            files.add(of);
        }
        order.setFiles(files);

        Order saved = orderRepository.save(order);
        if (!"PayPal".equals(saved.getMetodoPagamento())) events.publishEvent(new OrderReady(saved.getId()));
        return toResponse(saved);
    }

    /** Impostazioni effettive di un file quando la rilegatura e' separata: valore scelto per quel file, o il valore top-level come fallback. */
    private record FileEffective(int pages, String inchiostro, String pagina, String layout, String rilegatura,
                                  boolean rangeAll, Integer rangeFrom, Integer rangeTo, int numeroCopie, Long plasticaId) {}

    private List<FileEffective> buildEffectiveFiles(CreateOrderRequest req, List<Integer> pagesPerFile) {
        List<FileEffective> result = new ArrayList<>();
        for (int i = 0; i < req.files().size(); i++) {
            FileInput fi = req.files().get(i);
            result.add(new FileEffective(
                    pagesPerFile.get(i),
                    fi.inchiostro() != null ? fi.inchiostro() : req.inchiostro(),
                    fi.pagina() != null ? fi.pagina() : req.pagina(),
                    fi.layout() != null ? fi.layout() : req.layout(),
                    fi.rilegatura() != null ? fi.rilegatura() : req.rilegatura(),
                    fi.rangeAll() == null || fi.rangeAll(),
                    fi.rangeFrom(), fi.rangeTo(),
                    fi.numeroCopie() != null ? fi.numeroCopie() : req.numeroCopie(),
                    fi.plasticaId()));
        }
        return result;
    }

    private String labelColore(String inchiostro) {
        return "biancoenero".equalsIgnoreCase(inchiostro) ? "Bianco e nero" : "Colore";
    }

    private String joinPerFile(List<FileEffective> files, java.util.function.Function<FileEffective, String> extractor) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < files.size(); i++) {
            if (i > 0) sb.append(" • ");
            sb.append("File ").append(i + 1).append(": ").append(extractor.apply(files.get(i)));
        }
        return sb.toString();
    }

    private BigDecimal plasticaPrice(Long id) {
        return plasticaColorRepository.findById(id).filter(PlasticaColor::isEnabled).map(PlasticaColor::getPriceEuro)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plastica non disponibile"));
    }

    private BigDecimal computeExtraPlasticaPerCopiaA4(CreateOrderRequest req) {
        if (!"A4".equalsIgnoreCase(req.tipo())) return null;

        boolean unica = req.numeroPDF() == 1 || "SI".equalsIgnoreCase(req.rilegaturaUnica());

        if (unica) {
            String rilegatura = req.rilegatura() == null ? "" : req.rilegatura().toUpperCase();
            if (rilegatura.equals("CIAPPATURA") || rilegatura.equals("NESSUNA")) return null;
            if (req.plasticaId() == null) return null;
            return plasticaPrice(req.plasticaId());
        }

        if (req.files() == null) return null;
        BigDecimal sum = BigDecimal.ZERO;
        for (FileInput fi : req.files()) {
            if (fi.plasticaId() == null) continue;

            // ogni file ha la propria rilegatura: niente plastica se quel file e' Ciappatura/Nessuna
            String fileRilegatura = fi.rilegatura() == null ? "" : fi.rilegatura().toUpperCase();
            if (fileRilegatura.equals("CIAPPATURA") || fileRilegatura.equals("NESSUNA")) continue;

            sum = sum.add(plasticaColorRepository.findById(fi.plasticaId()).map(PlasticaColor::getPriceEuro).orElse(BigDecimal.ZERO));
        }
        return sum;
    }

    private void applyPlasticaSingle(Order order, CreateOrderRequest req) {
        if (req.plasticaId() == null) return;
        plasticaColorRepository.findById(req.plasticaId()).ifPresent(p -> {
            order.setPlasticaId(p.getId());
            order.setPlasticaName(p.getName());
            order.setPlasticaHex(p.getHex());
            order.setPlasticaExtraEuro(p.getPriceEuro());
        });
    }

    private void applyPlasticaToFile(OrderFile of, Long plasticaId) {
        if (plasticaId == null) return;
        plasticaColorRepository.findById(plasticaId).ifPresent(p -> {
            of.setPlasticaId(p.getId());
            of.setPlasticaName(p.getName());
            of.setPlasticaHex(p.getHex());
            of.setPlasticaExtraEuro(p.getPriceEuro());
        });
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listByTipo(String tipo) {
        return orderRepository.findByTipoOrderByTimestampDesc(tipo).stream().filter(this::isConfirmed).map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listMine(String userId) {
        return orderRepository.findByUser_IdOrderByTimestampDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void deleteOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordine non trovato"));
        if (order.getPaypalOrderId() != null && order.getPaypalCaptureId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Verificare il pagamento PayPal prima di eliminare l'ordine");
        }
        // I PDF sono rimossi dalla pulizia periodica solo quando nessun ordine li referenzia.
        orderRepository.delete(order);
    }

    @Transactional
    public OrderResponse applyManualAdjustment(String orderId, ManualAdjustmentRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordine non trovato"));
        order.setManualAdjustmentDelta(req.delta());
        order.setManualAdjustmentReason(req.reason());
        order.setManualAdjustmentUpdatedAt(java.time.Instant.now());
        return toResponse(orderRepository.save(order));
    }

    public boolean isConfirmed(Order order) {
        return !"PayPal".equals(order.getMetodoPagamento()) || "Pagato".equals(order.getStatoPagamento());
    }

    public OrderResponse toResponse(Order o) {
        List<OrderFileDto> fileDtos = o.getFiles().stream()
                .map(f -> new OrderFileDto(f.getId(), f.getFileIndex(), f.getOriginalFileName(), f.getPages(),
                        "/api/files/download/" + f.getId(), f.getPlasticaId(), f.getPlasticaName(),
                        f.getRilegatura(), f.getInchiostro(), f.getPagina(), f.getLayout(),
                        f.getPagineLabel(), f.getNumeroCopie()))
                .toList();
        return new OrderResponse(o.getId(), o.getTipo(), o.getNome(), o.getCognome(), o.getEmail(), o.getTelefono(),
                o.getNumeroPDF(), o.getNumeroCopie(), o.getPagine(), o.getColore(), o.getPagina(), o.getInchiostro(),
                o.getLayout(), o.getRilegatura(), o.getRilegaturaUnica(), o.getGrammatura(), o.getPlastificazione(),
                o.getDeliveryDayLabel(), o.getDeliveryTimeRange(), o.getDeliveryDateISO(),
                o.getMetodoPagamento(), o.getStatoPagamento(), o.getPrezzoLordo(), o.getScontoGenerale(),
                o.getScontoStudenti(), o.getImponibile(), o.getIva(), o.getTrasporto(), o.getPaypalFee(),
                o.getTotaleFinale(), o.getCostiInterni(), o.isFrozen(), o.getManualAdjustmentDelta(),
                o.getManualAdjustmentReason(), o.getTimestamp(), fileDtos);
    }

    public Optional<Order> findEntity(String id) {
        return orderRepository.findById(id);
    }
}
