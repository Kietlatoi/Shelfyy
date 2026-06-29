package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit log mọi hành động quan trọng trong hệ thống.
 * DDL gốc: audit_logs
 */
@Entity
@Table(
    name = "audit_logs",
    indexes = {
        @Index(name = "IX_audit_logs_actor",      columnList = "actor_user_id"),
        @Index(name = "IX_audit_logs_action",     columnList = "action"),
        @Index(name = "IX_audit_logs_created_at", columnList = "created_at")
    }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long auditId;

    /** null nếu hành động do hệ thống (scheduler, …) thực hiện */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id",
                foreignKey = @ForeignKey(name = "FK_audit_logs_actor"))
    private User actor;

    /** VD: USER_LOGIN, WARDROBE_ITEM_DELETED, SUBSCRIPTION_CREATED */
    @NotBlank
    @Column(nullable = false, length = 100)
    private String action;

    /** Tên bảng / entity bị tác động */
    @Column(name = "entity_name", length = 100)
    private String entityName;

    /** ID bản ghi bị tác động */
    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /** JSON snapshot trước khi thay đổi */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /** JSON snapshot sau khi thay đổi */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
