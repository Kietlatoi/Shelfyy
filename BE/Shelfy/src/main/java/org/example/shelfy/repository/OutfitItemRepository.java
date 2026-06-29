package org.example.shelfy.repository;

import org.example.shelfy.entity.OutfitItem;
import org.example.shelfy.enums.OutfitSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutfitItemRepository extends JpaRepository<OutfitItem, Long> {

    List<OutfitItem> findByOutfitOutfitId(Long outfitId);

    Optional<OutfitItem> findByOutfitOutfitIdAndSlotName(Long outfitId, OutfitSlot slot);

    boolean existsByOutfitOutfitIdAndWardrobeItemItemId(Long outfitId, Long itemId);

    /** Xoá toàn bộ item của outfit (khi xây lại outfit) */
    @Modifying
    @Query("DELETE FROM OutfitItem oi WHERE oi.outfit.outfitId = :outfitId")
    int deleteAllByOutfitId(@Param("outfitId") Long outfitId);

    /**
     * Kiểm tra item có đang được dùng trong outfit nào không.
     * Trả về count thay vì boolean (JPQL không hỗ trợ COUNT() > 0 trực tiếp).
     */
    @Query("SELECT COUNT(oi) FROM OutfitItem oi WHERE oi.wardrobeItem.itemId = :itemId")
    long countByWardrobeItemId(@Param("itemId") Long itemId);
}
