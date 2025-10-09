package it.pv.payments.controller;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import it.pv.payments.config.PaypalConfig;

@RestController
@RequestMapping("/api/paypal")
public class PaypalController {
  private final PaypalConfig cfg;
  private final RestTemplate http = new RestTemplate();
  private final ObjectMapper om = new ObjectMapper();

  public PaypalController(PaypalConfig cfg) {
    this.cfg = cfg;
  }

  private String getAccessToken() {
    String url = cfg.baseUrl + "/v1/oauth2/token";

    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    String basic = cfg.clientId + ":" + cfg.clientSecret;
    String basic64 = Base64.getEncoder().encodeToString(basic.getBytes(StandardCharsets.UTF_8));
    h.set("Authorization", "Basic " + basic64);

    MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
    body.add("grant_type", "client_credentials");

    ResponseEntity<JsonNode> res = http.postForEntity(url, new HttpEntity<>(body, h), JsonNode.class);
    return res.getBody().get("access_token").asText();
  }

  @PostMapping({"/create-order", "/create-order/"})
  public Map<String, String> createOrder(@RequestBody Map<String, String> payload) {
    String amount = payload.getOrDefault("amount", "0.00");
    String currency = payload.getOrDefault("currency", "EUR");

    String token = getAccessToken();
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    h.setBearerAuth(token);

    String url = cfg.baseUrl + "/v2/checkout/orders";
    String body = """
          {
            "intent":"CAPTURE",
            "purchase_units":[{"amount":{"currency_code":"%s","value":"%s"}}],
            "application_context":{
              "shipping_preference":"NO_SHIPPING",
              "landing_page":"LOGIN",
              "user_action":"PAY_NOW"
            }
          }
        """.formatted(currency, amount);

    ResponseEntity<JsonNode> res = http.postForEntity(url, new HttpEntity<>(body, h), JsonNode.class);
    String orderId = res.getBody().get("id").asText();
    return Map.of("orderId", orderId);
  }

  @PostMapping({"/capture-order", "/capture-order/"})
  public ResponseEntity<?> captureOrder(@RequestBody Map<String, String> payload) {
    String orderId = payload.get("orderId");
    String token = getAccessToken();

    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    h.setBearerAuth(token);

    String url = cfg.baseUrl + "/v2/checkout/orders/" + orderId + "/capture";
    ResponseEntity<JsonNode> res = http.postForEntity(url, new HttpEntity<>("{}", h), JsonNode.class);

    JsonNode root = res.getBody();
    String status = root.get("status").asText(); // atteso "COMPLETED"
    // estrazioni utili
    String amount = root.at("/purchase_units/0/payments/captures/0/amount/value").asText();
    String captureId = root.at("/purchase_units/0/payments/captures/0/id").asText();
    String payerEmail = root.at("/payer/email_address").asText();

    // Qui puoi fare ulteriori verifiche: importo, valuta, idempotenza, ecc.

    return ResponseEntity.ok(Map.of(
        "status", status,
        "orderId", orderId,
        "captureId", captureId,
        "payerEmail", payerEmail,
        "amount", amount));
  }
}
