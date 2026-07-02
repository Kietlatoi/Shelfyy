package org.example.shelfy.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.CalendarEventRequest;
import org.example.shelfy.dto.response.CalendarEventResponse;
import org.example.shelfy.dto.response.HomePageResponse;
import org.example.shelfy.service.HomeService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class HomeController {
    private final HomeService homeService;

    @Operation(summary = "Get aggregate HomePage data")
    @GetMapping("/api/home")
    public ResponseEntity<HomePageResponse> home(@RequestParam(required = false) Double lat,
                                                 @RequestParam(required = false) Double lon) {
        return ResponseEntity.ok(homeService.getHome(lat, lon));
    }

    @Operation(summary = "Get user events")
    @GetMapping("/api/events")
    public ResponseEntity<Page<CalendarEventResponse>> events(@RequestParam(required = false) LocalDate from,
                                                              @RequestParam(required = false) LocalDate to,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(homeService.getEvents(from, to, page, size));
    }

    @Operation(summary = "Create event")
    @PostMapping("/api/events")
    public ResponseEntity<CalendarEventResponse> createEvent(@Valid @RequestBody CalendarEventRequest request) {
        return ResponseEntity.ok(homeService.createEvent(request));
    }

    @Operation(summary = "Update event")
    @PutMapping("/api/events/{id}")
    public ResponseEntity<CalendarEventResponse> updateEvent(@PathVariable Long id, @Valid @RequestBody CalendarEventRequest request) {
        return ResponseEntity.ok(homeService.updateEvent(id, request));
    }

    @Operation(summary = "Delete event")
    @DeleteMapping("/api/events/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        homeService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
