package org.example.shelfy.entity;

import org.example.shelfy.enums.Gender;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Thông tin cá nhân mở rộng của người dùng.
 * Dùng để AI gợi ý outfit phù hợp (chiều cao, cân nặng, tông da, phong cách…).
 *
 * DDL gốc: user_profiles
 */
@Entity
@Table(name = "user_profiles")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long profileId;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true,
                foreignKey = @ForeignKey(name = "FK_user_profiles_user"))
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Gender gender;

    /** Chiều cao (cm) — CHECK: 50–250 */
    @Min(50) @Max(250)
    @Column(name = "height_cm")
    private Integer heightCm;

    /** Cân nặng (kg) — CHECK: 20–300 */
    @Min(20) @Max(300)
    @Column(name = "weight_kg")
    private Integer weightKg;

    /** VD: "Hourglass", "Rectangle", "Pear", … */
    @Column(name = "body_shape", length = 50)
    private String bodyShape;

    /** VD: "Warm", "Cool", "Neutral" */
    @Column(name = "skin_tone", length = 50)
    private String skinTone;

    /** VD: "Minimalist, Smart Casual" */
    @Column(name = "style_preference", length = 255)
    private String stylePreference;

    /** VD: "Black, White, Navy" (CSV) */
    @Column(name = "favorite_colors", length = 255)
    private String favoriteColors;

    /** Người dùng đồng ý cho AI dùng dữ liệu để training không */
    @Column(name = "privacy_ai_training_consent", nullable = false)
    @Builder.Default
    private Boolean privacyAiTrainingConsent = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
