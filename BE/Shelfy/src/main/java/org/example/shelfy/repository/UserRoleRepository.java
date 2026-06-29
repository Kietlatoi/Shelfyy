package org.example.shelfy.repository;

import org.example.shelfy.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUserUserId(Long userId);

    boolean existsByUserUserIdAndRoleRoleId(Long userId, Long roleId);

    @Modifying
    @Query("DELETE FROM UserRole ur WHERE ur.user.userId = :userId AND ur.role.roleId = :roleId")
    int removeRole(@Param("userId") Long userId, @Param("roleId") Long roleId);

    /** Lấy danh sách permission code của user (dùng để build GrantedAuthority) */
    @Query("SELECT rp.permission.permissionCode FROM RolePermission rp " +
           "WHERE rp.role.roleId IN " +
           "  (SELECT ur.role.roleId FROM UserRole ur WHERE ur.user.userId = :userId)")
    List<String> findPermissionCodesByUserId(@Param("userId") Long userId);
}
