package org.example.shelfy.repository;

import org.example.shelfy.entity.WardrobeItem;
import org.example.shelfy.enums.WardrobeCategory;
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
public interface WardrobeItemRepository extends JpaRepository<WardrobeItem, Long> {

    // ── Lấy tủ đồ (active) ──────────────────────────────────────

    Page<WardrobeItem> findByUserUserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    Page<WardrobeItem> findByUserUserIdAndCategoryAndDeletedAtIsNull(
            Long userId, WardrobeCategory category, Pageable pageable);

    // Giữ lại overload List để tương thích với các service khác đang dùng
    List<WardrobeItem> findByUserUserIdAndDeletedAtIsNull(Long userId);

    // ── Item yêu thích ───────────────────────────────────────────

    List<WardrobeItem> findByUserUserIdAndIsFavoriteTrueAndDeletedAtIsNull(Long userId);

    // ── Tìm kiếm fulltext ────────────────────────────────────────

    @Query("SELECT w FROM WardrobeItem w " +
            "WHERE w.user.userId = :userId " +
            "AND w.deletedAt IS NULL " +
            "AND (LOWER(w.itemName) LIKE LOWER(CONCAT('%',:kw,'%')) " +
            "  OR LOWER(w.brand)    LIKE LOWER(CONCAT('%',:kw,'%')) " +
            "  OR LOWER(w.color)    LIKE LOWER(CONCAT('%',:kw,'%')) " +
            "  OR LOWER(w.pattern)  LIKE LOWER(CONCAT('%',:kw,'%')))")
    Page<WardrobeItem> search(@Param("userId") Long userId,
                              @Param("kw") String keyword,
                              Pageable pageable);

    // ── Lọc theo season ──────────────────────────────────────────

    @Query("SELECT w FROM WardrobeItem w " +
            "WHERE w.user.userId = :userId " +
            "AND w.deletedAt IS NULL " +
            "AND (LOWER(w.season) LIKE LOWER(CONCAT('%',:season,'%')) " +
            "  OR LOWER(w.season) = 'bon_mua')")
    List<WardrobeItem> findBySeason(@Param("userId") Long userId,
                                    @Param("season") String season);

    // ── Kiểm tra giới hạn kho ────────────────────────────────────

    long countByUserUserIdAndDeletedAtIsNull(Long userId);

    long countByUserUserIdAndCategoryAndDeletedAtIsNull(Long userId, WardrobeCategory category);

    // ── FIX #2: Đếm items bị lãng quên trực tiếp ở DB ───────────
    // Thay vì load toàn bộ items vào RAM rồi filter, đếm ở DB.
    // "Lãng quên" = chưa mặc lần nào (wearCount=0) HOẶC không mặc > 30 ngày.
    @Query("SELECT COUNT(w) FROM WardrobeItem w " +
            "WHERE w.user.userId = :userId " +
            "AND w.deletedAt IS NULL " +
            "AND (w.lastWornAt IS NULL OR w.lastWornAt < :cutoff)")
    long countForgottenByUserId(@Param("userId") Long userId,
                                @Param("cutoff") LocalDateTime cutoff);

    // ── Kiểm tra quyền sở hữu ────────────────────────────────────

    Optional<WardrobeItem> findByItemIdAndUserUserIdAndDeletedAtIsNull(Long itemId, Long userId);

    // ── Lấy batch theo danh sách ID (cho OutfitService) ──────────
    @Query("SELECT w FROM WardrobeItem w " +
            "WHERE w.itemId IN :ids " +
            "AND w.user.userId = :userId " +
            "AND w.deletedAt IS NULL")
    List<WardrobeItem> findAllByItemIdInAndUserUserIdAndDeletedAtIsNull(
            @Param("ids") List<Long> ids,
            @Param("userId") Long userId);

    // ── Soft-delete ──────────────────────────────────────────────

    @Modifying
    @Query("UPDATE WardrobeItem w SET w.deletedAt = :now WHERE w.itemId = :id AND w.user.userId = :userId")
    int softDelete(@Param("id") Long id,
                   @Param("userId") Long userId,
                   @Param("now") LocalDateTime now);

    // ── Thống kê trang chủ ───────────────────────────────────────

    @Query("SELECT w.category, COUNT(w) FROM WardrobeItem w " +
            "WHERE w.user.userId = :userId AND w.deletedAt IS NULL " +
            "GROUP BY w.category")
    List<Object[]> countGroupedByCategory(@Param("userId") Long userId);

    // ── Lấy item để gợi ý outfit / pairings ──────────────────────

    @Query("SELECT w FROM WardrobeItem w " +
            "WHERE w.user.userId = :userId " +
            "AND w.deletedAt IS NULL " +
            "AND w.category IN :categories " +
            "AND w.itemId NOT IN :excludeIds")
    List<WardrobeItem> findForOutfitSuggestion(
            @Param("userId") Long userId,
            @Param("categories") List<WardrobeCategory> categories,
            @Param("excludeIds") List<Long> excludeIds);

    // ── Filter đa tiêu chí (DB-side) ─────────────────────────────

    @Query(
            value = """
                    SELECT *
                    FROM wardrobe_items w
                    WHERE w.user_id = :userId
                      AND w.deleted_at IS NULL
                      AND (:category IS NULL OR w.category = CAST(:category AS varchar))
                      AND (:season IS NULL OR LOWER(COALESCE(w.season, '')) LIKE LOWER(CONCAT('%', CAST(:season AS varchar), '%')))
                      AND (:color IS NULL OR LOWER(COALESCE(w.color, '')) LIKE LOWER(CONCAT('%', CAST(:color AS varchar), '%')))
                    ORDER BY w.created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM wardrobe_items w
                    WHERE w.user_id = :userId
                      AND w.deleted_at IS NULL
                      AND (:category IS NULL OR w.category = CAST(:category AS varchar))
                      AND (:season IS NULL OR LOWER(COALESCE(w.season, '')) LIKE LOWER(CONCAT('%', CAST(:season AS varchar), '%')))
                      AND (:color IS NULL OR LOWER(COALESCE(w.color, '')) LIKE LOWER(CONCAT('%', CAST(:color AS varchar), '%')))
                    """,
            nativeQuery = true
    )
    Page<WardrobeItem> findWithFilters(
            @Param("userId") Long userId,
            @Param("category") String category,
            @Param("season") String season,
            @Param("color") String color,
            Pageable pageable);
}