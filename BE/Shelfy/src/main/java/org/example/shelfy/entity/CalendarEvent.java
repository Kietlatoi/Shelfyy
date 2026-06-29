package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Sự kiện lịch cá nhân — đồng bộ 2 chiều với Google Calendar.
 *
 * Luồng đồng bộ:
 *  - Kéo (pull):  GET /api/calendar/sync → fetch events từ Google Calendar API
 *                 và upsert vào bảng này (theo google_event_id).
 *  - Đẩy (push):  Khi user tạo event trên Shelfy → POST lên Google Calendar API,
 *                 lưu lại google_event_id.
 *
 * Outfit gắn vào sự kiện để AI gợi ý trang phục phù hợp ngữ cảnh.
 */
@Entity
@Table(
    name = "calendar_events",
    indexes = {
        @Index(name = "IX_calendar_user_id",        columnList = "user_id"),
        @Index(name = "IX_calendar_event_start",    columnList = "event_start"),
        @Index(name = "IX_calendar_google_event_id", columnList = "google_event_id")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_calendar_events_user"))
    private User user;

    // ── Thông tin sự kiện ────────────────────────────────────────
    @NotBlank
    @Column(name = "event_title", nullable = false, length = 255)
    private String eventTitle;

    @NotNull
    @Column(name = "event_start", nullable = false)
    private LocalDateTime eventStart;

    @Column(name = "event_end")
    private LocalDateTime eventEnd;

    @Column(length = 255)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Bối cảnh người dùng chọn thủ công:
     * "di_hoc" | "di_lam" | "di_choi" | "su_kien" | "the_thao" | "thuyet_trinh"
     * Dùng để AI lọc outfit phù hợp.
     */
    @Column(length = 50)
    private String context;

    // ── Google Calendar sync ─────────────────────────────────────
    /**
     * ID sự kiện trên Google Calendar — unique per user.
     * null nếu event được tạo trực tiếp trên Shelfy chưa sync.
     */
    @Column(name = "google_event_id", length = 255)
    private String googleEventId;

    @Column(name = "google_calendar_id", length = 255)
    private String googleCalendarId;

    /** Thời điểm cuối cùng đồng bộ với Google Calendar */
    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    // ── Outfit gắn vào sự kiện ───────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_outfit_id",
                foreignKey = @ForeignKey(name = "FK_calendar_events_outfit"))
    private Outfit selectedOutfit;

    // ── Audit ────────────────────────────────────────────────────
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
