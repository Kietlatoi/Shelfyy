package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.UpgradeRequest;
import org.example.shelfy.dto.response.PlanResponse;
import org.example.shelfy.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {
    private final SubscriptionService subscriptionService;

    @Operation(summary = "Get public subscription plans")
    @GetMapping("/plans")
    public ResponseEntity<List<PlanResponse>> plans() {
        return ResponseEntity.ok(subscriptionService.getPlans());
    }

    @Operation(summary = "Get my current plan")
    @GetMapping("/me")
    public ResponseEntity<PlanResponse> me() {
        return ResponseEntity.ok(subscriptionService.getMyPlan());
    }

    @Operation(summary = "Upgrade current user plan in demo mode")
    @PostMapping("/upgrade")
    public ResponseEntity<PlanResponse> upgrade(@Valid @RequestBody UpgradeRequest request) {
        return ResponseEntity.ok(subscriptionService.upgrade(request));
    }

    @Operation(summary = "Cancel current plan")
    @PostMapping("/cancel")
    public ResponseEntity<PlanResponse> cancel() {
        return ResponseEntity.ok(subscriptionService.cancel());
    }
}
