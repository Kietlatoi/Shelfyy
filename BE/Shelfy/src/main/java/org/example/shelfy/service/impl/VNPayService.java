package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.shelfy.config.VNPayConfig;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Cài đặt thuật toán build URL thanh toán & verify chữ ký của VNPay Sandbox.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VNPayService {

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final VNPayConfig config;

    /**
     * Build URL redirect người dùng sang cổng thanh toán VNPay.
     */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo, String clientIp) {
        SortedMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", config.getTmnCode());
        params.put("vnp_Amount", amount.multiply(BigDecimal.valueOf(100)).toBigInteger().toString());
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        
        // FIX LỖI IPV6: Nếu IP trống hoặc là IPv6 Localhost (chứa dấu :), ép về IPv4 127.0.0.1 để VNPay không bị lệch chữ ký
        if (clientIp == null || clientIp.isBlank() || clientIp.contains(":") || clientIp.equals("0:0:0:0:0:0:0:1")) {
            params.put("vnp_IpAddr", "127.0.0.1");
        } else {
            params.put("vnp_IpAddr", clientIp);
        }

        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        String createDate = now.format(VNP_DATE_FORMAT);
        String expireDate = now.plusMinutes(15).format(VNP_DATE_FORMAT);

        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        String query = buildSignedQuery(params);
        return config.getPayUrl() + "?" + query;
    }

    /**
     * Kiểm tra chữ ký vnp_SecureHash trong dữ liệu VNPay trả về
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

    public String generateTxnRef() {
        long ts = System.currentTimeMillis();
        int rnd = new SecureRandom().nextInt(9000) + 1000;
        return ts + "" + rnd;
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private String buildSignedQuery(SortedMap<String, String> params) {
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            
            if (!first) {
                hashData.append('&');
                query.append('&');
            }
            
            // CHUẨN VNPAY 2.1.0: Chuỗi ký giữ nguyên KEY, chỉ urlEncode VALUE
            hashData.append(entry.getKey()).append('=').append(urlEncode(entry.getValue()));
            
            // Chuỗi URL: Mã hóa cả KEY và VALUE gửi đi trình duyệt
            query.append(urlEncode(entry.getKey())).append('=').append(urlEncode(entry.getValue()));
            
            first = false;
        }
        
        String secureHash = hmacSHA512(config.getHashSecret(), hashData.toString());
        log.info("[VNPay Debug] Chuỗi kết hợp ký (hashData): {}", hashData);
        log.info("[VNPay Debug] Chữ ký tạo ra (secureHash): {}", secureHash);
        
        query.append("&vnp_SecureHash=").append(secureHash);
        return query.toString();
    }

    private String buildHashData(SortedMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            if (!first) sb.append('&');
            sb.append(entry.getKey()).append('=').append(urlEncode(entry.getValue()));
            first = false;
        }
        return sb.toString();
    }

    private String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.toString())
                             .replace("+", "%20");
        } catch (Exception e) {
            return "";
        }
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