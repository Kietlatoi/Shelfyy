package org.example.shelfy.repository;

import org.example.shelfy.entity.CalendarEvent;
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

    // ── Lấy sự kiện của user ─────────────────────────────────────

    List<CalendarEvent> findByUserUserIdOrderByEventStartAsc(Long userId);

    /** Sự kiện trong khoảng thời gian (dùng cho calendar view) */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.user.userId = :userId " +
           "AND e.eventStart BETWEEN :from AND :to " +
           "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findByUserAndDateRange(@Param("userId") Long userId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);

    /** Sự kiện sắp tới (để AI chuẩn bị gợi ý trang phục) */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.user.userId = :userId " +
           "AND e.eventStart >= :now " +
           "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findUpcoming(@Param("userId") Long userId,
                                     @Param("now") LocalDateTime now);

    /** Sự kiện ngày mai — AI gợi ý outfit tối hôm trước */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.user.userId = :userId " +
           "AND e.eventStart >= :startOfTomorrow " +
           "AND e.eventStart < :endOfTomorrow " +
           "ORDER BY e.eventStart ASC")
    List<CalendarEvent> findTomorrow(@Param("userId") Long userId,
                                     @Param("startOfTomorrow") LocalDateTime startOfTomorrow,
                                     @Param("endOfTomorrow") LocalDateTime endOfTomorrow);

    // ── Google Calendar sync ─────────────────────────────────────

    Optional<CalendarEvent> findByGoogleEventIdAndUserUserId(String googleEventId, Long userId);

    boolean existsByGoogleEventIdAndUserUserId(String googleEventId, Long userId);

    /** Lấy event chưa sync (chưa có googleEventId) */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.user.userId = :userId AND e.googleEventId IS NULL")
    List<CalendarEvent> findNotSynced(@Param("userId") Long userId);

    // ── Kiểm tra sở hữu ──────────────────────────────────────────

    Optional<CalendarEvent> findByEventIdAndUserUserId(Long eventId, Long userId);

    // ── Xoá ──────────────────────────────────────────────────────

    @Modifying
    @Query("DELETE FROM CalendarEvent e WHERE e.eventId = :id AND e.user.userId = :userId")
    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
