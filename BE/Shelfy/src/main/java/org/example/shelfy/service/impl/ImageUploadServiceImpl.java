package org.example.shelfy.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.response.ImageUploadResult;
import org.example.shelfy.entity.FileAsset;
import org.example.shelfy.entity.User;
import org.example.shelfy.enums.FileType;
import org.example.shelfy.enums.FileVisibility;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.repository.FileAssetRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.ImageUploadService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class ImageUploadServiceImpl implements ImageUploadService {
    private static final long CLOTHING_MAX = 10L * 1024 * 1024;
    private static final long AVATAR_MAX = 5L * 1024 * 1024;
    private static final int DAILY_UPLOAD_LIMIT = 20;
    private static final List<String> ALLOWED = List.of("image/jpeg", "image/png", "image/webp");

    private final Cloudinary cloudinary;
    private final CurrentUserService currentUserService;
    private final FileAssetRepository fileAssetRepository;
    private final ConcurrentHashMap<Long, AtomicInteger> uploadCountPerUser = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public ImageUploadResult uploadClothingImage(MultipartFile file) {
        User user = currentUserService.getCurrentUser();
        validateFile(file, CLOTHING_MAX);
        checkRateLimit(requireUserId(user));
        String publicId = UUID.randomUUID().toString();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "shelfy/" + user.getPublicId() + "/clothing",
                    "public_id", publicId,
                    "resource_type", "image",
                    "eager", List.of(new Transformation().width(300).height(300).crop("fill").gravity("auto"))
            ));
            String originalUrl = String.valueOf(result.get("secure_url"));
            String objectKey = String.valueOf(result.get("public_id"));
            String thumb = extractEagerUrl(result, originalUrl);
            FileAsset asset = fileAssetRepository.save(FileAsset.builder()
                    .owner(user)
                    .fileUrl(originalUrl)
                    .objectKey(objectKey)
                    .fileType(FileType.WARDROBE_ITEM)
                    .mimeType(file.getContentType())
                    .fileSize(file.getSize())
                    .visibility(FileVisibility.PRIVATE)
                    .build());
            return ImageUploadResult.builder()
                    .fileId(asset.getFileId())
                    .originalUrl(originalUrl)
                    .thumbnailUrl(thumb)
                    .backgroundRemovedUrl(null)
                    .publicId(objectKey)
                    .build();
        } catch (IOException e) {
            throw new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, e.getMessage());
        }
    }

    @Override
    @Transactional
    public ImageUploadResult uploadAvatarImage(MultipartFile file) {
        User user = currentUserService.getCurrentUser();
        validateFile(file, AVATAR_MAX);
        checkRateLimit(requireUserId(user));
        String publicId = UUID.randomUUID().toString();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "shelfy/" + user.getPublicId() + "/avatar",
                    "public_id", publicId,
                    "resource_type", "image",
                    "transformation", new Transformation().width(400).height(400).crop("fill").gravity("face")
            ));
            String originalUrl = String.valueOf(result.get("secure_url"));
            String objectKey = String.valueOf(result.get("public_id"));
            FileAsset asset = fileAssetRepository.save(FileAsset.builder()
                    .owner(user)
                    .fileUrl(originalUrl)
                    .objectKey(objectKey)
                    .fileType(FileType.AVATAR)
                    .mimeType(file.getContentType())
                    .fileSize(file.getSize())
                    .visibility(FileVisibility.PRIVATE)
                    .build());
            user.setAvatarFile(asset);
            return ImageUploadResult.builder()
                    .fileId(asset.getFileId())
                    .originalUrl(originalUrl)
                    .thumbnailUrl(originalUrl)
                    .publicId(objectKey)
                    .build();
        } catch (IOException e) {
            throw new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, e.getMessage());
        }
    }

    @Override
    public void deleteImage(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new AppException(ErrorCode.IMAGE_UPLOAD_FAILED, e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyUploadLimit() {
        uploadCountPerUser.clear();
    }

    private void validateFile(MultipartFile file, long maxSize) {
        if (file == null || file.isEmpty() || file.getContentType() == null || !ALLOWED.contains(file.getContentType())) {
            throw new AppException(ErrorCode.IMAGE_INVALID_FORMAT);
        }
        if (file.getSize() > maxSize) {
            throw new AppException(ErrorCode.IMAGE_TOO_LARGE);
        }
    }

    private Long requireUserId(User user) {
        if (user == null || user.getUserId() == null) {
            throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, "Không xác định được người dùng hiện tại");
        }
        return user.getUserId();
    }

    private void checkRateLimit(Long userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, "Không xác định được người dùng hiện tại");
        }
        int count = uploadCountPerUser.computeIfAbsent(userId, id -> new AtomicInteger()).incrementAndGet();
        if (count > DAILY_UPLOAD_LIMIT) {
            throw new AppException(ErrorCode.IMAGE_UPLOAD_LIMIT_EXCEEDED);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractEagerUrl(Map<?, ?> result, String fallback) {
        Object eagerObj = result.get("eager");
        if (eagerObj instanceof List<?> eager && !eager.isEmpty() && eager.get(0) instanceof Map<?, ?> first) {
            Object url = first.get("secure_url");
            if (url != null) return String.valueOf(url);
        }
        return fallback;
    }
}
