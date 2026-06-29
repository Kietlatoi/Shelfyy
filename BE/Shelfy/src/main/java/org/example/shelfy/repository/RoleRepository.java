package org.example.shelfy.repository;

import org.example.shelfy.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByRoleName(String roleName);

    boolean existsByRoleName(String roleName);

    /** Lấy tất cả role của một user */
    @Query("SELECT r FROM Role r JOIN r.rolePermissions rp " +
           "WHERE r.roleId IN " +
           "  (SELECT ur.role.roleId FROM UserRole ur WHERE ur.user.userId = :userId)")
    List<Role> findRolesByUserId(@Param("userId") Long userId);
}
