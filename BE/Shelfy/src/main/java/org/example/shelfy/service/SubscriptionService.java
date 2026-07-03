package org.example.shelfy.service;

import org.example.shelfy.dto.request.UpgradeRequest;
import org.example.shelfy.dto.response.PlanResponse;
import org.example.shelfy.entity.Subscription;

import java.util.List;

public interface SubscriptionService {
    List<PlanResponse> getPlans();
    PlanResponse getMyPlan();
    PlanResponse upgrade(UpgradeRequest request);
    PlanResponse cancel();
    void checkExpiredPlans();

    /**
     * Kích hoạt gói trả phí cho 1 user cụ thể theo userId — dùng bởi PaymentService
     * sau khi VNPay xác nhận thanh toán thành công. Khác với upgrade() (dùng
     * currentUserService lấy user đang đăng nhập trong request context), hàm
     * này nhận thẳng userId vì được gọi từ endpoint callback KHÔNG có JWT
     * (VNPay redirect trình duyệt về, không đính kèm Authorization header).
     */
    Subscription activatePaidPlanForUser(Long userId, String planType);
}
