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
}
