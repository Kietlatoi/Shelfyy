package org.example.shelfy.repository;

import org.example.shelfy.entity.TryOnSession;
import org.example.shelfy.enums.TryOnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TryOnSessionRepository extends JpaRepository<TryOnSession, Long> {

    Page<TryOnSession> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<TryOnSession> findByTryOnIdAndUserUserId(Long tryOnId, Long userId);

    List<TryOnSession> findByStatus(TryOnStatus status);

    // ── Kiểm tra quota lượt thử ──────────────────────────────────

    /** Đếm lượt thử trong ngày (FREE: 5/ngày) — loại trừ FAILED */
    @Query("SELECT COUNT(t) FROM TryOnSession t " +
           "WHERE t.user.userId = :userId " +
           "AND t.createdAt >= :startOfDay " +
           "AND t.status <> org.example.shelfy.enums.TryOnStatus.FAILED")
    long countTodayByUserId(@Param("userId") Long userId,
                            @Param("startOfDay") LocalDateTime startOfDay);

    /** Đếm lượt thử trong tháng (PREMIUM/PRO: 100/tháng) — loại trừ FAILED */
    @Query("SELECT COUNT(t) FROM TryOnSession t " +
           "WHERE t.user.userId = :userId " +
           "AND t.createdAt >= :startOfMonth " +
           "AND t.status <> org.example.shelfy.enums.TryOnStatus.FAILED")
    long countThisMonthByUserId(@Param("userId") Long userId,
                                @Param("startOfMonth") LocalDateTime startOfMonth);

    @Query("SELECT COUNT(t) FROM TryOnSession t WHERE t.createdAt >= :since")
    long countAfter(@Param("since") LocalDateTime since);
}
