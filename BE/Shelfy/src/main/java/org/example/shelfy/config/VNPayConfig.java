package org.example.shelfy.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Cấu hình cổng thanh toán VNPay Sandbox.
 * Lấy tmnCode + hashSecret thật bằng cách đăng ký tài khoản merchant sandbox
 * tại https://sandbox.vnpayment.vn (miễn phí, dùng để test).
 */
@Getter
@Component
public class VNPayConfig {

    @Value("${vnpay.tmn-code}")
    private String tmnCode;

    @Value("${vnpay.hash-secret}")
    private String hashSecret;

    /** URL cổng thanh toán VNPay (nơi redirect người dùng sang để quét QR / nhập thẻ test) */
    @Value("${vnpay.pay-url}")
    private String payUrl;

    /** URL VNPay redirect trình duyệt người dùng về sau khi thanh toán xong */
    @Value("${vnpay.return-url}")
    private String returnUrl;

    /**
     * URL VNPay gọi server-to-server (IPN) để xác nhận giao dịch — đáng tin cậy
     * hơn returnUrl vì không phụ thuộc trình duyệt người dùng. LƯU Ý: VNPay
     * sandbox chỉ gọi được URL này nếu nó là địa chỉ public (VNPay server không
     * gọi vào được "localhost" của máy bạn). Khi chạy dev ở local, hệ thống vẫn
     * hoạt động bình thường vì việc kích hoạt gói được xử lý ngay ở returnUrl —
     * IPN chỉ là lớp xác nhận bổ sung, cần thiết khi deploy lên server thật.
     */
    @Value("${vnpay.ipn-url}")
    private String ipnUrl;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isConfigured() {
        return tmnCode != null && !tmnCode.isBlank()
                && hashSecret != null && !hashSecret.isBlank();
    }
}
