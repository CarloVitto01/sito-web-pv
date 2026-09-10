package it.pv.payments.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaypalService {
    private final String baseUrl;
    private final String clientId;
    private final String clientSecret;
    private final RestTemplate http;
    public PaypalService(@Value("${paypal.base-url}") String baseUrl,
                         @Value("${paypal.clientId:}") String clientId,
                         @Value("${paypal.clientSecret:}") String clientSecret,
                         RestTemplateBuilder builder) {
        this.baseUrl = baseUrl; this.clientId = clientId; this.clientSecret = clientSecret;
        http = builder.setConnectTimeout(Duration.ofSeconds(10)).setReadTimeout(Duration.ofSeconds(30)).build();
    }
    private HttpHeaders headers() {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "PayPal non configurato");
        }
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(clientId, clientSecret);
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "client_credentials");
        JsonNode token = http.postForObject(baseUrl + "/v1/oauth2/token", new HttpEntity<>(form, headers), JsonNode.class);
        if (token == null || token.path("access_token").asText().isBlank()) throw invalidResponse();
        headers = new HttpHeaders();
        headers.setBearerAuth(token.path("access_token").asText());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Prefer", "return=representation");
        return headers;
    }
    public String createOrder(String localOrderId, BigDecimal amount) {
        var headers = headers();
        headers.set("PayPal-Request-Id", localOrderId);
        var body = Map.of("intent", "CAPTURE", "purchase_units", List.of(Map.of(
                "custom_id", localOrderId, "amount", Map.of("currency_code", "EUR", "value", amount.toPlainString()))));
        JsonNode result = http.postForObject(baseUrl + "/v2/checkout/orders", new HttpEntity<>(body, headers), JsonNode.class);
        if (result == null || result.path("id").asText().isBlank()) throw invalidResponse();
        return result.path("id").asText();
    }
    public JsonNode getOrder(String orderId) {
        return http.exchange(baseUrl + "/v2/checkout/orders/{id}", HttpMethod.GET,
                new HttpEntity<>(headers()), JsonNode.class, orderId).getBody();
    }
    public JsonNode captureOrder(String orderId, String requestId) {
        var headers = headers();
        headers.set("PayPal-Request-Id", requestId);
        return http.postForObject(baseUrl + "/v2/checkout/orders/{id}/capture",
                new HttpEntity<>(Map.of(), headers), JsonNode.class, orderId);
    }
    private ResponseStatusException invalidResponse() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Risposta PayPal non valida");
    }
}
