package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Gói cước dịch vụ Shelfy.
 *
 * Dữ liệu seed cần insert:
 *  - FREE      : 0đ, 30 ngày (luôn gia hạn), 5 lượt thử/ngày, 100 món đồ
 *  - PRO       : 59.000đ/tháng (30 ngày), 100 lượt/tháng, không giới hạn kho
 *  - PREMIUM   : 590.000đ/năm (365 ngày), 100 lượt/tháng, không giới hạn kho
 *
 * DDL gốc: plans
 */
@Entity
@Table(name = "plans")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;

    /** Mã nội bộ: FREE | PRO | PREMIUM */
    @NotBlank
    @Column(name = "plan_name", nullable = false, unique = true, length = 50)
    private String planName;

    /** Tên hiển thị ra UI: "Miễn phí", "Gói Pro", "Gói Premium" */
    @NotBlank
    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @NotNull
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @NotBlank
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "VND";

    /** Thời hạn tính bằng ngày (FREE = 36500 ~= "mãi mãi", PRO = 30, PREMIUM = 365) */
    @NotNull
    @Min(1)
    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    /**
     * Số lượt thử đồ ảo cho phép mỗi tháng.
     * null = không giới hạn (chưa áp dụng hiện tại).
     */
    @Column(name = "try_on_limit_per_month")
    private Integer tryOnLimitPerMonth;

    /**
     * Số món đồ tối đa trong tủ.
     * null = không giới hạn.
     */
    @Column(name = "wardrobe_limit")
    private Integer wardrobeLimit;

    /** JSON mô tả các tính năng (dùng để hiển thị bảng so sánh) */
    @Column(columnDefinition = "TEXT")
    private String features;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "plan", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Subscription> subscriptions = new ArrayList<>();
}
