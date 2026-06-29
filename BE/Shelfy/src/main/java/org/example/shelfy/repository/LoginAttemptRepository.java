package org.example.shelfy.repository;

import org.example.shelfy.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    /** Đếm số lần thất bại của email trong khoảng thời gian (brute-force guard) */
    @Query("SELECT COUNT(a) FROM LoginAttempt a " +
           "WHERE a.email = :email AND a.success = false AND a.createdAt >= :since")
    long countFailedByEmailAfter(@Param("email") String email,
                                 @Param("since") LocalDateTime since);

    /** Đếm số lần thất bại từ IP trong khoảng thời gian */
    @Query("SELECT COUNT(a) FROM LoginAttempt a " +
           "WHERE a.ipAddress = :ip AND a.success = false AND a.createdAt >= :since")
    long countFailedByIpAfter(@Param("ip") String ip,
                              @Param("since") LocalDateTime since);
}
