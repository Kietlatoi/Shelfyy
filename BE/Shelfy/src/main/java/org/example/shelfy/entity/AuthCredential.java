package org.example.shelfy.entity;

import org.example.shelfy.enums.PasswordAlgo;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Thông tin xác thực mật khẩu của người dùng.
 * Người dùng đăng nhập qua Google sẽ KHÔNG có bản ghi này
 * (hoặc có với password_hash rỗng tuỳ thiết kế).
 *
 * DDL gốc: auth_credentials
 */
@Entity
@Table(name = "auth_credentials")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "credential_id")
    private Long credentialId;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true,
                foreignKey = @ForeignKey(name = "FK_auth_credentials_user"))
    private User user;

    @NotBlank
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "password_algo", nullable = false, length = 50)
    @Builder.Default
    private PasswordAlgo passwordAlgo = PasswordAlgo.BCRYPT;

    @NotNull
    @Column(name = "password_changed_at", nullable = false)
    @Builder.Default
    private LocalDateTime passwordChangedAt = LocalDateTime.now();

    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private Boolean mustChangePassword = false;

    @Column(name = "failed_login_count", nullable = false)
    @Builder.Default
    private Integer failedLoginCount = 0;

    /** Tài khoản bị khoá đến thời điểm này (null = không khoá) */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
