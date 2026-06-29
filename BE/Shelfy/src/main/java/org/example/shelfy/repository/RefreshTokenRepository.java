package org.example.shelfy.repository;

import org.example.shelfy.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserUserIdAndRevokedAtIsNull(Long userId);

    /** Thu hồi token theo hash */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.tokenHash = :hash")
    int revokeByTokenHash(@Param("hash") String hash, @Param("now") LocalDateTime now);

    /** Thu hồi toàn bộ token của user (logout tất cả thiết bị) */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now " +
           "WHERE r.user.userId = :userId AND r.revokedAt IS NULL")
    int revokeAllByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Xoá token hết hạn — gọi bởi scheduler định kỳ */
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") LocalDateTime before);
}
