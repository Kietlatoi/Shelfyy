package org.example.shelfy.service;

import org.example.shelfy.dto.response.PaymentUrlResponse;

import java.util.Map;

public interface PaymentService {

    /** Tạo giao dịch PENDING + trả về URL redirect sang cổng thanh toán VNPay. */
    PaymentUrlResponse createVnpayPayment(Long userId, String planType, String clientIp);

    /**
     * Xử lý khi VNPay redirect trình duyệt người dùng về (return URL).
     * Trả về URL đầy đủ để redirect tiếp về FE, kèm query báo kết quả.
     */
    String handleVnpayReturn(Map<String, String> params);

    /**
     * Xử lý IPN (server-to-server) từ VNPay. Trả về map theo đúng format
     * VNPay yêu cầu: {"RspCode": "...", "Message": "..."}.
     */
    Map<String, String> handleVnpayIpn(Map<String, String> params);
}
