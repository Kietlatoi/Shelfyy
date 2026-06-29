package org.example.shelfy.entity;

import org.example.shelfy.enums.SubscriptionStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Đăng ký gói cước của người dùng.
 * Mỗi lần mua / gia hạn tạo một bản ghi mới.
 * Sau khi thanh toán VNPay thành công, status chuyển PENDING → ACTIVE.
 *
 * DDL gốc: subscriptions
 */
@Entity
@Table(
    name = "subscriptions",
    indexes = {
        @Index(name = "IX_subscriptions_user",     columnList = "user_id"),
        @Index(name = "IX_subscriptions_status",   columnList = "status"),
        @Index(name = "IX_subscriptions_end_date", columnList = "end_date")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id")
    private Long subscriptionId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_subscriptions_user"))
    private User user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_subscriptions_plan"))
    private Plan plan;

    @NotNull
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @NotNull
    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.PENDING;

    @Column(name = "auto_renew", nullable = false)
    @Builder.Default
    private Boolean autoRenew = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    // ── Helper ───────────────────────────────────────────────────
    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE
                && LocalDateTime.now().isBefore(endDate);
    }
}
