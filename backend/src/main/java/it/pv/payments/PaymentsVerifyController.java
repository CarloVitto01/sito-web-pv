package it.pv.payments;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentsVerifyController {

  @Value("${stripe.secret-key}") private String stripeKey;

  @GetMapping("/verify")
  public ResponseEntity<?> verify(@RequestParam("session_id") String sessionId) {
    try {
      Stripe.apiKey = stripeKey;
      Session s = Session.retrieve(sessionId);
      boolean paid = "complete".equalsIgnoreCase(s.getStatus())
          && "paid".equalsIgnoreCase(s.getPaymentStatus());
      return ResponseEntity.ok(Map.of("paid", paid));
    } catch (StripeException e) {
      return ResponseEntity.status(500).body(Map.of("paid", false, "error", e.getMessage()));
    }
  }
}
