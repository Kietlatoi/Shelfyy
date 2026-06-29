package org.example.shelfy.repository;

import org.example.shelfy.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    /** Đánh dấu đã dùng */
    @Modifying
    @Query("UPDATE EmailVerificationToken t SET t.usedAt = :now WHERE t.tokenHash = :hash")
    int markUsed(@Param("hash") String hash, @Param("now") LocalDateTime now);

    /** Xoá token cũ của user trước khi gửi token mới */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.user.userId = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    /** Xoá token hết hạn */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") LocalDateTime before);
}
