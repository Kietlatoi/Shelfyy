package org.example.shelfy.repository;

import org.example.shelfy.entity.Outfit;
import org.example.shelfy.enums.OutfitSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OutfitRepository extends JpaRepository<Outfit, Long> {

    // ── Lấy theo user ────────────────────────────────────────────

    Page<Outfit> findByUserUserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    Page<Outfit> findByUserUserIdAndSourceAndDeletedAtIsNull(
            Long userId, OutfitSource source, Pageable pageable);

    List<Outfit> findByUserUserIdAndIsFavoriteTrueAndDeletedAtIsNull(Long userId);

    // ── Lọc theo ngữ cảnh / thời tiết ───────────────────────────

    @Query("SELECT o FROM Outfit o " +
           "WHERE o.user.userId = :userId " +
           "AND o.deletedAt IS NULL " +
           "AND (:occasion IS NULL OR LOWER(o.occasion) LIKE LOWER(CONCAT('%',:occasion,'%'))) " +
           "AND (:style    IS NULL OR LOWER(o.style)    LIKE LOWER(CONCAT('%',:style,'%')))")
    List<Outfit> findByContext(@Param("userId") Long userId,
                               @Param("occasion") String occasion,
                               @Param("style") String style);

    /** Lọc outfit phù hợp nhiệt độ thực tế */
    @Query("SELECT o FROM Outfit o " +
           "WHERE o.user.userId = :userId " +
           "AND o.deletedAt IS NULL " +
           "AND (o.temperatureMin IS NULL OR o.temperatureMin <= :temp) " +
           "AND (o.temperatureMax IS NULL OR o.temperatureMax >= :temp)")
    List<Outfit> findSuitableForTemp(@Param("userId") Long userId,
                                     @Param("temp") BigDecimal temp);

    // ── Tìm kiếm ─────────────────────────────────────────────────

    @Query("SELECT o FROM Outfit o " +
           "WHERE o.user.userId = :userId AND o.deletedAt IS NULL " +
           "AND (LOWER(o.outfitName) LIKE LOWER(CONCAT('%',:kw,'%')) " +
           "  OR LOWER(o.style)      LIKE LOWER(CONCAT('%',:kw,'%')) " +
           "  OR LOWER(o.occasion)   LIKE LOWER(CONCAT('%',:kw,'%')))")
    Page<Outfit> search(@Param("userId") Long userId,
                        @Param("kw") String keyword,
                        Pageable pageable);

    // ── Kiểm tra sở hữu ──────────────────────────────────────────

    Optional<Outfit> findByOutfitIdAndUserUserIdAndDeletedAtIsNull(Long outfitId, Long userId);

    // ── Soft-delete ──────────────────────────────────────────────

    @Modifying
    @Query("UPDATE Outfit o SET o.deletedAt = :now " +
           "WHERE o.outfitId = :id AND o.user.userId = :userId")
    int softDelete(@Param("id") Long id,
                   @Param("userId") Long userId,
                   @Param("now") LocalDateTime now);

    // ── Thống kê ─────────────────────────────────────────────────

    long countByUserUserIdAndSourceAndDeletedAtIsNull(Long userId, OutfitSource source);
}
