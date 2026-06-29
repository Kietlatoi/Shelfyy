package org.example.shelfy.entity;

import org.example.shelfy.enums.MfaMethodType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Phương thức xác thực 2 bước của người dùng.
 * DDL gốc: mfa_methods
 */
@Entity
@Table(
    name = "mfa_methods",
    uniqueConstraints = @UniqueConstraint(
        name = "UQ_mfa_user_method",
        columnNames = {"user_id", "method_type"}
    )
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MfaMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mfa_id")
    private Long mfaId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_mfa_methods_user"))
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "method_type", nullable = false, length = 30)
    private MfaMethodType methodType;

    /** TOTP secret, đã mã hoá AES trước khi lưu */
    @Column(name = "secret_encrypted", length = 500)
    private String secretEncrypted;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
}
