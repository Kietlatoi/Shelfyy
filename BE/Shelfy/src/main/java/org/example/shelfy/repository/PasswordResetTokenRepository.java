package org.example.shelfy.repository;

import org.example.shelfy.entity.PasswordResetToken;
import org.example.shelfy.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.tokenHash = :hash")
    int markUsed(@Param("hash") String hash, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user.userId = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") LocalDateTime before);

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(
            String tokenHash,
            LocalDateTime now
    );

    @Query("""
            SELECT t FROM PasswordResetToken t
            WHERE t.tokenHash = :tokenHash
              AND t.usedAt IS NULL
              AND t.expiresAt > :now
            """)
    Optional<PasswordResetToken> findValidToken(String tokenHash, LocalDateTime now);
}
