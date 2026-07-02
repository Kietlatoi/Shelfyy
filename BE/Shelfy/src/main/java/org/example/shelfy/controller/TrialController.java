package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.TryOnRequest;
import org.example.shelfy.dto.response.TryOnHistoryResponse;
import org.example.shelfy.dto.response.TryOnJobResponse;
import org.example.shelfy.dto.response.TryOnStatusResponse;
import org.example.shelfy.service.TrialService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trial")
@RequiredArgsConstructor
public class TrialController {
    private final TrialService trialService;

    @Operation(summary = "Generate virtual try-on job")
    @PostMapping("/generate")
    public ResponseEntity<TryOnJobResponse> generate(@Valid @RequestBody TryOnRequest request) {
        return ResponseEntity.ok(trialService.generate(request));
    }

    @Operation(summary = "Get try-on job status")
    @GetMapping("/{jobId}/status")
    public ResponseEntity<TryOnStatusResponse> status(@PathVariable Long jobId) {
        return ResponseEntity.ok(trialService.getStatus(jobId));
    }

    @Operation(summary = "Get try-on history")
    @GetMapping("/history")
    public ResponseEntity<Page<TryOnHistoryResponse>> history(@RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(trialService.getHistory(page, size));
    }

    @Operation(summary = "Delete try-on history")
    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        trialService.deleteHistory(id);
        return ResponseEntity.noContent().build();
    }
}
