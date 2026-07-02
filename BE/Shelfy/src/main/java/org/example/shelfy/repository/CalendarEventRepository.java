package org.example.shelfy.repository;

import org.example.shelfy.entity.CalendarEvent;
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

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    List<CalendarEvent> findByUserUserIdOrderByEventStartAsc(Long userId);

    // ── FIX #4: Thêm overload nhận Pageable → DB tự phân trang, không load toàn bộ vào RAM ──
    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.user.userId = :userId " +
            "AND e.eventStart BETWEEN :from AND :to " +
            "ORDER BY e.eventStart ASC")
    Page<CalendarEvent> findByUserAndDateRange(@Param("userId") Long userId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to,
                                               Pageable pageable);

    // Giữ lại overload List để không phá các chỗ khác đang dùng
    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.user.userId = :userId " +
            "AND e.eventStart BETWEEN :from AND :to " +
            "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findByUserAndDateRange(@Param("userId") Long userId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);

    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.user.userId = :userId " +
            "AND e.eventStart >= :now " +
            "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findUpcoming(@Param("userId") Long userId,
                                     @Param("now") LocalDateTime now);

    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.user.userId = :userId " +
            "AND e.eventStart >= :startOfTomorrow " +
            "AND e.eventStart < :endOfTomorrow " +
            "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findTomorrow(@Param("userId") Long userId,
                                     @Param("startOfTomorrow") LocalDateTime startOfTomorrow,
                                     @Param("endOfTomorrow") LocalDateTime endOfTomorrow);

    Optional<CalendarEvent> findByGoogleEventIdAndUserUserId(String googleEventId, Long userId);

    boolean existsByGoogleEventIdAndUserUserId(String googleEventId, Long userId);

    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.user.userId = :userId AND e.googleEventId IS NULL")
    List<CalendarEvent> findNotSynced(@Param("userId") Long userId);

    Optional<CalendarEvent> findByEventIdAndUserUserId(Long eventId, Long userId);

    @Modifying
    @Query("DELETE FROM CalendarEvent e WHERE e.eventId = :id AND e.user.userId = :userId")
    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}