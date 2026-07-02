package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class TryOnJobResponse {
    private Long jobId;
    private String predictionId;
    private String status;
}
