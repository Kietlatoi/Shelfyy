package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Builder
public class PlanResponse {
    private String currentPlan;
    private String planName;
    private String displayName;
    private BigDecimal price;
    private String currency;
    private LocalDateTime planStartedAt;
    private LocalDateTime planExpiresAt;
    private Integer storageUsed;
    private Integer storageLimit;
    private Integer tryOnCountToday;
    private Integer tryOnLimit;
    private Features features;
    private List<PlanResponse> availablePlans;

    @Getter @Builder
    public static class Features {
        private boolean unlimitedStorage;
        private boolean autoBackgroundRemoval;
        private int tryOnPerDay;
        private int tryOnPerMonth;
    }
}
