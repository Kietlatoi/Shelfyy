package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class PairingSuggestionResponse {
    private String title;
    private String description;
    private String imageUrl;
}
