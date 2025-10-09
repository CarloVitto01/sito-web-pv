package it.pv.payments.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PaypalConfig {
  @Value("${paypal.clientId}") public String clientId;
  @Value("${paypal.clientSecret}") public String clientSecret;
  @Value("${paypal.baseUrl:https://api-m.paypal.com}") public String baseUrl; // sandbox: https://api-m.sandbox.paypal.com
}
