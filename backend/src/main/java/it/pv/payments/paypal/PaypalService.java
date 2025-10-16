// src/main/java/it/pv/payments/paypal/PaypalService.java
package it.pv.payments.paypal;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class PaypalService {
  @Value("${paypal.base-url:https://api-m.paypal.com}") String baseUrl;
  @Value("${paypal.clientId}") String clientId;
  @Value("${paypal.clientSecret}") String clientSecret;

  private final RestTemplate http = new RestTemplate();

  private String token() {
    var h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    h.setBasicAuth(clientId, clientSecret);
    var form = new LinkedMultiValueMap<String,String>();
    form.add("grant_type","client_credentials");
    var r = http.exchange(baseUrl+"/v1/oauth2/token", HttpMethod.POST, new HttpEntity<>(form,h), Map.class);
    return String.valueOf(r.getBody().get("access_token"));
  }

  public String createOrder(String amount, String currency) {
    var h = new HttpHeaders(); h.setBearerAuth(token()); h.setContentType(MediaType.APPLICATION_JSON);
    var body = Map.of(
      "intent","CAPTURE",
      "purchase_units", List.of(Map.of(
        "amount", Map.of("currency_code", currency, "value", amount)
      ))
    );
    var r = http.exchange(baseUrl+"/v2/checkout/orders", HttpMethod.POST, new HttpEntity<>(body,h), Map.class);
    return String.valueOf(r.getBody().get("id"));
  }

  public Map<String,Object> captureOrder(String orderId) {
    var h = new HttpHeaders(); h.setBearerAuth(token()); h.setContentType(MediaType.APPLICATION_JSON);
    var r = http.exchange(baseUrl+"/v2/checkout/orders/"+orderId+"/capture", HttpMethod.POST, new HttpEntity<>(Map.of(),h), Map.class);
    return r.getBody();
  }
}
