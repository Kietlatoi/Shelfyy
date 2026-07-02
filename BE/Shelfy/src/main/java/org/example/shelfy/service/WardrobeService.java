package org.example.shelfy.service;

import org.example.shelfy.dto.request.ClothingItemRequest;
import org.example.shelfy.dto.response.ClothingItemResponse;
import org.example.shelfy.dto.response.PairingSuggestionResponse;
import org.example.shelfy.dto.response.WardrobeStatsResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface WardrobeService {
    Page<ClothingItemResponse> getItems(String category, String season, String color, String q, int page, int size);
    ClothingItemResponse createItem(ClothingItemRequest request);
    ClothingItemResponse getItem(Long id);
    ClothingItemResponse updateItem(Long id, ClothingItemRequest request);
    void deleteItem(Long id);
    List<PairingSuggestionResponse> getPairings(Long id);
    ClothingItemResponse wearItem(Long id);
    WardrobeStatsResponse getStats();
}
