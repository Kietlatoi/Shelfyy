package org.example.shelfy.repository;

import org.example.shelfy.entity.AuthCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AuthCredentialRepository extends JpaRepository<AuthCredential, Long> {

    Optional<AuthCredential> findByUserUserId(Long userId);

    /** Tăng failed_login_count lên 1 */
    @Modifying
    @Query("UPDATE AuthCredential a SET a.failedLoginCount = a.failedLoginCount + 1 " +
           "WHERE a.user.userId = :userId")
    int incrementFailedCount(@Param("userId") Long userId);

    /** Reset failed count sau khi đăng nhập thành công */
    @Modifying
    @Query("UPDATE AuthCredential a " +
           "SET a.failedLoginCount = 0, a.lockedUntil = null, a.lastLoginAt = :now " +
           "WHERE a.user.userId = :userId")
    int resetFailedCountAndUpdateLastLogin(@Param("userId") Long userId,
                                           @Param("now") LocalDateTime now);

    /** Khoá tài khoản tạm thời */
    @Modifying
    @Query("UPDATE AuthCredential a SET a.lockedUntil = :until WHERE a.user.userId = :userId")
    int lockUntil(@Param("userId") Long userId, @Param("until") LocalDateTime until);

    /** Đổi mật khẩu */
    @Modifying
    @Query("UPDATE AuthCredential a " +
           "SET a.passwordHash = :hash, a.passwordChangedAt = :now, " +
           "    a.mustChangePassword = false, a.failedLoginCount = 0 " +
           "WHERE a.user.userId = :userId")
    int updatePassword(@Param("userId") Long userId,
                       @Param("hash") String hash,
                       @Param("now") LocalDateTime now);
}
