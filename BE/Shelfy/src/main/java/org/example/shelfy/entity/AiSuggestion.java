package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lưu lịch sử mỗi lần AI Stylist gợi ý outfit cho người dùng.
 * Hiển thị trên trang "Hôm nay mặc gì?" (SuggestPage).
 *
 * Một user có thể nhận nhiều gợi ý trong ngày (swipe carousel).
 * Nếu user bấm "Đổi gợi ý khác" → tạo thêm bản ghi mới.
 */
@Entity
@Table(
    name = "ai_suggestions",
    indexes = {
        @Index(name = "IX_ai_suggestion_user_date",
               columnList = "user_id, suggestion_date")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AiSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "suggestion_id")
    private Long suggestionId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_ai_suggestion_user"))
    private User user;

    /** Outfit được gợi ý — null nếu AI chưa tìm được outfit phù hợp */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "outfit_id",
                foreignKey = @ForeignKey(name = "FK_ai_suggestion_outfit"))
    private Outfit outfit;

    /** Sự kiện lịch liên quan (nếu có) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_event_id",
                foreignKey = @ForeignKey(name = "FK_ai_suggestion_event"))
    private CalendarEvent calendarEvent;

    // ── Ngữ cảnh AI sử dụng để gợi ý ───────────────────────────
    @NotNull
    @Column(name = "suggestion_date", nullable = false)
    private LocalDate suggestionDate;

    /** VD: "Nắng ráo", "Mưa nhẹ" */
    @Column(name = "weather_condition", length = 100)
    private String weatherCondition;

    @Column(name = "temperature_celsius", precision = 5, scale = 2)
    private BigDecimal temperatureCelsius;

    /** Bối cảnh: "di_lam", "di_choi", "su_kien", … */
    @Column(length = 50)
    private String context;

    /** Thứ tự trong carousel (1 = đầu tiên) */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 1;

    // ── Lời khuyên AI Stylist ────────────────────────────────────
    @Column(name = "ai_advice", columnDefinition = "TEXT")
    private String aiAdvice;

    /** VD: "Smart Casual, Work Day" (CSV) */
    @Column(name = "style_tags", length = 300)
    private String styleTags;

    // ── Tương tác của người dùng ─────────────────────────────────
    @Column(name = "is_favorited", nullable = false)
    @Builder.Default
    private Boolean isFavorited = false;

    /** true nếu người dùng đã bấm "Đổi gợi ý khác" để skip outfit này */
    @Column(name = "is_skipped", nullable = false)
    @Builder.Default
    private Boolean isSkipped = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
