package org.example.shelfy.entity;

import org.example.shelfy.enums.TryOnStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phiên thử đồ ảo (AI Magic Mirror).
 * Người dùng upload ảnh chân dung → AI ghép outfit → trả về ảnh kết quả.
 *
 * FREE:         5 lượt/ngày
 * PREMIUM/PRO: 100 lượt/tháng
 *
 * DDL gốc: try_on_sessions
 */
@Entity
@Table(
    name = "try_on_sessions",
    indexes = {
        @Index(name = "IX_try_on_sessions_user",       columnList = "user_id"),
        @Index(name = "IX_try_on_sessions_status",     columnList = "status"),
        @Index(name = "IX_try_on_sessions_created_at", columnList = "created_at")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TryOnSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "try_on_id")
    private Long tryOnId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_try_on_sessions_user"))
    private User user;

    /** Outfit được thử — null nếu người dùng thử đơn lẻ từng item */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "outfit_id",
                foreignKey = @ForeignKey(name = "FK_try_on_sessions_outfit"))
    private Outfit outfit;

    /** Ảnh chân dung người dùng tải lên (FK → file_assets) */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "input_file_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_try_on_sessions_input_file"))
    private FileAsset inputFile;

    /** Ảnh kết quả AI tạo ra (FK → file_assets) — null khi chưa xong */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_file_id",
                foreignKey = @ForeignKey(name = "FK_try_on_sessions_result_file"))
    private FileAsset resultFile;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TryOnStatus status = TryOnStatus.PENDING;

    /** Độ chính xác AI (0–100) */
    @DecimalMin("0.0") @DecimalMax("100.0")
    @Column(name = "accuracy_score", precision = 5, scale = 2)
    private BigDecimal accuracyScore;

    @Column(name = "processing_time_seconds", precision = 6, scale = 2)
    private BigDecimal processingTimeSeconds;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
