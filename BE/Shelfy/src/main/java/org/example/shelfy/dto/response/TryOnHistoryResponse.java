package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter @Builder
public class TryOnHistoryResponse {
    private Long id;
    private String status;
    private String resultImageUrl;
    private ClothingItemSummary clothingItem;
    private Long processingTimeMs;
    private LocalDateTime createdAt;

    @Getter @Builder
    public static class ClothingItemSummary {
        private Long id;
        private String name;
        private String brand;
        private String imageUrl;
    }
}
