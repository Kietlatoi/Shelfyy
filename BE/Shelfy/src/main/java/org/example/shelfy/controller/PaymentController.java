package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.CreatePaymentRequest;
import org.example.shelfy.dto.response.PaymentUrlResponse;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.PaymentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Tạo giao dịch VNPay, trả về URL để redirect người dùng sang cổng thanh toán")
    @PostMapping("/vnpay/create")
    public ResponseEntity<PaymentUrlResponse> createVnpayPayment(@Valid @RequestBody CreatePaymentRequest request,
                                                                   HttpServletRequest httpRequest) {
        Long userId = currentUserService.getCurrentUser().getUserId();
        String clientIp = extractClientIp(httpRequest);
        return ResponseEntity.ok(paymentService.createVnpayPayment(userId, request.getPlanType(), clientIp));
    }

    @Operation(summary = "VNPay redirect trình duyệt người dùng về đây sau khi thanh toán xong")
    @GetMapping("/vnpay/callback")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> allParams) {
        String redirectUrl = paymentService.handleVnpayReturn(allParams);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }

    @Operation(summary = "VNPay gọi server-to-server để xác nhận giao dịch (Instant Payment Notification)")
    @GetMapping("/vnpay/ipn")
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> allParams) {
        return ResponseEntity.ok(paymentService.handleVnpayIpn(allParams));
    }

    private String extractClientIp(HttpServletRequest request) {
        // nginx (xem FE/Shelfyy/Dockerfile) đã set X-Forwarded-For khi proxy /api/**
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
