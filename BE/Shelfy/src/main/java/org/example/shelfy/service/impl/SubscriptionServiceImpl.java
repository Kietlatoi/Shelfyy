package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.UpgradeRequest;
import org.example.shelfy.dto.response.PlanResponse;
import org.example.shelfy.entity.Plan;
import org.example.shelfy.entity.Subscription;
import org.example.shelfy.entity.User;
import org.example.shelfy.enums.SubscriptionStatus;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.repository.PlanRepository;
import org.example.shelfy.repository.SubscriptionRepository;
import org.example.shelfy.repository.UserRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.SubscriptionService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PlanResponse> getPlans() {
        List<Plan> plans = planRepository.findByIsActiveTrueOrderByPriceAsc();
        if (plans.isEmpty()) {
            return List.of(staticPlan("FREE", "Miễn phí", BigDecimal.ZERO, 100, 5),
                    staticPlan("PRO", "Gói Pro", BigDecimal.valueOf(59000), -1, 100),
                    staticPlan("PREMIUM", "Gói Premium", BigDecimal.valueOf(590000), -1, 100));
        }
        return plans.stream().map(this::toPublicPlan).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PlanResponse getMyPlan() {
        return toUserPlan(currentUserService.getCurrentUser());
    }

    @Override
    @Transactional
    public PlanResponse upgrade(UpgradeRequest request) {
        User user = currentUserService.getCurrentUser();
        String planType = normalizePlan(request.getPlanType());
        if ("FREE".equals(planType)) throw new AppException(ErrorCode.SUBSCRIPTION_INVALID_PLAN);
        LocalDateTime now = LocalDateTime.now();
        boolean hasActivePaidPlan = user.getPlanExpiresAt() != null
                && user.getPlanExpiresAt().isAfter(now)
                && user.getPlan() != null
                && !"FREE".equalsIgnoreCase(user.getPlan());

        if (hasActivePaidPlan && planRank(user.getPlan()) > planRank(planType)) {
            throw new AppException(ErrorCode.SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED);
        }

        int days = "PREMIUM".equals(planType) ? 365 : 30;
        LocalDateTime expiryBase = hasActivePaidPlan && planRank(user.getPlan()) == planRank(planType)
                ? user.getPlanExpiresAt()
                : now;

        user.setPlan(planType);
        user.setPlanExpiresAt(expiryBase.plusDays(days));
        user.setStorageLimit(-1);
        user.setTryOnLimit(100);
        user = userRepository.save(user);

        // FIX #9: KHÔNG tự tạo Plan mới nếu không tìm thấy. V2__seed_base_data.sql
        // đã seed sẵn các plan; nếu seed chạy đúng, findByPlanName luôn tìm được.
        // Việc auto-tạo (orElseGet + save) khiến mỗi lần upgrade mà DB trống/seed
        // fail sẽ tạo thêm 1 bản ghi Plan mới → bảng plans bị duplicate.
        // Nếu plan không tồn tại, đây là lỗi cấu hình hệ thống, không phải lỗi
        // người dùng — throw để báo rõ thay vì âm thầm tạo dữ liệu rác.
        Plan plan = planRepository.findByPlanName(planType)
                .orElseThrow(() -> new AppException(ErrorCode.SUBSCRIPTION_INVALID_PLAN));
        subscriptionRepository.save(Subscription.builder()
                .user(user)
                .plan(plan)
                .startDate(now)
                .endDate(user.getPlanExpiresAt())
                .status(SubscriptionStatus.ACTIVE)
                .build());
        return toUserPlan(user);
    }

    @Override
    @Transactional
    public PlanResponse cancel() {
        User user = currentUserService.getCurrentUser();
        if (user.getStorageUsed() != null && user.getStorageUsed() > 100) {
            throw new AppException(ErrorCode.SUBSCRIPTION_CANCEL_STORAGE_EXCEEDED);
        }
        user.setPlan("FREE");
        user.setPlanExpiresAt(null);
        user.setStorageLimit(100);
        user.setTryOnLimit(5);
        user = userRepository.save(user);
        subscriptionRepository.findActiveByUserId(user.getUserId(), LocalDateTime.now()).ifPresent(s -> {
            s.setStatus(SubscriptionStatus.CANCELLED);
            s.setCancelledAt(LocalDateTime.now());
            subscriptionRepository.save(s);
        });
        return toUserPlan(user);
    }

    @Override
    @Scheduled(cron = "59 59 23 * * *")
    @Transactional
    public void checkExpiredPlans() {
        LocalDateTime now = LocalDateTime.now();

        userRepository.resetExpiredPlans(now);

        // Đánh dấu subscription EXPIRED trong DB
        subscriptionRepository.markExpired(now);
    }

    private PlanResponse toUserPlan(User user) {
        return PlanResponse.builder()
                .currentPlan(user.getPlan())
                .planName(user.getPlan())
                .displayName(displayName(user.getPlan()))
                .price(priceOf(user.getPlan()))
                .currency("VND")
                .planExpiresAt(user.getPlanExpiresAt())
                .storageUsed(user.getStorageUsed())
                .storageLimit(user.getStorageLimit())
                .tryOnCountToday("FREE".equalsIgnoreCase(user.getPlan()) ? user.getTryOnCountToday() : 0)
                .tryOnLimit(user.getTryOnLimit())
                .features(features(user.getPlan()))
                .build();
    }

    private PlanResponse toPublicPlan(Plan plan) {
        return PlanResponse.builder()
                .planName(plan.getPlanName())
                .displayName(plan.getDisplayName())
                .price(plan.getPrice())
                .currency(plan.getCurrency())
                .storageLimit(plan.getWardrobeLimit() == null ? -1 : plan.getWardrobeLimit())
                .tryOnLimit(plan.getTryOnLimitPerMonth())
                .features(features(plan.getPlanName()))
                .build();
    }

    private PlanResponse staticPlan(String name, String display, BigDecimal price, int storage, int tryOn) {
        return PlanResponse.builder().planName(name).displayName(display).price(price).currency("VND")
                .storageLimit(storage).tryOnLimit(tryOn).features(features(name)).build();
    }

    private PlanResponse.Features features(String plan) {
        boolean paid = plan != null && !"FREE".equalsIgnoreCase(plan);
        return PlanResponse.Features.builder()
                .unlimitedStorage(paid)
                .autoBackgroundRemoval(paid)
                .tryOnPerDay(paid ? 0 : 5)
                .tryOnPerMonth(paid ? 100 : 0)
                .build();
    }

    private String normalizePlan(String raw) {
        String plan = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (!plan.equals("PRO") && !plan.equals("PREMIUM")) throw new AppException(ErrorCode.SUBSCRIPTION_INVALID_PLAN);
        return plan;
    }
    private int planRank(String plan) {
        return switch (plan == null ? "" : plan.trim().toUpperCase(Locale.ROOT)) {
            case "PREMIUM" -> 2;
            case "PRO" -> 1;
            default -> 0;
        };
    }

    private String displayName(String p) { return "PREMIUM".equals(p) ? "Gói Premium" : "PRO".equals(p) ? "Gói Pro" : "Miễn phí"; }
    private BigDecimal priceOf(String p) { return "PREMIUM".equals(p) ? BigDecimal.valueOf(590000) : "PRO".equals(p) ? BigDecimal.valueOf(59000) : BigDecimal.ZERO; }
}