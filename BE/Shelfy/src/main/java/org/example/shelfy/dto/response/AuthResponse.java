package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private UserProfileResponse user;
}
