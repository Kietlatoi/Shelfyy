package org.example.shelfy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Liên kết Role ↔ Permission.
 * DDL gốc: role_permissions
 */
@Entity
@Table(
    name = "role_permissions",
    uniqueConstraints = @UniqueConstraint(
        name = "UQ_role_permissions",
        columnNames = {"role_id", "permission_id"}
    )
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_permission_id")
    private Long rolePermissionId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_role_permissions_role"))
    private Role role;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_role_permissions_permission"))
    private Permission permission;
}
