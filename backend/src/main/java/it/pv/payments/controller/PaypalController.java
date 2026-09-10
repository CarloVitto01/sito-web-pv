package it.pv.payments.controller;

import it.pv.payments.security.CurrentUser;
import it.pv.payments.service.CheckoutService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/paypal")
public class PaypalController {
    private final CheckoutService checkout;
    public PaypalController(CheckoutService checkout) { this.checkout = checkout; }
    public record CreateRequest(@NotBlank String localOrderId) {}
    public record CaptureRequest(@NotBlank String localOrderId, @NotBlank String orderId) {}
    @PostMapping("/create-order")
    public Map<String, String> create(@Valid @RequestBody CreateRequest body) {
        return checkout.create(body.localOrderId(), CurrentUser.get().userId());
    }
    @PostMapping("/reconcile/{id}")
    public Map<String, String> reconcile(@PathVariable String id) {
        return checkout.reconcile(id, CurrentUser.get().userId());
    }
    @PostMapping("/capture-order")
    public Map<String, String> capture(@Valid @RequestBody CaptureRequest body) {
        return checkout.capture(body.localOrderId(), CurrentUser.get().userId(), body.orderId());
    }
}
