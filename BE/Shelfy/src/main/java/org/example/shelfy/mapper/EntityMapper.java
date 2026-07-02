package org.example.shelfy.mapper;

import org.example.shelfy.dto.response.*;
import org.example.shelfy.entity.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Component
public class EntityMapper {
    public UserProfileResponse toUserProfile(User user) {
        String avatarUrl = user.getAvatarFile() == null ? null : user.getAvatarFile().getFileUrl();
        return UserProfileResponse.builder()
                .id(user.getUserId())
                .publicId(user.getPublicId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(avatarUrl)
                .status(user.getStatus().name())
                .plan(user.getPlan())
                .planExpiresAt(user.getPlanExpiresAt())
                .storageUsed(user.getStorageUsed())
                .storageLimit(user.getStorageLimit())
                .tryOnCountToday(user.getTryOnCountToday())
                .tryOnLimit(user.getTryOnLimit())
                .build();
    }

    public ClothingItemResponse toClothingItem(WardrobeItem item) {
        String imageUrl = item.getImageFile() == null ? null : item.getImageFile().getFileUrl();
        String thumbnail = item.getThumbnailUrl() != null ? item.getThumbnailUrl() : imageUrl;
        return ClothingItemResponse.builder()
                .id(item.getItemId())
                .name(item.getItemName())
                .brand(item.getBrand())
                .category(item.getCategory() == null ? null : item.getCategory().name())
                .subCategory(item.getSubCategory())
                .color(item.getColor())
                .colorHex(item.getColorHex())
                .season(item.getSeason())
                .pattern(item.getPattern())
                .size(item.getSize())
                .material(item.getMaterial())
                .imageUrl(imageUrl)
                .thumbnailUrl(thumbnail)
                .backgroundRemovedUrl(item.getBackgroundRemovedUrl())
                .tags(toTags(item.getTags()))
                .wearCount(item.getWearCount())
                .lastWornAt(item.getLastWornAt())
                .purchasePrice(item.getPurchasePrice())
                .purchaseDate(item.getPurchaseDate())
                .sourceUrl(item.getSourceUrl())
                .favorite(Boolean.TRUE.equals(item.getIsFavorite()))
                .createdAt(item.getCreatedAt())
                .build();
    }

    public OutfitResponse toOutfit(Outfit outfit) {
        List<ClothingItemResponse> items = outfit.getOutfitItems() == null ? List.of() : outfit.getOutfitItems().stream()
                .map(OutfitItem::getWardrobeItem)
                .filter(Objects::nonNull)
                .map(this::toClothingItem)
                .toList();
        return OutfitResponse.builder()
                .id(outfit.getOutfitId())
                .name(outfit.getOutfitName())
                .occasion(outfit.getOccasion())
                .description(outfit.getDescription())
                .imageUrl(outfit.getImageFile() == null ? null : outfit.getImageFile().getFileUrl())
                .favorite(Boolean.TRUE.equals(outfit.getIsFavorite()))
                .items(items)
                .createdAt(outfit.getCreatedAt())
                .build();
    }

    public CalendarEventResponse toCalendarEvent(CalendarEvent event) {
        LocalDateTime start = event.getEventStart();
        return CalendarEventResponse.builder()
                .id(event.getEventId())
                .title(event.getEventTitle())
                .eventDate(start == null ? null : start.toLocalDate())
                .eventTime(start == null ? null : start.toLocalTime())
                .location(event.getLocation())
                .eventType(event.getContext())
                .note(event.getDescription())
                .build();
    }

    public static String tagsToCsv(List<String> tags) {
        if (tags == null || tags.isEmpty()) return null;
        return tags.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isBlank()).reduce((a,b) -> a + "," + b).orElse(null);
    }

    public static List<String> toTags(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList();
    }

    public static long secondsToMs(BigDecimal seconds) {
        if (seconds == null) return 0;
        return seconds.multiply(BigDecimal.valueOf(1000)).longValue();
    }
}
