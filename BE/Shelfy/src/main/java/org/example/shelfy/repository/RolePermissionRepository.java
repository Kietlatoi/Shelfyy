package org.example.shelfy.repository;

import org.example.shelfy.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    boolean existsByRoleRoleIdAndPermissionPermissionId(Long roleId, Long permissionId);
}
