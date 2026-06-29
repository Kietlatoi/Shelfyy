package org.example.shelfy.repository;

import org.example.shelfy.entity.AiSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AiSuggestionRepository extends JpaRepository<AiSuggestion, Long> {

    /** Lấy tất cả gợi ý trong ngày (carousel "Hôm nay mặc gì?") */
    List<AiSuggestion> findByUserUserIdAndSuggestionDateOrderByDisplayOrderAsc(
            Long userId, LocalDate date);

    /** Gợi ý chưa bị skip trong ngày */
    @Query("SELECT s FROM AiSuggestion s " +
           "WHERE s.user.userId = :userId " +
           "AND s.suggestionDate = :date " +
           "AND s.isSkipped = false " +
           "ORDER BY s.displayOrder ASC")
    List<AiSuggestion> findActiveByUserAndDate(@Param("userId") Long userId,
                                               @Param("date") LocalDate date);

    /** Gợi ý yêu thích */
    List<AiSuggestion> findByUserUserIdAndIsFavoritedTrueOrderByCreatedAtDesc(Long userId);

    Optional<AiSuggestion> findBySuggestionIdAndUserUserId(Long suggestionId, Long userId);

    /** Đánh dấu skip một gợi ý */
    @Modifying
    @Query("UPDATE AiSuggestion s SET s.isSkipped = true WHERE s.suggestionId = :id")
    int markSkipped(@Param("id") Long id);

    /** Toggle yêu thích */
    @Modifying
    @Query("UPDATE AiSuggestion s SET s.isFavorited = :fav WHERE s.suggestionId = :id")
    int updateFavorited(@Param("id") Long id, @Param("fav") boolean favorited);

    /** Đếm số gợi ý trong ngày (để biết thứ tự display_order tiếp theo) */
    long countByUserUserIdAndSuggestionDate(Long userId, LocalDate date);
}
