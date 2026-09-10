package it.pv.payments.service;

import com.fasterxml.jackson.databind.JsonNode;
import it.pv.payments.domain.Order;
import it.pv.payments.paypal.PaypalService;
import it.pv.payments.repository.OrderRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CheckoutService {
    private final OrderRepository orders;
    private final PaypalService paypal;
    private final ApplicationEventPublisher events;
    public CheckoutService(OrderRepository orders, PaypalService paypal, ApplicationEventPublisher events) {
        this.orders = orders; this.paypal = paypal; this.events = events;
    }
    private Order ownedOrder(String id, String userId) {
        Order order = orders.findLockedById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!order.getUser().getId().equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (!"PayPal".equals(order.getMetodoPagamento()) || order.getTotaleFinale().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ordine non pagabile con PayPal");
        }
        return order;
    }
    @Transactional
    public Map<String, String> create(String id, String userId) {
        Order order = ownedOrder(id, userId);
        if (order.getPaypalCaptureId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ordine gia' pagato");
        if (order.getPaypalOrderId() == null) {
            order.setPaypalOrderId(paypal.createOrder(order.getId(), order.getTotaleFinale()));
            orders.saveAndFlush(order);
        }
        return Map.of("orderId", order.getPaypalOrderId());
    }
    @Transactional
    public Map<String, String> capture(String id, String userId, String paypalOrderId) {
        Order order = ownedOrder(id, userId);
        if (order.getPaypalOrderId() == null || !order.getPaypalOrderId().equals(paypalOrderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pagamento non associato all'ordine");
        }
        if (order.getPaypalCaptureId() == null) {
            // Recupera anche un incasso riuscito prima di una risposta persa o di un rollback locale.
            JsonNode remote = paypal.getOrder(paypalOrderId);
            verifyOrder(remote, order);
            if (!"COMPLETED".equals(remote.path("status").asText())) {
                String key = UUID.nameUUIDFromBytes(("capture:" + id).getBytes(StandardCharsets.UTF_8)).toString();
                paypal.captureOrder(paypalOrderId, key);
                remote = paypal.getOrder(paypalOrderId);
                verifyOrder(remote, order);
            }
            JsonNode captures = remote.path("purchase_units").path(0).path("payments").path("captures");
            if (!"COMPLETED".equals(remote.path("status").asText()) || captures.size() != 1
                    || !"COMPLETED".equals(captures.path(0).path("status").asText())
                    || captures.path(0).path("id").asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Pagamento non ancora completato");
            }
            verifyAmount(captures.path(0).path("amount"), order.getTotaleFinale());
            order.setPaypalCaptureId(captures.path(0).path("id").asText());
            order.setStatoPagamento("Pagato");
            orders.saveAndFlush(order);
            events.publishEvent(new OrderReady(id));
        }
        return Map.of("status", "COMPLETED", "orderId", paypalOrderId,
                "captureId", order.getPaypalCaptureId(), "amount", order.getTotaleFinale().toPlainString());
    }
    @Transactional
    public Map<String, String> reconcile(String id, String userId) {
        Order order = ownedOrder(id, userId);
        if (order.getPaypalOrderId() == null) return Map.of("status", "PENDING");
        if (order.getPaypalCaptureId() != null) return Map.of("status", "COMPLETED");
        JsonNode remote = paypal.getOrder(order.getPaypalOrderId());
        verifyOrder(remote, order);
        if ("COMPLETED".equals(remote.path("status").asText())) {
            return capture(id, userId, order.getPaypalOrderId());
        }
        return Map.of("status", "PENDING");
    }

    private void verifyOrder(JsonNode remote, Order order) {
        if (remote == null || !order.getPaypalOrderId().equals(remote.path("id").asText())
                || remote.path("purchase_units").size() != 1
                || !order.getId().equals(remote.path("purchase_units").path(0).path("custom_id").asText())) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ordine PayPal non valido");
        }
        verifyAmount(remote.path("purchase_units").path(0).path("amount"), order.getTotaleFinale());
    }
    private void verifyAmount(JsonNode amount, BigDecimal expected) {
        try {
            if ("EUR".equals(amount.path("currency_code").asText())
                    && new BigDecimal(amount.path("value").asText()).compareTo(expected) == 0) return;
        } catch (NumberFormatException ignored) { }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Importo o valuta PayPal non corrispondenti");
    }
}
