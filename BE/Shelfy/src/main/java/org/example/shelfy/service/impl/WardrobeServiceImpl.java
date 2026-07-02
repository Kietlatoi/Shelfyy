package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.ClothingItemRequest;
import org.example.shelfy.dto.response.ClothingItemResponse;
import org.example.shelfy.dto.response.PairingSuggestionResponse;
import org.example.shelfy.dto.response.WardrobeStatsResponse;
import org.example.shelfy.entity.FileAsset;
import org.example.shelfy.entity.User;
import org.example.shelfy.entity.WardrobeItem;
import org.example.shelfy.enums.FileType;
import org.example.shelfy.enums.FileVisibility;
import org.example.shelfy.enums.WardrobeCategory;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.FileAssetRepository;
import org.example.shelfy.repository.OutfitRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.repository.WardrobeItemRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.ImageUploadService;
import org.example.shelfy.service.WardrobeService;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WardrobeServiceImpl implements WardrobeService {

    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final OutfitRepository outfitRepository;
    private final FileAssetRepository fileAssetRepository;
    private final ImageUploadService imageUploadService;
    private final EntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Page<ClothingItemResponse> getItems(String category, String season,
                                               String color, String q,
                                               int page, int size) {
        User user = currentUserService.getCurrentUser();
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        WardrobeCategory cat = null;
        if (category != null && !category.isBlank()) {
            try {
                cat = WardrobeServiceImpl.parseCategory(category);
            } catch (AppException e) {
                throw new AppException(ErrorCode.WARDROBE_INVALID_CATEGORY);
            }
        }

        if (q != null && !q.isBlank()) {
            return wardrobeItemRepository
                    .search(user.getUserId(), q.trim(), pageable)
                    .map(mapper::toClothingItem);
        }

        return wardrobeItemRepository
                .findWithFilters(
                        user.getUserId(),
                        cat == null ? null : cat.name(),
                        season == null || season.isBlank() ? null : season.trim(),
                        color == null || color.isBlank() ? null : color.trim(),
                        pageable
                )
                .map(mapper::toClothingItem);
    }

    @Override
    @Transactional
    public ClothingItemResponse createItem(ClothingItemRequest request) {
        User user = currentUserService.getCurrentUser();

        // FIX #6: Dùng atomic increment ở DB để tránh race condition.
        // incrementStorageUsed trả 0 nếu đã đầy → throw ngay, không cần load user trước.
        if (user.getStorageLimit() != null && user.getStorageLimit() != -1) {
            int affected = userRepository.incrementStorageUsed(user.getUserId());
            if (affected == 0) {
                throw new AppException(ErrorCode.WARDROBE_STORAGE_FULL);
            }
        }

        WardrobeItem item = new WardrobeItem();
        item.setUser(user);
        applyRequest(item, request, user);
        return mapper.toClothingItem(wardrobeItemRepository.save(item));
    }

    @Override
    @Transactional(readOnly = true)
    public ClothingItemResponse getItem(Long id) {
        return mapper.toClothingItem(getOwnedItem(id));
    }

    @Override
    @Transactional
    public ClothingItemResponse updateItem(Long id, ClothingItemRequest request) {
        User user = currentUserService.getCurrentUser();
        WardrobeItem item = getOwnedItem(id);
        applyRequest(item, request, user);
        return mapper.toClothingItem(wardrobeItemRepository.save(item));
    }

    @Override
    @Transactional
    public void deleteItem(Long id) {
        User user = currentUserService.getCurrentUser();
        WardrobeItem item = getOwnedItem(id);
        item.setDeletedAt(LocalDateTime.now());
        wardrobeItemRepository.save(item);
        // Giảm storageUsed, không bao giờ xuống dưới 0
        userRepository.decrementStorageUsed(user.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PairingSuggestionResponse> getPairings(Long id) {
        User user = currentUserService.getCurrentUser();
        WardrobeItem base = getOwnedItem(id);

        // FIX #1: Dùng query sẵn trong repository — không load toàn bộ tủ đồ vào RAM.
        // Lấy các item KHÁC category với base để gợi ý phối đồ.
        List<WardrobeCategory> pairingCategories = Arrays.stream(WardrobeCategory.values())
                .filter(c -> c != base.getCategory())
                .collect(Collectors.toList());

        List<WardrobeItem> candidates = wardrobeItemRepository.findForOutfitSuggestion(
                user.getUserId(),
                pairingCategories,
                List.of(base.getItemId())
        );

        // Shuffle và lấy tối đa 2 gợi ý
        Collections.shuffle(candidates);
        return candidates.stream()
                .limit(2)
                .map(i -> PairingSuggestionResponse.builder()
                        .title(i.getItemName())
                        .description("Phối cùng " + base.getItemName() + " để tạo outfit cân bằng")
                        .imageUrl(i.getImageFile() == null ? null : i.getImageFile().getFileUrl())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public ClothingItemResponse wearItem(Long id) {
        WardrobeItem item = getOwnedItem(id);
        item.setWearCount(nullSafe(item.getWearCount()) + 1);
        item.setLastWornAt(LocalDateTime.now());
        return mapper.toClothingItem(wardrobeItemRepository.save(item));
    }

    @Override
    @Transactional(readOnly = true)
    public WardrobeStatsResponse getStats() {
        User user = currentUserService.getCurrentUser();
        Long userId = user.getUserId();

        // FIX #2: Dùng COUNT queries thay vì load toàn bộ items vào RAM.
        long totalItems = wardrobeItemRepository.countByUserUserIdAndDeletedAtIsNull(userId);
        long forgottenCount = wardrobeItemRepository.countForgottenByUserId(
                userId, LocalDateTime.now().minusDays(30));

        String mostCategory = wardrobeItemRepository.countGroupedByCategory(userId).stream()
                .max(Comparator.comparingLong(row -> (Long) row[1]))
                .map(row -> String.valueOf(row[0]))
                .orElse(null);

        int storageUsed = nullSafe(user.getStorageUsed());
        int storageLimit = user.getStorageLimit() == null ? 100 : user.getStorageLimit();
        int percent = storageLimit == -1 ? 0
                : (int) Math.min(100, Math.round(storageUsed * 100.0 / Math.max(storageLimit, 1)));

        long totalOutfits = outfitRepository.countByUserUserIdAndSourceAndDeletedAtIsNull(
                userId, org.example.shelfy.enums.OutfitSource.USER_CREATED);

        return WardrobeStatsResponse.builder()
                .totalItems((int) totalItems)
                .storageUsed(storageUsed)
                .storageLimit(storageLimit)
                .storagePercent(percent)
                .forgottenCount(forgottenCount)
                .totalOutfits(totalOutfits)
                .mostWornCategory(mostCategory)
                .build();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private WardrobeItem getOwnedItem(Long id) {
        Long userId = currentUserService.getCurrentUserId();
        return wardrobeItemRepository.findByItemIdAndUserUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.WARDROBE_ITEM_NOT_FOUND));
    }

    private void applyRequest(WardrobeItem item, ClothingItemRequest request, User user) {
        item.setItemName(request.getName().trim());
        item.setBrand(blankToNull(request.getBrand()));
        item.setCategory(parseCategory(request.getCategory()));
        item.setSubCategory(blankToNull(request.getSubCategory()));
        item.setColor(blankToNull(request.getColor()));
        item.setColorHex(blankToNull(request.getColorHex()));
        item.setSeason(blankToNull(request.getSeason()));
        item.setPattern(blankToNull(request.getPattern()));
        item.setSize(blankToNull(request.getSize()));
        item.setMaterial(blankToNull(request.getMaterial()));
        item.setThumbnailUrl(blankToNull(request.getThumbnailUrl()));
        item.setBackgroundRemovedUrl(blankToNull(request.getBackgroundRemovedUrl()));
        item.setTags(EntityMapper.tagsToCsv(request.getTags()));
        item.setPurchasePrice(request.getPurchasePrice());
        item.setPurchaseDate(request.getPurchaseDate());
        item.setSourceUrl(blankToNull(request.getSourceUrl()));

        if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
            boolean sameUrl = item.getImageFile() != null
                    && request.getImageUrl().equals(item.getImageFile().getFileUrl());
            if (!sameUrl) {
                // FIX #10: Xóa FileAsset cũ khỏi Cloudinary và DB để tránh orphan.
                if (item.getImageFile() != null) {
                    String oldPublicId = item.getImageFile().getObjectKey();
                    Long oldFileId = item.getImageFile().getFileId();
                    item.setImageFile(null); // tách liên kết trước khi xóa
                    if (oldPublicId != null && !oldPublicId.startsWith("external-")) {
                        try {
                            imageUploadService.deleteImage(oldPublicId);
                        } catch (Exception ex) {
                            // Không block luồng chính nếu Cloudinary xóa thất bại
                        }
                    }
                    fileAssetRepository.deleteById(oldFileId);
                }

                FileAsset newFile = fileAssetRepository.save(FileAsset.builder()
                        .owner(user)
                        .fileUrl(request.getImageUrl())
                        .objectKey(UUID.randomUUID().toString())
                        .fileType(FileType.WARDROBE_ITEM)
                        .mimeType("image/jpeg")
                        .visibility(FileVisibility.PRIVATE)
                        .build());
                item.setImageFile(newFile);
            }
        }
    }

    public static WardrobeCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) throw new AppException(ErrorCode.WARDROBE_INVALID_CATEGORY);

        String trimmed = raw.trim();
        try {
            return WardrobeCategory.valueOf(trimmed.toUpperCase(Locale.ROOT));
        } catch (Exception ignored) { }

        String value = trimmed.toLowerCase(Locale.ROOT);

        // Kiểm tra nhóm cụ thể trước nhóm rộng.
        if (value.contains("khoác") || value.contains("khoac") || value.contains("blazer")
                || value.contains("jacket") || value.contains("coat") || value.contains("outer"))
            return WardrobeCategory.OUTERWEAR;
        if (value.contains("phụ kiện") || value.contains("phu kien") || value.contains("accessory")
                || value.contains("accessories") || value.contains("access"))
            return WardrobeCategory.ACCESSORY;
        if (value.contains("quần") || value.contains("quan") || value.contains("pants")
                || value.contains("trouser") || value.contains("jean") || value.contains("bottom"))
            return WardrobeCategory.BOTTOM;
        if (value.contains("váy") || value.contains("vay") || value.contains("đầm")
                || value.contains("dam") || value.contains("dress"))
            return WardrobeCategory.DRESS;
        if (value.contains("giày") || value.contains("giay") || value.contains("shoe")
                || value.contains("sneaker") || value.contains("boot"))
            return WardrobeCategory.SHOES;
        if (value.contains("túi") || value.contains("tui") || value.contains("bag")
                || value.contains("balo"))
            return WardrobeCategory.BAG;
        if (value.contains("áo") || value.contains("ao") || value.contains("shirt")
                || value.contains("t-shirt") || value.contains("top"))
            return WardrobeCategory.TOP;

        return WardrobeCategory.OTHER;
    }

    private String blankToNull(String v) { return v == null || v.isBlank() ? null : v.trim(); }
    private int nullSafe(Integer v) { return v == null ? 0 : v; }
}