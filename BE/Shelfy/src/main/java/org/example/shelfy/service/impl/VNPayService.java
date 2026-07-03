package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.config.VNPayConfig;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Cài đặt thuật toán build URL thanh toán & verify chữ ký của VNPay Sandbox.
 * Tham khảo tài liệu chính thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Quy tắc ký (HMAC-SHA512):
 *  1. Gom tất cả tham số vnp_* (trừ vnp_SecureHash, vnp_SecureHashType).
 *  2. Sắp xếp theo tên tham số (alphabet).
 *  3. Nối thành chuỗi "key1=value1&key2=value2..." với value đã URL-encode.
 *  4. HMAC-SHA512(chuỗi trên, hashSecret) → vnp_SecureHash (hex, chữ thường).
 */
@Service
@RequiredArgsConstructor
public class VNPayService {

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private final VNPayConfig config;

    /**
     * Build URL redirect người dùng sang cổng thanh toán VNPay.
     *
     * @param txnRef      mã đơn hàng duy nhất (Payment.transactionCode)
     * @param amount      số tiền VND (KHÔNG nhân 100 — hàm này tự nhân theo quy định VNPay)
     * @param orderInfo   mô tả đơn hàng (không dấu, không ký tự đặc biệt quá mức)
     * @param clientIp    IP người dùng thực hiện giao dịch
     */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo, String clientIp) {
        SortedMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", config.getTmnCode());
        // VNPay yêu cầu số tiền * 100 (đơn vị nhỏ nhất, không có phần thập phân)
        params.put("vnp_Amount", amount.multiply(BigDecimal.valueOf(100)).toBigInteger().toString());
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        params.put("vnp_IpAddr", clientIp == null || clientIp.isBlank() ? "127.0.0.1" : clientIp);

        LocalDateTime now = LocalDateTime.now();
        params.put("vnp_CreateDate", now.format(VNP_DATE_FORMAT));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNP_DATE_FORMAT));

        String query = buildSignedQuery(params);
        return config.getPayUrl() + "?" + query;
    }

    /**
     * Kiểm tra chữ ký vnp_SecureHash trong dữ liệu VNPay trả về (return URL / IPN)
     * có khớp với dữ liệu hay không — chống giả mạo callback.
     */
    public boolean verifySignature(Map<String, String> allParams) {
        String receivedHash = allParams.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) return false;

        SortedMap<String, String> params = new TreeMap<>(allParams);
        params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");

        String hashData = buildHashData(params);
        String computedHash = hmacSHA512(config.getHashSecret(), hashData);
        return computedHash.equalsIgnoreCase(receivedHash);
    }

    /** Sinh mã đơn hàng (txnRef) duy nhất — VNPay yêu cầu unique trong ngày, dùng timestamp + random cho chắc. */
    public String generateTxnRef() {
        long ts = System.currentTimeMillis();
        int rnd = new SecureRandom().nextInt(9000) + 1000;
        return ts + "" + rnd;
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private String buildSignedQuery(SortedMap<String, String> params) {
        String hashData = buildHashData(params);
        String secureHash = hmacSHA512(config.getHashSecret(), hashData);

        StringBuilder query = new StringBuilder(hashData);
        query.append("&vnp_SecureHash=").append(secureHash);
        return query.toString();
    }

    /** Chuỗi "key=value&key=value" đã URL-encode, dùng chung cho cả build URL lẫn verify chữ ký. */
    private String buildHashData(SortedMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            if (!first) sb.append('&');
            sb.append(urlEncode(entry.getKey())).append('=').append(urlEncode(entry.getValue()));
            first = false;
        }
        return sb.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không tạo được chữ ký VNPay (HMAC-SHA512)", e);
        }
    }
}
