package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Builder
public class OutfitResponse {
    private Long id;
    private String name;
    private String occasion;
    private String description;
    private String imageUrl;
    private Boolean favorite;
    private List<ClothingItemResponse> items;
    private LocalDateTime createdAt;
}
