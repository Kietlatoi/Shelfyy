package org.example.shelfy.entity;

import org.example.shelfy.enums.OutfitSource;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Một bộ outfit hoàn chỉnh (do AI gợi ý hoặc người dùng tự tạo).
 * Gồm nhiều WardrobeItem, mỗi item giữ một slot (TOP / BOTTOM / SHOES …).
 *
 * DDL gốc: outfits
 */
@Entity
@Table(
    name = "outfits",
    indexes = {
        @Index(name = "IX_outfits_user",     columnList = "user_id"),
        @Index(name = "IX_outfits_source",   columnList = "source"),
        @Index(name = "IX_outfits_favorite", columnList = "is_favorite")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Outfit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "outfit_id")
    private Long outfitId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_outfits_user"))
    private User user;

    /** Ảnh đại diện outfit trên Cloudinary */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_file_id",
                foreignKey = @ForeignKey(name = "FK_outfits_image"))
    private FileAsset imageFile;

    @NotBlank
    @Size(max = 150)
    @Column(name = "outfit_name", nullable = false, length = 150)
    private String outfitName;

    @Size(max = 500)
    @Column(length = 500)
    private String description;

    /** VD: "Minimalist", "Smart Casual", "Streetwear" */
    @Column(length = 100)
    private String style;

    /** VD: "Đi làm", "Đi chơi", "Sự kiện", "Thể thao" */
    @Column(length = 100)
    private String occasion;

    /** VD: "Nắng ráo", "Mưa nhẹ" */
    @Column(name = "weather_condition", length = 100)
    private String weatherCondition;

    @Column(name = "temperature_min", precision = 5, scale = 2)
    private BigDecimal temperatureMin;

    @Column(name = "temperature_max", precision = 5, scale = 2)
    private BigDecimal temperatureMax;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private OutfitSource source = OutfitSource.USER_CREATED;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;

    // ── Relations ────────────────────────────────────────────────
    /** Các item cụ thể trong outfit này (với slot) */
    @OneToMany(mappedBy = "outfit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<OutfitItem> outfitItems = new ArrayList<>();

    /** Lịch sử thử đồ ảo liên quan */
    @OneToMany(mappedBy = "outfit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TryOnSession> tryOnSessions = new ArrayList<>();

    /** Các lần AI gợi ý outfit này */
    @OneToMany(mappedBy = "outfit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AiSuggestion> aiSuggestions = new ArrayList<>();

    // ── Audit ────────────────────────────────────────────────────
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
