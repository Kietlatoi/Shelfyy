package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ImageUploadResult {
    private Long fileId;
    private String originalUrl;
    private String thumbnailUrl;
    private String backgroundRemovedUrl;
    private String publicId;
}
