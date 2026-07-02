package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter @Builder
public class TryOnStatusResponse {
    private Long jobId;
    private String status;
    private String resultImageUrl;
    private Long processingTimeMs;
    private String accuracy;
    private LocalDateTime createdAt;
}
