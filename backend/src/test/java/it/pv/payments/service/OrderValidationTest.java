package it.pv.payments.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import it.pv.payments.dto.OrderDtos.CreateOrderRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class OrderValidationTest {
    ObjectMapper mapper = new ObjectMapper();
    private ObjectNode valid() throws Exception {
        return (ObjectNode) mapper.readTree("""
          {"tipo":"A4","files":[{"storagePath":"PDF/user/file.pdf","originalFileName":"file.pdf"}],
           "numeroPDF":1,"numeroCopie":1,"rangeAll":true,"inchiostro":"biancoenero","pagina":"Fronte",
           "layout":"Verticale","rilegatura":"Nessuna","rilegaturaUnica":"SI","metodoPagamento":"CASH"}
          """);
    }
    @Test void acceptsNormalOrderAndRejectsNegativeCopiesOrUnknownOptions() throws Exception {
        ObjectNode request = valid(); OrderValidation.validate(mapper.treeToValue(request, CreateOrderRequest.class));
        request.put("numeroCopie", -1);
        assertThrows(ResponseStatusException.class, () -> OrderValidation.validate(mapper.treeToValue(request, CreateOrderRequest.class)));
        request.put("numeroCopie", 1); request.put("rilegatura", "gratis");
        assertThrows(ResponseStatusException.class, () -> OrderValidation.validate(mapper.treeToValue(request, CreateOrderRequest.class)));
    }
    @Test void rejectsInconsistentDelivery() throws Exception {
        ObjectNode request = valid(); request.put("isStudent", true);
        assertThrows(ResponseStatusException.class, () -> OrderValidation.validate(mapper.treeToValue(request, CreateOrderRequest.class)));
    }
}
