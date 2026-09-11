package it.pv.payments.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.pv.payments.domain.Order;
import it.pv.payments.domain.User;
import it.pv.payments.dto.OrderDtos.CreateOrderRequest;
import it.pv.payments.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderServiceTest {
    OrderRepository orders = mock(OrderRepository.class);
    UserRepository users = mock(UserRepository.class);
    FileStorageService storage = mock(FileStorageService.class);
    OrderService service = new OrderService(orders, users, mock(PlasticaColorRepository.class),
            mock(PricingService.class), storage, mock(ApplicationEventPublisher.class));
    User owner() { User user = new User(); user.setId("owner"); when(users.findLockedById("owner")).thenReturn(Optional.of(user)); return user; }
    @Test void clientCannotMarkAnOrderPaid() throws Exception {
        owner();
        var request = new ObjectMapper().readValue("{\"requestId\":\"request\",\"paypalCaptureId\":\"forged\"}", CreateOrderRequest.class);
        assertThrows(ResponseStatusException.class, () -> service.createOrder("owner", request));
        verify(orders, never()).save(any()); verifyNoInteractions(storage);
    }
    @Test void retryReturnsSavedOrderWithoutDuplicatingUploadsOrOrder() throws Exception {
        User user = owner(); Order existing = new Order(); existing.setId("existing"); existing.setUser(user);
        when(orders.findByRequestId("request")).thenReturn(Optional.of(existing));
        var request = new ObjectMapper().readValue("{\"requestId\":\"request\"}", CreateOrderRequest.class);
        assertEquals("existing", service.createOrder("owner", request).id());
        verify(orders, never()).save(any()); verifyNoInteractions(storage);
    }
}
