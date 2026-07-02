package org.example.shelfy.service;

import org.example.shelfy.dto.response.ImageUploadResult;
import org.springframework.web.multipart.MultipartFile;

public interface ImageUploadService {
    ImageUploadResult uploadClothingImage(MultipartFile file);
    ImageUploadResult uploadAvatarImage(MultipartFile file);
    void deleteImage(String publicId);
}
