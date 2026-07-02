package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter @Builder
public class HomePageResponse {
    private WeatherResponse weather;
    private CalendarEventResponse upcomingEvent;
    private OutfitSuggestion outfitSuggestion;
    private Stats stats;

    @Getter @Builder
    public static class OutfitSuggestion {
        private String eyebrow;
        private String title;
        private String quote;
        private String imageUrl;
        private List<SuggestedItem> items;
        private int tryOnRemaining;
    }

    @Getter @Builder
    public static class SuggestedItem {
        private String category;
        private String name;
    }

    @Getter @Builder
    public static class Stats {
        private long totalItems;
        private Integer storageUsed;
        private Integer storageLimit;
    }
}
