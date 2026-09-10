package it.pv.payments.service;

import it.pv.payments.domain.*;
import it.pv.payments.dto.ConfigDtos.InterniA4;
import it.pv.payments.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StoricoServiceTest {
    @Test void mixedFilesUseTheirOwnInkSidesBindingAndCopies() {
        ConfigService config = mock(ConfigService.class);
        when(config.getA4Interni()).thenReturn(new InterniA4(new BigDecimal("0.10"), new BigDecimal("0.05"),
                new BigDecimal("0.20"), BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
        when(config.getA4CostiAcquisto()).thenReturn(List.of());
        Order order = new Order(); order.setTipo("A4"); order.setNumeroPDF(2); order.setRilegaturaUnica("NO");
        OrderFile bw = file("biancoenero", "Fronte-retro", "Anelli", 4, 2);
        OrderFile color = file("colore", "Fronte", "Nessuna", 1, 1);
        order.setFiles(List.of(bw, color));
        var service = new StoricoService(mock(OrderRepository.class), config, mock(OrderService.class));
        // B/N: (2 fogli * (0.10 + 2*0.05) + 1 rilegatura) * 2 copie = 2.80; colore = 0.30.
        assertEquals(new BigDecimal("3.10"), service.computeCostiInterni(order));
    }
    private OrderFile file(String ink, String side, String binding, int pages, int copies) {
        OrderFile f = new OrderFile(); f.setInchiostro(ink); f.setPagina(side); f.setRilegatura(binding);
        f.setPages(pages); f.setNumeroCopie(copies); f.setPagineLabel("Tutte"); f.setLayout("Verticale"); return f;
    }
}
