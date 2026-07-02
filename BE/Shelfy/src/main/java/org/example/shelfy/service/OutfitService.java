package org.example.shelfy.service;

import org.example.shelfy.dto.request.OutfitRequest;
import org.example.shelfy.dto.response.OutfitResponse;
import org.springframework.data.domain.Page;


public interface OutfitService {
    Page<OutfitResponse> getMyOutfits(int page, int size);
    OutfitResponse createOutfit(OutfitRequest request);
    void deleteOutfit(Long id);
}
