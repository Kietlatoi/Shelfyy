package org.example.shelfy.service;

import org.example.shelfy.dto.request.UpgradeRequest;
import org.example.shelfy.dto.response.PlanResponse;

import java.util.List;

public interface SubscriptionService {
    List<PlanResponse> getPlans();
    PlanResponse getMyPlan();
    PlanResponse upgrade(UpgradeRequest request);
    PlanResponse cancel();
    void checkExpiredPlans();
}
