package it.pv.payments.web;

import it.pv.payments.dto.OrderDtos.*;
import it.pv.payments.security.AccessGuard;
import it.pv.payments.security.CurrentUser;
import it.pv.payments.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final AccessGuard accessGuard;

    public OrderController(OrderService orderService, AccessGuard accessGuard) {
        this.orderService = orderService;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest req) {
        return orderService.createOrder(CurrentUser.get().userId(), req);
    }

    @GetMapping("/mine")
    public List<OrderResponse> mine() {
        return orderService.listMine(CurrentUser.get().userId());
    }

    @GetMapping("/a4")
    public List<OrderResponse> listA4() {
        accessGuard.requirePage("gestionaleA4");
        return orderService.listByTipo("A4");
    }

    @GetMapping("/a3")
    public List<OrderResponse> listA3() {
        accessGuard.requirePage("gestionaleA3");
        return orderService.listByTipo("A3");
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        var order = orderService.findEntity(id).orElseThrow();
        accessGuard.requirePage("A4".equalsIgnoreCase(order.getTipo()) ? "gestionaleA4" : "gestionaleA3");
        orderService.deleteOrder(id);
    }
}
