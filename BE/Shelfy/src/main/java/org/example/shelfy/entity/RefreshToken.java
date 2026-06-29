package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * JWT Refresh Token — lưu hash, không lưu token gốc.
 * Hỗ trợ token rotation: khi refresh, token cũ bị revoke và
 * replaced_by_token_hash trỏ sang token mới.
 *
 * DDL gốc: refresh_tokens
 */
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "IX_refresh_tokens_user_id",   columnList = "user_id"),
        @Index(name = "IX_refresh_tokens_expires_at", columnList = "expires_at")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refresh_token_id")
    private Long refreshTokenId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_refresh_tokens_user"))
    private User user;

    /** SHA-256 hash của refresh token thực */
    @NotBlank
    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    private String tokenHash;

    @Column(name = "device_info", length = 255)
    private String deviceInfo;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "issued_at", nullable = false, updatable = false)
    private LocalDateTime issuedAt;

    @NotNull
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    /** Hash của token kế tiếp (token rotation) */
    @Column(name = "replaced_by_token_hash", length = 255)
    private String replacedByTokenHash;

    // ── Helper ───────────────────────────────────────────────────
    public boolean isRevoked()  { return revokedAt != null; }
    public boolean isExpired()  { return LocalDateTime.now().isAfter(expiresAt); }
    public boolean isActive()   { return !isRevoked() && !isExpired(); }
}
