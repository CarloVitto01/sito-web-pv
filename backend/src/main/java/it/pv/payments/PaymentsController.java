package it.pv.payments;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;

import it.pv.payments.dto.CheckoutRequest;

@RestController
@RequestMapping("/api/payments")
public class PaymentsController {

  @Value("${stripe.secret-key}")
  private String stripeKey;
  @Value("${qr.price-eur}")
  private Long priceEur;
  @Value("${qr.product-name}")
  private String productName;
  @Value("${qr.automatic-tax:false}")
  private boolean automaticTaxEnabled;

  @PostMapping("/checkout")
  public ResponseEntity<?> checkout(@RequestBody CheckoutRequest req) {
    try {
      Stripe.apiKey = stripeKey;

      String successUrl = req.returnUrl() + "?paid=1&session_id={CHECKOUT_SESSION_ID}";
      String cancelUrl = req.returnUrl() + "?canceled=1";

      SessionCreateParams.LineItem.PriceData.ProductData productData = SessionCreateParams.LineItem.PriceData.ProductData
          .builder()
          .setName(productName).build();

      SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData.builder()
          .setCurrency("eur").setUnitAmount(priceEur).setProductData(productData).build();

      SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
          .setQuantity(1L).setPriceData(priceData).build();

      SessionCreateParams.Builder builder = SessionCreateParams.builder()
          .setMode(SessionCreateParams.Mode.PAYMENT)
          .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
          .addLineItem(lineItem)
          .setSuccessUrl(successUrl)
          .setCancelUrl(cancelUrl)
          .putMetadata("product", req.product());

      if (automaticTaxEnabled) {
        builder.setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(true).build());
      }

      Session session = Session.create(builder.build());
      Map<String, Object> resp = new HashMap<>();
      resp.put("url", session.getUrl());
      return ResponseEntity.ok(resp);

    } catch (StripeException e) {
      return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
  }
}
