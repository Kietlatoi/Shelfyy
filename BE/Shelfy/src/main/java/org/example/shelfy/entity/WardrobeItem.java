package org.example.shelfy.entity;

import org.example.shelfy.enums.WardrobeCategory;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Một món đồ trong tủ đồ kỹ thuật số của người dùng.
 * Hình ảnh lưu trên Cloudinary, tham chiếu qua file_assets.
 * AI tự động phân tích ảnh và điền category, color, season, pattern.
 *
 * DDL gốc: wardrobe_items
 */
@Entity
@Table(
    name = "wardrobe_items",
    indexes = {
        @Index(name = "IX_wardrobe_items_user",     columnList = "user_id"),
        @Index(name = "IX_wardrobe_items_category", columnList = "category"),
        @Index(name = "IX_wardrobe_items_favorite", columnList = "is_favorite")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WardrobeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_wardrobe_items_user"))
    private User user;

    /**
     * Ảnh món đồ (sau khi AI xóa phông nền) lưu trên Cloudinary.
     * FK → file_assets
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_file_id",
                foreignKey = @ForeignKey(name = "FK_wardrobe_items_image"))
    private FileAsset imageFile;

    // ── Thông tin phân loại ─────────────────────────────────────
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WardrobeCategory category;

    @Size(max = 100)
    @Column(length = 100)
    private String brand;

    @NotBlank
    @Size(max = 150)
    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    // ── Thuộc tính vật lý ────────────────────────────────────────
    @Column(length = 30)
    private String size;

    @Column(length = 100)
    private String material;

    /** Tên màu — VD: "Xám nhạt (Light Gray)" */
    @Column(length = 50)
    private String color;

    /** Mã màu HEX — VD: "#f5f5f5" */
    @Column(name = "color_hex", length = 20)
    private String colorHex;

    /** Mùa phù hợp — VD: "XUAN_HE", "THU_DONG", "BON_MUA" (lưu chuỗi tự do theo DB gốc) */
    @Column(length = 50)
    private String season;

    /** Họa tiết — VD: "Trơn", "Kẻ sọc", "Hoa văn" */
    @Column(length = 100)
    private String pattern;

    // ── AI Metadata ─────────────────────────────────────────────
    /** true nếu thông tin phân loại do AI tự phát hiện */
    @Column(name = "ai_detected", nullable = false)
    @Builder.Default
    private Boolean aiDetected = false;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;

    // ── Relations ────────────────────────────────────────────────
    @OneToMany(mappedBy = "wardrobeItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<OutfitItem> outfitItems = new ArrayList<>();

    // ── Audit ────────────────────────────────────────────────────
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Soft-delete */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
