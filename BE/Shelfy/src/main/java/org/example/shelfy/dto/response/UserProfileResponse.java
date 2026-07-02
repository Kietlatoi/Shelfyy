package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Builder
public class UserProfileResponse {
    private Long id;
    private UUID publicId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String status;
    private String plan;
    private LocalDateTime planExpiresAt;
    private Integer storageUsed;
    private Integer storageLimit;
    private Integer tryOnCountToday;
    private Integer tryOnLimit;
}
