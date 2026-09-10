package it.pv.payments.service;

import it.pv.payments.repository.OrderRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OrderNotificationListener {
    private final OrderRepository orders;
    private final TelegramNotifier notifier;
    public OrderNotificationListener(OrderRepository orders, TelegramNotifier notifier) {
        this.orders = orders; this.notifier = notifier;
    }
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onOrderReady(OrderReady event) {
        try {
            orders.findById(event.orderId()).ifPresent(notifier::notifyNewOrder);
        } catch (Exception ex) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Notifica ordine {} non inviata", event.orderId());
        }
    }
}
