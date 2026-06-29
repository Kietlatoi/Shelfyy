package org.example.shelfy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Ghi lại từng lần đăng nhập (thành công hoặc thất bại).
 * Dùng để rate-limit, phát hiện brute-force.
 *
 * DDL gốc: login_attempts
 */
@Entity
@Table(
    name = "login_attempts",
    indexes = {
        @Index(name = "IX_login_attempts_email",      columnList = "email"),
        @Index(name = "IX_login_attempts_user_id",    columnList = "user_id"),
        @Index(name = "IX_login_attempts_ip_created", columnList = "ip_address, created_at")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Long attemptId;

    /** Email dùng để đăng nhập (có thể null nếu đăng nhập qua OAuth) */
    @Column(length = 255)
    private String email;

    /** null nếu đăng nhập bằng email không tồn tại */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id",
                foreignKey = @ForeignKey(name = "FK_login_attempts_user"))
    private User user;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(nullable = false)
    private Boolean success;

    /** INVALID_PASSWORD | ACCOUNT_LOCKED | ACCOUNT_BANNED | … */
    @Column(name = "failure_reason", length = 100)
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
