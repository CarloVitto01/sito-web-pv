package it.pv.payments.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.pv.payments.domain.*;
import it.pv.payments.paypal.PaypalService;
import it.pv.payments.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CheckoutServiceTest {
    OrderRepository orders = mock(OrderRepository.class);
    PaypalService paypal = mock(PaypalService.class);
    ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    CheckoutService service = new CheckoutService(orders, paypal, events);
    Order order;
    @BeforeEach void setup() {
        User user = new User(); user.setId("owner");
        order = new Order(); order.setId("local"); order.setUser(user);
        order.setMetodoPagamento("PayPal"); order.setTotaleFinale(new BigDecimal("12.50"));
        when(orders.findLockedById("local")).thenReturn(Optional.of(order));
    }
    private com.fasterxml.jackson.databind.JsonNode response(String amount, String status) throws Exception {
        return new ObjectMapper().readTree("""
          {"id":"remote","status":"%s","purchase_units":[{"custom_id":"local",
            "amount":{"currency_code":"EUR","value":"%s"},
            "payments":{"captures":[{"id":"capture","status":"COMPLETED",
            "amount":{"currency_code":"EUR","value":"%s"}}]}}]}
          """.formatted(status, amount, amount));
    }
    @Test void usesServerTotalAndReusesCreatedOrder() {
        when(paypal.createOrder("local", new BigDecimal("12.50"))).thenReturn("remote");
        assertEquals("remote", service.create("local", "owner").get("orderId"));
        service.create("local", "owner");
        verify(paypal, times(1)).createOrder("local", new BigDecimal("12.50"));
    }
    @Test void rejectsOtherUserBeforeCallingPaypal() {
        assertThrows(ResponseStatusException.class, () -> service.create("local", "attacker"));
        verifyNoInteractions(paypal);
    }
    @Test void rejectsUnrelatedPayment() {
        order.setPaypalOrderId("remote");
        assertThrows(ResponseStatusException.class, () -> service.capture("local", "owner", "other"));
        verifyNoInteractions(paypal);
    }
    @Test void rejectsUnderpayment() throws Exception {
        order.setPaypalOrderId("remote");
        when(paypal.getOrder("remote")).thenReturn(response("0.01", "COMPLETED"));
        assertThrows(ResponseStatusException.class, () -> service.capture("local", "owner", "remote"));
        assertNull(order.getPaypalCaptureId()); verifyNoInteractions(events);
    }
    @Test void recoversCapturedPaymentAndDoesNotChargeTwice() throws Exception {
        order.setPaypalOrderId("remote");
        when(paypal.getOrder("remote")).thenReturn(response("12.50", "COMPLETED"));
        service.capture("local", "owner", "remote");
        service.capture("local", "owner", "remote");
        assertEquals("Pagato", order.getStatoPagamento());
        verify(paypal, never()).captureOrder(anyString(), anyString());
        verify(events, times(1)).publishEvent(new OrderReady("local"));
    }
    @Test void capturesApprovedOrderThenVerifiesRemoteResult() throws Exception {
        order.setPaypalOrderId("remote");
        when(paypal.getOrder("remote")).thenReturn(response("12.50", "APPROVED"), response("12.50", "COMPLETED"));
        service.capture("local", "owner", "remote");
        verify(paypal).captureOrder(eq("remote"), anyString());
        assertEquals("capture", order.getPaypalCaptureId());
    }
    @Test void rejectsWrongCurrency() throws Exception {
        order.setPaypalOrderId("remote");
        var remote = response("12.50", "COMPLETED");
        ((com.fasterxml.jackson.databind.node.ObjectNode)remote.path("purchase_units").path(0).path("amount")).put("currency_code", "USD");
        when(paypal.getOrder("remote")).thenReturn(remote);
        assertThrows(ResponseStatusException.class, () -> service.capture("local", "owner", "remote"));
    }
}
