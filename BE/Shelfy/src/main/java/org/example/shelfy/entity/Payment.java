package org.example.shelfy.entity;

import org.example.shelfy.enums.PaymentMethod;
import org.example.shelfy.enums.PaymentStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Giao dịch thanh toán — tích hợp VNPay Sandbox.
 *
 * Luồng VNPay:
 *  1. Tạo Payment (PENDING) → sinh URL redirect VNPay.
 *  2. Người dùng thanh toán trên VNPay.
 *  3. VNPay callback /api/payments/vnpay/callback → cập nhật status (SUCCESS / FAILED).
 *  4. Nếu SUCCESS → active Subscription tương ứng.
 *
 * DDL gốc: payments
 */
@Entity
@Table(
    name = "payments",
    indexes = {
        @Index(name = "IX_payments_user",       columnList = "user_id"),
        @Index(name = "IX_payments_status",     columnList = "payment_status"),
        @Index(name = "IX_payments_created_at", columnList = "created_at")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_payments_user"))
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id",
                foreignKey = @ForeignKey(name = "FK_payments_subscription"))
    private Subscription subscription;

    @NotNull
    @DecimalMin("0.0")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @NotNull
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "VND";

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 50)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.VNPAY;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    /** Gói đang mua: PRO | PREMIUM — dùng để kích hoạt Subscription khi VNPay báo thành công. */
    @Column(name = "plan_type", length = 50)
    private String planType;

    /**
     * Mã giao dịch VNPay (vnp_TxnRef) — cũng dùng làm mã đơn hàng.
     * Phải unique để tránh VNPay duplicate.
     */
    @Column(name = "transaction_code", unique = true, length = 255)
    private String transactionCode;

    /** JSON raw response từ VNPay callback (lưu để debug / reconcile) */
    @Column(name = "provider_response", columnDefinition = "TEXT")
    private String providerResponse;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
