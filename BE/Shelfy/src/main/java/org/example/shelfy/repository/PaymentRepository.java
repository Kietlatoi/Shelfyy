package org.example.shelfy.repository;

import org.example.shelfy.entity.Payment;
import org.example.shelfy.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionCode(String transactionCode);

    Page<Payment> findByUserUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<Payment> findBySubscriptionSubscriptionId(Long subscriptionId);

    // ── VNPay callback ───────────────────────────────────────────

    @Modifying
    @Query("UPDATE Payment p " +
           "SET p.paymentStatus = :status, " +
           "    p.paidAt = :paidAt, " +
           "    p.providerResponse = :response " +
           "WHERE p.transactionCode = :txnCode")
    int updateVnpayResult(@Param("txnCode") String transactionCode,
                          @Param("status") PaymentStatus status,
                          @Param("paidAt") LocalDateTime paidAt,
                          @Param("response") String providerResponse);

    // ── Thống kê doanh thu ───────────────────────────────────────
    // Dùng enum param thay vì string literal trong JPQL

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.paymentStatus = :status AND p.paidAt >= :since")
    BigDecimal sumRevenueAfter(@Param("since") LocalDateTime since,
                               @Param("status") PaymentStatus status);

    @Query("SELECT COUNT(p) FROM Payment p " +
           "WHERE p.paymentStatus = :status AND p.paidAt >= :since")
    long countByStatusAfter(@Param("since") LocalDateTime since,
                            @Param("status") PaymentStatus status);
}
