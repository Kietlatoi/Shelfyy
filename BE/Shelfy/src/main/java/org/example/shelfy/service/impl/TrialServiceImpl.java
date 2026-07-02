package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.TryOnRequest;
import org.example.shelfy.dto.response.TryOnHistoryResponse;
import org.example.shelfy.dto.response.TryOnJobResponse;
import org.example.shelfy.dto.response.TryOnStatusResponse;
import org.example.shelfy.entity.FileAsset;
import org.example.shelfy.entity.TryOnSession;
import org.example.shelfy.entity.User;
import org.example.shelfy.entity.WardrobeItem;
import org.example.shelfy.enums.FileType;
import org.example.shelfy.enums.FileVisibility;
import org.example.shelfy.enums.TryOnStatus;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.FileAssetRepository;
import org.example.shelfy.repository.TryOnSessionRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.repository.WardrobeItemRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.TrialService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TrialServiceImpl implements TrialService {
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final TryOnSessionRepository tryOnSessionRepository;
    private final FileAssetRepository fileAssetRepository;
    private final RestTemplate restTemplate;

    /** FIX #6: Thời gian giả lập xử lý demo job (giây), độc lập với chu kỳ poll. */
    private static final long DEMO_PROCESSING_SECONDS = 5;

    @Value("${replicate.api-token:}") private String replicateToken;
    @Value("${replicate.api-url}") private String replicateUrl;
    @Value("${replicate.model-version}") private String modelVersion;
    @Value("${app.demo-mode:true}") private boolean demoMode;

    @Override
    @Transactional
    public TryOnJobResponse generate(TryOnRequest request) {
        User user = currentUserService.getCurrentUser();
        validateTryOnLimit(user);
        WardrobeItem item = wardrobeItemRepository.findByItemIdAndUserUserIdAndDeletedAtIsNull(request.getClothingItemId(), user.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.WARDROBE_ITEM_NOT_FOUND));
        FileAsset input = fileAssetRepository.save(FileAsset.builder()
                .owner(user)
                .fileUrl(request.getPersonImageUrl())
                .objectKey("external-person-" + UUID.randomUUID())
                .fileType(FileType.TRY_ON_INPUT)
                .mimeType("image/jpeg")
                .visibility(FileVisibility.PRIVATE)
                .build());
        String predictionId = demoMode || replicateToken == null || replicateToken.isBlank()
                ? "demo-" + UUID.randomUUID()
                : createReplicatePrediction(request.getPersonImageUrl(), garmentUrl(item), item);
        TryOnSession session = tryOnSessionRepository.save(TryOnSession.builder()
                .user(user)
                .clothingItem(item)
                .inputFile(input)
                .predictionId(predictionId)
                .status(TryOnStatus.PENDING)
                .build());
        return TryOnJobResponse.builder()
                .jobId(session.getTryOnId())
                .predictionId(predictionId)
                .status(toApiStatus(session.getStatus()))
                .build();
    }

    @Override
    @Transactional
    public TryOnStatusResponse getStatus(Long jobId) {
        TryOnSession session = getOwnedSession(jobId);
        if (session.getStatus() == TryOnStatus.PENDING || session.getStatus() == TryOnStatus.PROCESSING) {
            updateJob(session);
        }
        return toStatusResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TryOnHistoryResponse> getHistory(int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        return tryOnSessionRepository.findByUserUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toHistoryResponse);
    }

    @Override
    @Transactional
    public void deleteHistory(Long id) {
        TryOnSession session = getOwnedSession(id);
        session.setDeletedAt(LocalDateTime.now());
        tryOnSessionRepository.save(session);
    }

    @Override
    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void pollPendingJobs() {
        List<TryOnSession> jobs = new ArrayList<>();
        jobs.addAll(tryOnSessionRepository.findByStatus(TryOnStatus.PENDING));
        jobs.addAll(tryOnSessionRepository.findByStatus(TryOnStatus.PROCESSING));
        jobs.stream().limit(20).forEach(this::updateJob);
    }

    @Override
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void resetDailyTryOnCount() {
        userRepository.resetFreeTryOnCount(LocalDateTime.now());
    }

    private void validateTryOnLimit(User user) {
        LocalDateTime start = "FREE".equalsIgnoreCase(user.getPlan())
                ? LocalDate.now().atStartOfDay()
                : LocalDate.now().with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
        long used = "FREE".equalsIgnoreCase(user.getPlan())
                ? tryOnSessionRepository.countTodayByUserId(user.getUserId(), start)
                : tryOnSessionRepository.countThisMonthByUserId(user.getUserId(), start);
        if (used >= nullSafe(user.getTryOnLimit())) {
            throw new AppException(ErrorCode.TRYON_LIMIT_EXCEEDED);
        }
    }

    private void updateJob(TryOnSession session) {
        // FIX #5: Timeout tính từ lúc job THỰC SỰ bắt đầu xử lý (PROCESSING),
        // không phải từ lúc tạo job (PENDING). Replicate mất trung bình
        // 40-60s để xử lý, nhưng job có thể ngồi ở hàng đợi PENDING một lúc
        // trước khi scheduler (chạy mỗi 10s) nhặt lên và chuyển PROCESSING.
        // Nếu tính timeout từ createdAt, job có thể bị mark FAILED dù
        // Replicate vẫn đang xử lý bình thường.
        //
        // - PENDING: timeout dài hơn (10 phút) để không FAIL job đang chờ
        //   tới lượt scheduler xử lý.
        // - PROCESSING: timeout 5 phút tính từ processingStartedAt, vì
        //   Replicate IDM-VTON thường chỉ mất 40-60s.
        if (session.getStatus() == TryOnStatus.PROCESSING) {
            LocalDateTime processingSince = session.getProcessingStartedAt() != null
                    ? session.getProcessingStartedAt()
                    : session.getCreatedAt();
            if (processingSince != null && processingSince.isBefore(LocalDateTime.now().minusMinutes(5))) {
                session.setStatus(TryOnStatus.FAILED);
                session.setErrorMessage("Job timeout (processing quá 5 phút)");
                tryOnSessionRepository.save(session);
                return;
            }
        } else if (session.getCreatedAt() != null
                && session.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(10))) {
            session.setStatus(TryOnStatus.FAILED);
            session.setErrorMessage("Job timeout (chờ xử lý quá 10 phút)");
            tryOnSessionRepository.save(session);
            return;
        }
        if (demoMode || session.getPredictionId() == null || session.getPredictionId().startsWith("demo-") || replicateToken == null || replicateToken.isBlank()) {
            completeDemoJob(session);
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(replicateToken);
            ResponseEntity<Map> res = restTemplate.exchange(replicateUrl + "/" + session.getPredictionId(), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<?, ?> body = res.getBody();
            String status = body == null ? "failed" : String.valueOf(body.get("status"));
            if ("starting".equals(status) || "processing".equals(status)) {
                if (session.getStatus() != TryOnStatus.PROCESSING) {
                    session.setProcessingStartedAt(LocalDateTime.now());
                }
                session.setStatus(TryOnStatus.PROCESSING);
            } else if ("succeeded".equals(status)) {
                String url = extractOutputUrl(body);
                completeWithUrl(session, url == null ? garmentUrl(session.getClothingItem()) : url);
            } else if ("failed".equals(status) || "canceled".equals(status)) {
                session.setStatus(TryOnStatus.FAILED);
                session.setErrorMessage("Replicate status: " + status);
            }
            tryOnSessionRepository.save(session);
        } catch (Exception e) {
            session.setStatus(TryOnStatus.FAILED);
            session.setErrorMessage(e.getMessage());
            tryOnSessionRepository.save(session);
        }
    }

    private String createReplicatePrediction(String personImageUrl, String garmentUrl, WardrobeItem item) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(replicateToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("model_image", personImageUrl);
            input.put("garment_image", garmentUrl);
            input.put("category", mapCategory(item));
            input.put("flat_lay", false);
            input.put("restore_background", true);
            input.put("restore_clothes", true);
            input.put("num_samples", 1);
            input.put("guidance_scale", 2);
            input.put("timesteps", 50);
            Map<String, Object> body = Map.of("version", modelVersion, "input", input);
            ResponseEntity<Map> res = restTemplate.postForEntity(replicateUrl, new HttpEntity<>(body, headers), Map.class);
            Object id = res.getBody() == null ? null : res.getBody().get("id");
            if (id == null) throw new AppException(ErrorCode.TRYON_PROVIDER_ERROR);
            return String.valueOf(id);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.TRYON_PROVIDER_ERROR, e.getMessage());
        }
    }

    private void completeDemoJob(TryOnSession session) {
        LocalDateTime now = LocalDateTime.now();
        if (session.getStatus() == TryOnStatus.PENDING) {
            session.setStatus(TryOnStatus.PROCESSING);
            session.setProcessingStartedAt(now);
            tryOnSessionRepository.save(session);
            return;
        }
        // FIX #6: Hoàn thành demo job dựa trên THỜI GIAN đã trôi qua kể từ
        // lúc PROCESSING, thay vì dựa vào "lần poll thứ mấy". pollPendingJobs()
        // chạy mỗi 10s, nhưng getStatus() do FE gọi tay cũng invoke updateJob()
        // → nếu dựa vào số lần poll, job có thể hoàn thành sớm/muộn tuỳ ai gọi
        // trước, gây trải nghiệm demo không nhất quán và chậm không cần thiết.
        // Với cách tính theo thời gian, job luôn "xong" đúng sau
        // DEMO_PROCESSING_SECONDS giây kể từ khi PROCESSING, bất kể FE hay
        // scheduler là bên phát hiện ra điều đó trước.
        LocalDateTime processingSince = session.getProcessingStartedAt() != null
                ? session.getProcessingStartedAt()
                : session.getCreatedAt();
        if (processingSince != null && processingSince.isBefore(now.minusSeconds(DEMO_PROCESSING_SECONDS))) {
            completeWithUrl(session, garmentUrl(session.getClothingItem()));
        }
        // Chưa đủ thời gian giả lập xử lý → giữ nguyên PROCESSING, chờ lần poll sau.
    }

    private void completeWithUrl(TryOnSession session, String resultUrl) {
        FileAsset result = fileAssetRepository.save(FileAsset.builder()
                .owner(session.getUser())
                .fileUrl(resultUrl)
                .objectKey("tryon-result-" + UUID.randomUUID())
                .fileType(FileType.TRY_ON_RESULT)
                .mimeType("image/jpeg")
                .visibility(FileVisibility.PRIVATE)
                .build());
        session.setResultFile(result);
        session.setStatus(TryOnStatus.COMPLETED);
        session.setAccuracyScore(BigDecimal.valueOf(98.4));
        session.setProcessingTimeSeconds(BigDecimal.valueOf(4.2));
        session.setCompletedAt(LocalDateTime.now());
        tryOnSessionRepository.save(session);
    }

    private TryOnSession getOwnedSession(Long id) {
        return tryOnSessionRepository.findByTryOnIdAndUserUserId(id, currentUserService.getCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.TRYON_JOB_NOT_FOUND));
    }

    private TryOnStatusResponse toStatusResponse(TryOnSession s) {
        return TryOnStatusResponse.builder()
                .jobId(s.getTryOnId())
                .status(toApiStatus(s.getStatus()))
                .resultImageUrl(s.getResultFile() == null ? null : s.getResultFile().getFileUrl())
                .processingTimeMs(EntityMapper.secondsToMs(s.getProcessingTimeSeconds()))
                .accuracy(s.getAccuracyScore() == null ? null : s.getAccuracyScore() + "%")
                .createdAt(s.getCreatedAt())
                .build();
    }

    private TryOnHistoryResponse toHistoryResponse(TryOnSession s) {
        WardrobeItem item = s.getClothingItem();
        return TryOnHistoryResponse.builder()
                .id(s.getTryOnId())
                .status(toApiStatus(s.getStatus()))
                .resultImageUrl(s.getResultFile() == null ? null : s.getResultFile().getFileUrl())
                .processingTimeMs(EntityMapper.secondsToMs(s.getProcessingTimeSeconds()))
                .createdAt(s.getCreatedAt())
                .clothingItem(item == null ? null : TryOnHistoryResponse.ClothingItemSummary.builder()
                        .id(item.getItemId())
                        .name(item.getItemName())
                        .brand(item.getBrand())
                        .imageUrl(item.getImageFile() == null ? null : item.getImageFile().getFileUrl())
                        .build())
                .build();
    }

    private String toApiStatus(TryOnStatus status) {
        return status == TryOnStatus.COMPLETED ? "DONE" : status.name();
    }

    private String garmentUrl(WardrobeItem item) {
        if (item == null) return null;
        if (item.getBackgroundRemovedUrl() != null && !item.getBackgroundRemovedUrl().isBlank()) return item.getBackgroundRemovedUrl();
        return item.getImageFile() == null ? null : item.getImageFile().getFileUrl();
    }

    private String mapCategory(WardrobeItem item) {
        return switch (item.getCategory()) {
            case BOTTOM -> "bottoms";
            case DRESS -> "one-pieces";
            default -> "tops";
        };
    }

    private String extractOutputUrl(Map<?, ?> body) {
        Object output = body == null ? null : body.get("output");
        if (output instanceof List<?> list && !list.isEmpty()) return String.valueOf(list.get(0));
        if (output instanceof String s) return s;
        return null;
    }

    private int nullSafe(Integer v) { return v == null ? 0 : v; }
}