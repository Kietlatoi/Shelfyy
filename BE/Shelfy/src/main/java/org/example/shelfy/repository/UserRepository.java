package org.example.shelfy.repository;

import org.example.shelfy.entity.User;
import org.example.shelfy.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPublicId(UUID publicId);

    boolean existsByEmail(String email);

    Optional<User> findByEmailAndStatusAndDeletedAtIsNull(String email, UserStatus status);

    Optional<User> findByUserIdAndDeletedAtIsNull(Long userId);

    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL " +
            "AND (:keyword IS NULL " +
            "  OR LOWER(u.fullName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
            "  OR LOWER(u.email) LIKE LOWER(CONCAT('%',:keyword,'%')))")
    Page<User> searchActive(@Param("keyword") String keyword, Pageable pageable);

    @Modifying
    @Query("UPDATE User u SET u.deletedAt = :now, " +
            "u.status = org.example.shelfy.enums.UserStatus.DELETED " +
            "WHERE u.userId = :id")
    int softDelete(@Param("id") Long id, @Param("now") LocalDateTime now);

    long countByDeletedAtIsNull();

    long countByStatus(UserStatus status);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since AND u.deletedAt IS NULL")
    long countNewUsersAfter(@Param("since") LocalDateTime since);

    // ── Plan management ──────────────────────────────────────────

    @Query("SELECT u FROM User u WHERE u.plan <> 'FREE' AND u.planExpiresAt < :now")
    List<User> findExpiredPlans(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE User u SET " +
            "u.plan = 'FREE', " +
            "u.planExpiresAt = NULL, " +
            "u.storageLimit = 100, " +
            "u.tryOnLimit = 5 " +
            "WHERE u.plan <> 'FREE' " +
            "AND u.planExpiresAt < :now")
    int resetExpiredPlans(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE User u SET u.tryOnCountToday = 0, u.tryOnResetAt = :now WHERE UPPER(u.plan) = 'FREE'")
    int resetFreeTryOnCount(@Param("now") LocalDateTime now);

    // ── FIX #6: Atomic storage counter — tránh race condition ────
    //
    // incrementStorageUsed: chỉ tăng nếu CHƯA đạt giới hạn (storageLimit = -1 nghĩa là unlimited).
    // Trả về số dòng bị ảnh hưởng:
    //   1 → tăng thành công, được phép thêm item.
    //   0 → đã đầy (storageUsed >= storageLimit), ném WARDROBE_STORAGE_FULL.
    //
    // Vì UPDATE chạy như 1 câu SQL nguyên tử, 2 request đồng thời sẽ
    // không cả hai đều "pass" check và vượt giới hạn.
    @Modifying
    @Query("UPDATE User u SET u.storageUsed = u.storageUsed + 1 " +
            "WHERE u.userId = :id " +
            "AND (u.storageLimit = -1 OR u.storageUsed < u.storageLimit)")
    int incrementStorageUsed(@Param("id") Long id);

    // decrementStorageUsed: giảm nhưng không bao giờ xuống dưới 0.
    @Modifying
    @Query("UPDATE User u SET u.storageUsed = GREATEST(0, u.storageUsed - 1) " +
            "WHERE u.userId = :id")
    int decrementStorageUsed(@Param("id") Long id);
}