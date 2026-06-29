package org.example.shelfy.repository;

import org.example.shelfy.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findBySessionTokenHash(String tokenHash);

    List<UserSession> findByUserUserIdAndRevokedAtIsNull(Long userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.revokedAt = :now WHERE s.sessionTokenHash = :hash")
    int revokeByTokenHash(@Param("hash") String hash, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.revokedAt = :now " +
           "WHERE s.user.userId = :userId AND s.revokedAt IS NULL")
    int revokeAllByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") LocalDateTime before);
}
