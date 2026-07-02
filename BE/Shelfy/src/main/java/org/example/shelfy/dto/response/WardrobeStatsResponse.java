package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class WardrobeStatsResponse {
    private long totalItems;
    private Integer storageUsed;
    private Integer storageLimit;
    private int storagePercent;
    private long forgottenCount;
    private long totalOutfits;
    private String mostWornCategory;
}
