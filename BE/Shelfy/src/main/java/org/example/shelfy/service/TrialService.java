package org.example.shelfy.service;

import org.example.shelfy.dto.request.TryOnRequest;
import org.example.shelfy.dto.response.TryOnHistoryResponse;
import org.example.shelfy.dto.response.TryOnJobResponse;
import org.example.shelfy.dto.response.TryOnStatusResponse;
import org.springframework.data.domain.Page;

public interface TrialService {
    TryOnJobResponse generate(TryOnRequest request);
    TryOnStatusResponse getStatus(Long jobId);
    Page<TryOnHistoryResponse> getHistory(int page, int size);
    void deleteHistory(Long id);
    void pollPendingJobs();
    void resetDailyTryOnCount();
}
