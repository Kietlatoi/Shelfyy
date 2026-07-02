package org.example.shelfy.repository;

import org.example.shelfy.entity.Subscription;
import org.example.shelfy.entity.User;
import org.example.shelfy.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    /** Gói ACTIVE hiện tại của user (chưa hết hạn) */
    @Query("SELECT s FROM Subscription s " +
           "WHERE s.user.userId = :userId " +
           "AND s.status = org.example.shelfy.enums.SubscriptionStatus.ACTIVE " +
           "AND s.endDate > :now " +
           "ORDER BY s.endDate DESC")
    Optional<Subscription> findActiveByUserId(@Param("userId") Long userId,
                                              @Param("now") LocalDateTime now);

    List<Subscription> findByUserUserIdOrderByCreatedAtDesc(Long userId);

    /** Gói sắp hết hạn (gửi email nhắc gia hạn) */
    @Query("SELECT s FROM Subscription s " +
           "WHERE s.status = org.example.shelfy.enums.SubscriptionStatus.ACTIVE " +
           "AND s.endDate BETWEEN :from AND :to")
    List<Subscription> findExpiringSoon(@Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);

    /** Gói đã hết hạn nhưng chưa được đánh dấu EXPIRED */
    @Query("SELECT s FROM Subscription s " +
           "WHERE s.status = org.example.shelfy.enums.SubscriptionStatus.ACTIVE " +
           "AND s.endDate < :now")
    List<Subscription> findExpiredButNotMarked(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE Subscription s SET s.status = org.example.shelfy.enums.SubscriptionStatus.EXPIRED " +
           "WHERE s.status = org.example.shelfy.enums.SubscriptionStatus.ACTIVE " +
           "AND s.endDate < :now")
    int markExpired(@Param("now") LocalDateTime now);

    boolean existsByUserUserIdAndStatus(Long userId, SubscriptionStatus status);

}
