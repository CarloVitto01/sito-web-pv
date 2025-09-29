package it.pv.payments.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record CheckoutRequest(
    @NotBlank String product,
    @NotBlank String returnUrl,
    Map<String, Object> features
) {}
