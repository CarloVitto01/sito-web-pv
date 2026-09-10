package it.pv.payments.web;

import it.pv.payments.dto.OrderDtos.ManualAdjustmentRequest;
import it.pv.payments.dto.OrderDtos.OrderResponse;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.service.OrderService;
import it.pv.payments.service.StoricoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/storico")
public class StoricoController {

    private final StoricoService storicoService;
    private final OrderService orderService;
    private final AccessGuard accessGuard;

    public StoricoController(StoricoService storicoService, OrderService orderService, AccessGuard accessGuard) {
        this.storicoService = storicoService;
        this.orderService = orderService;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    public List<OrderResponse> list() {
        accessGuard.requirePage("storicoDati");
        return storicoService.listAllResponses();
    }

    @PostMapping("/{id}/freeze")
    public OrderResponse freeze(@PathVariable String id) {
        accessGuard.requirePage("storicoDati");
        return storicoService.freezeWithBreakdown(id);
    }

    @PatchMapping("/{id}/manual-adjustment")
    public OrderResponse manualAdjustment(@PathVariable String id, @RequestBody ManualAdjustmentRequest req) {
        accessGuard.requirePage("storicoDati");
        return orderService.applyManualAdjustment(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        accessGuard.requirePage("storicoDati");
        orderService.deleteOrder(id);
    }
}
