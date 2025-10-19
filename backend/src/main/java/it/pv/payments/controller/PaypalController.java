package it.pv.payments.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import it.pv.payments.paypal.PaypalService;

@RestController
@RequestMapping("/api/paypal")
public class PaypalController {
  private final PaypalService paypal;
  public PaypalController(PaypalService paypal) { this.paypal = paypal; }

  @PostMapping("/create-order")
  public Map<String, Object> create(@RequestBody Map<String,Object> body) {
    String amount = String.valueOf(body.getOrDefault("amount","0.00"));
    String currency = String.valueOf(body.getOrDefault("currency","EUR"));
    String orderId = paypal.createOrder(amount, currency);
    return Map.of("orderId", orderId);
  }

  @PostMapping("/capture-order")
  public Map<String, Object> capture(@RequestBody Map<String,String> body) {
    String orderId = body.get("orderId");
    var cap = paypal.captureOrder(orderId); // ritorna mappa col payload PayPal
    // estrazioni minime
    String status = String.valueOf(cap.getOrDefault("status",""));
    String captureId = "";
    String payerEmail = "";
    String amount = "";

    try {
      var purchaseUnits = (List<Map<String,Object>>) cap.get("purchase_units");
      var payments = (Map<String,Object>) purchaseUnits.get(0).get("payments");
      var captures = (List<Map<String,Object>>) payments.get("captures");
      var c0 = captures.get(0);
      captureId = String.valueOf(c0.get("id"));
      var amt = (Map<String,Object>) c0.get("amount");
      amount = String.valueOf(amt.get("value"));
      var payer = (Map<String,Object>) cap.get("payer");
      var payerEmailObj = payer.get("email_address");
      payerEmail = payerEmailObj == null ? "" : String.valueOf(payerEmailObj);
    } catch (Exception ignore) {}

    return Map.of(
      "status", status,
      "orderId", orderId,
      "captureId", captureId,
      "payerEmail", payerEmail,
      "amount", amount
    );
  }
}
