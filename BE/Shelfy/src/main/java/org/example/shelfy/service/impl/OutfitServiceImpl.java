package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.OutfitRequest;
import org.example.shelfy.dto.response.OutfitResponse;
import org.example.shelfy.entity.Outfit;
import org.example.shelfy.entity.OutfitItem;
import org.example.shelfy.entity.User;
import org.example.shelfy.entity.WardrobeItem;
import org.example.shelfy.enums.OutfitSlot;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.OutfitItemRepository;
import org.example.shelfy.repository.OutfitRepository;
import org.example.shelfy.repository.WardrobeItemRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.OutfitService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OutfitServiceImpl implements OutfitService {
    private final CurrentUserService currentUserService;
    private final OutfitRepository outfitRepository;
    private final OutfitItemRepository outfitItemRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final EntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Page<OutfitResponse> getMyOutfits(int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return outfitRepository.findByUserUserIdAndDeletedAtIsNull(userId, pageable)
                .map(mapper::toOutfit);
    }

    @Override
    @Transactional
    public OutfitResponse createOutfit(OutfitRequest request) {
        User user = currentUserService.getCurrentUser();

        // FIX #8: Lấy tất cả wardrobe items bằng 1 query IN-clause thay vì
        // 1 query/item (N+1). Với outfit 10 món đồ, giảm từ 20 queries
        // (10 SELECT + 10 INSERT) xuống còn 1 SELECT + 1 batch INSERT.
        List<WardrobeItem> items = wardrobeItemRepository
                .findAllByItemIdInAndUserUserIdAndDeletedAtIsNull(request.getItemIds(), user.getUserId());
        if (items.size() != request.getItemIds().size()) {
            throw new AppException(ErrorCode.WARDROBE_ITEM_NOT_FOUND);
        }
        // Giữ đúng thứ tự map theo id để tra cứu nhanh khi build OutfitItem
        Map<Long, WardrobeItem> itemById = items.stream()
                .collect(Collectors.toMap(WardrobeItem::getItemId, i -> i));

        Outfit outfit = Outfit.builder()
                .user(user)
                .outfitName(request.getName().trim())
                .description(request.getDescription())
                .occasion(request.getOccasion())
                .build();
        outfit = outfitRepository.save(outfit);

        Outfit finalOutfit = outfit;
        List<OutfitItem> outfitItems = request.getItemIds().stream()
                .map(itemById::get)
                .map(item -> OutfitItem.builder()
                        .outfit(finalOutfit)
                        .wardrobeItem(item)
                        .slotName(mapSlot(item))
                        .build())
                .toList();
        outfitItemRepository.saveAll(outfitItems);

        return mapper.toOutfit(outfitRepository.findById(outfit.getOutfitId()).orElse(outfit));
    }

    @Override
    @Transactional
    public void deleteOutfit(Long id) {
        Long userId = currentUserService.getCurrentUserId();
        Outfit outfit = outfitRepository.findByOutfitIdAndUserUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.OUTFIT_NOT_FOUND));
        outfit.setDeletedAt(LocalDateTime.now());
        outfitRepository.save(outfit);
    }

    private OutfitSlot mapSlot(WardrobeItem item) {
        return switch (item.getCategory()) {
            case BOTTOM -> OutfitSlot.BOTTOM;
            case DRESS -> OutfitSlot.DRESS;
            case SHOES -> OutfitSlot.SHOES;
            case BAG -> OutfitSlot.BAG;
            case ACCESSORY -> OutfitSlot.ACCESSORY;
            case OUTERWEAR -> OutfitSlot.OUTERWEAR;
            case TOP -> OutfitSlot.TOP;
            default -> OutfitSlot.OTHER;
        };
    }
}