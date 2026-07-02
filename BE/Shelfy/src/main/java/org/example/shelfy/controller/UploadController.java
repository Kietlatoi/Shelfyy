package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.response.ImageUploadResult;
import org.example.shelfy.service.ImageUploadService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {
    private final ImageUploadService imageUploadService;

    @Operation(summary = "Upload clothing image to Cloudinary")
    @PostMapping(value = "/clothing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageUploadResult> uploadClothing(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(imageUploadService.uploadClothingImage(file));
    }

    @Operation(summary = "Upload avatar image to Cloudinary")
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageUploadResult> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(imageUploadService.uploadAvatarImage(file));
    }
}
