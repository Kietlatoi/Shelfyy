package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.ClothingItemRequest;
import org.example.shelfy.dto.request.OutfitRequest;
import org.example.shelfy.dto.response.*;
import org.example.shelfy.service.OutfitService;
import org.example.shelfy.service.WardrobeService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class WardrobeController {
    private final WardrobeService wardrobeService;
    private final OutfitService outfitService;

    @Operation(summary = "Get wardrobe items with filters")
    @GetMapping("/api/wardrobe/items")
    public ResponseEntity<Page<ClothingItemResponse>> getItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String season,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(wardrobeService.getItems(category, season, color, q, page, size));
    }

    @Operation(summary = "Create wardrobe item")
    @PostMapping("/api/wardrobe/items")
    public ResponseEntity<ClothingItemResponse> create(@Valid @RequestBody ClothingItemRequest request) {
        return ResponseEntity.ok(wardrobeService.createItem(request));
    }

    @Operation(summary = "Get wardrobe item detail")
    @GetMapping("/api/wardrobe/items/{id}")
    public ResponseEntity<ClothingItemResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(wardrobeService.getItem(id));
    }

    @Operation(summary = "Update wardrobe item")
    @PutMapping("/api/wardrobe/items/{id}")
    public ResponseEntity<ClothingItemResponse> update(@PathVariable Long id, @Valid @RequestBody ClothingItemRequest request) {
        return ResponseEntity.ok(wardrobeService.updateItem(id, request));
    }

    @Operation(summary = "Soft delete wardrobe item")
    @DeleteMapping("/api/wardrobe/items/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        wardrobeService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get pairing suggestions")
    @GetMapping("/api/wardrobe/items/{id}/pairings")
    public ResponseEntity<List<PairingSuggestionResponse>> pairings(@PathVariable Long id) {
        return ResponseEntity.ok(wardrobeService.getPairings(id));
    }

    @Operation(summary = "Mark item as worn")
    @PatchMapping("/api/wardrobe/items/{id}/wear")
    public ResponseEntity<ClothingItemResponse> wear(@PathVariable Long id) {
        return ResponseEntity.ok(wardrobeService.wearItem(id));
    }

    @Operation(summary = "Get wardrobe stats")
    @GetMapping("/api/wardrobe/stats")
    public ResponseEntity<WardrobeStatsResponse> stats() {
        return ResponseEntity.ok(wardrobeService.getStats());
    }

    @Operation(summary = "Get outfits")
    @GetMapping("/api/outfits")
    public ResponseEntity<Page<OutfitResponse>> outfits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(outfitService.getMyOutfits(page, size));
    }

    @Operation(summary = "Create outfit")
    @PostMapping("/api/outfits")
    public ResponseEntity<OutfitResponse> createOutfit(@Valid @RequestBody OutfitRequest request) {
        return ResponseEntity.ok(outfitService.createOutfit(request));
    }

    @Operation(summary = "Delete outfit")
    @DeleteMapping("/api/outfits/{id}")
    public ResponseEntity<Void> deleteOutfit(@PathVariable Long id) {
        outfitService.deleteOutfit(id);
        return ResponseEntity.noContent().build();
    }
}
