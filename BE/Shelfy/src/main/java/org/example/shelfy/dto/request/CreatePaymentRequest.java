package org.example.shelfy.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreatePaymentRequest {
    /** PRO | PREMIUM */
    @NotBlank
    private String planType;
}
