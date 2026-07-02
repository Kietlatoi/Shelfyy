package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Builder
public class ClothingItemResponse {
    private Long id;
    private String name;
    private String brand;
    private String category;
    private String subCategory;
    private String color;
    private String colorHex;
    private String season;
    private String pattern;
    private String size;
    private String material;
    private String imageUrl;
    private String thumbnailUrl;
    private String backgroundRemovedUrl;
    private List<String> tags;
    private Integer wearCount;
    private LocalDateTime lastWornAt;
    private BigDecimal purchasePrice;
    private LocalDate purchaseDate;
    private String sourceUrl;
    private Boolean favorite;
    private LocalDateTime createdAt;
}
