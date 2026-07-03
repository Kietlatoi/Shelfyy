package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentUrlResponse {
    private String paymentUrl;
    private String transactionCode;
}
