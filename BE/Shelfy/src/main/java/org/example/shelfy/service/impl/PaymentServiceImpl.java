package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.shelfy.config.VNPayConfig;
import org.example.shelfy.dto.response.PaymentUrlResponse;
import org.example.shelfy.entity.Payment;
import org.example.shelfy.entity.Plan;
import org.example.shelfy.entity.Subscription;
import org.example.shelfy.entity.User;
import org.example.shelfy.enums.PaymentMethod;
import org.example.shelfy.enums.PaymentStatus;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.repository.PaymentRepository;
import org.example.shelfy.repository.PlanRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.service.PaymentService;
import org.example.shelfy.service.SubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final VNPayConfig vnPayConfig;
    private final VNPayService vnPayService;
    private final PaymentRepository paymentRepository;
    private final PlanRepository planRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    @Override
    @Transactional
    public PaymentUrlResponse createVnpayPayment(Long userId, String planType, String clientIp) {
        if (!vnPayConfig.isConfigured()) {
            throw new AppException(ErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED);
        }

        String normalizedPlan = normalizePlan(planType);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Plan plan = planRepository.findByPlanName(normalizedPlan)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_INVALID_PLAN));

        String txnRef = vnPayService.generateTxnRef();
        Payment payment = paymentRepository.save(Payment.builder()
                .user(user)
                .amount(plan.getPrice())
                .currency("VND")
                .paymentMethod(PaymentMethod.VNPAY)
                .paymentStatus(PaymentStatus.PENDING)
                .transactionCode(txnRef)
                .planType(normalizedPlan)
                .build());

        String orderInfo = "Thanh toan goi " + normalizedPlan + " - Shelfy - " + payment.getPaymentId();
        String paymentUrl = vnPayService.buildPaymentUrl(txnRef, plan.getPrice(), orderInfo, clientIp);

        return PaymentUrlResponse.builder()
                .paymentUrl(paymentUrl)
                .transactionCode(txnRef)
                .build();
    }

    @Override
    @Transactional
    public String handleVnpayReturn(Map<String, String> params) {
        Result result = process(params, "return");
        return UriComponentsBuilder.fromUriString(vnPayConfig.getFrontendUrl() + "/#/up-premium")
                .queryParam("payment", result.success ? "success" : "failed")
                .queryParamIfPresent("plan", java.util.Optional.ofNullable(result.planType))
                .queryParamIfPresent("reason", java.util.Optional.ofNullable(result.reason))
                .build()
                .toUriString();
    }

    @Override
    @Transactional
    public Map<String, String> handleVnpayIpn(Map<String, String> params) {
        Result result = process(params, "ipn");
        Map<String, String> response = new LinkedHashMap<>();
        response.put("RspCode", result.rspCode);
        response.put("Message", result.message);
        return response;
    }

    // ── Xử lý dùng chung cho cả return URL lẫn IPN ─────────────────

    private record Result(boolean success, String planType, String reason, String rspCode, String message) {}

    private Result process(Map<String, String> params, String source) {
        if (!vnPayService.verifySignature(params)) {
            log.warn("[VNPay-{}] Sai chữ ký, dữ liệu có thể bị giả mạo: {}", source, params);
            return new Result(false, null, "invalid_signature", "97", "Invalid signature");
        }

        String txnRef = params.get("vnp_TxnRef");
        Payment payment = paymentRepository.findByTransactionCode(txnRef).orElse(null);
        if (payment == null) {
            log.warn("[VNPay-{}] Không tìm thấy giao dịch với txnRef={}", source, txnRef);
            return new Result(false, null, "not_found", "01", "Order not found");
        }

        // Idempotent: nếu đã xử lý rồi (return + ipn cùng báo về, hoặc VNPay gọi lại)
        // thì không xử lý lại, chỉ trả về kết quả đã lưu trước đó.
        if (payment.getPaymentStatus() != PaymentStatus.PENDING) {
            boolean wasSuccess = payment.getPaymentStatus() == PaymentStatus.SUCCESS;
            return new Result(wasSuccess, payment.getPlanType(), wasSuccess ? null : "already_processed",
                    "02", "Order already confirmed");
        }

        String vnpAmount = params.get("vnp_Amount");
        BigDecimal expectedAmount = payment.getAmount().multiply(BigDecimal.valueOf(100));
        if (vnpAmount == null || new BigDecimal(vnpAmount).compareTo(expectedAmount) != 0) {
            log.warn("[VNPay-{}] Sai số tiền: nhận {} nhưng mong đợi {}", source, vnpAmount, expectedAmount);
            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setProviderResponse(params.toString());
            paymentRepository.save(payment);
            return new Result(false, payment.getPlanType(), "amount_mismatch", "04", "Invalid amount");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);

        payment.setProviderResponse(params.toString());
        if (success) {
            payment.setPaymentStatus(PaymentStatus.SUCCESS);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);

            try {
                Subscription subscription = subscriptionService.activatePaidPlanForUser(
                        payment.getUser().getUserId(), payment.getPlanType());
                payment.setSubscription(subscription);
                paymentRepository.save(payment);
            } catch (Exception e) {
                // Thanh toán đã thành công nhưng kích hoạt gói lỗi (vd. thiếu seed Plan) —
                // KHÔNG đảo ngược trạng thái SUCCESS (tiền đã trừ thật ở VNPay sandbox),
                // log lỗi nghiêm trọng để admin xử lý thủ công thay vì mất tiền vô ích.
                log.error("[VNPay-{}] Thanh toán SUCCESS nhưng activate subscription lỗi, txnRef={}",
                        source, txnRef, e);
                return new Result(false, payment.getPlanType(), "activation_failed", "99", "Confirm Success but activation failed");
            }

            log.info("[VNPay-{}] Thanh toán thành công, user={}, plan={}, txnRef={}",
                    source, payment.getUser().getUserId(), payment.getPlanType(), txnRef);
            return new Result(true, payment.getPlanType(), null, "00", "Confirm Success");
        } else {
            payment.setPaymentStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            log.info("[VNPay-{}] Thanh toán thất bại, responseCode={}, txnRef={}", source, responseCode, txnRef);
            return new Result(false, payment.getPlanType(), "vnpay_response_" + responseCode, "00", "Confirm Success");
        }
    }

    private String normalizePlan(String raw) {
        String plan = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (!plan.equals("PRO") && !plan.equals("PREMIUM")) {
            throw new AppException(ErrorCode.SUBSCRIPTION_INVALID_PLAN);
        }
        return plan;
    }
}
