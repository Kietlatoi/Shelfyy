package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.CalendarEventRequest;
import org.example.shelfy.dto.response.CalendarEventResponse;
import org.example.shelfy.dto.response.HomePageResponse;
import org.example.shelfy.entity.CalendarEvent;
import org.example.shelfy.entity.User;
import org.example.shelfy.entity.WardrobeItem;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.CalendarEventRepository;
import org.example.shelfy.repository.WardrobeItemRepository;
import org.example.shelfy.repository.TryOnSessionRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.HomeService;
import org.example.shelfy.service.WeatherService;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HomeServiceImpl implements HomeService {

    private final CurrentUserService currentUserService;
    private final WeatherService weatherService;
    private final CalendarEventRepository eventRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final TryOnSessionRepository tryOnSessionRepository;
    private final EntityMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public HomePageResponse getHome(Double lat, Double lon) {
        User user = currentUserService.getCurrentUser();

        // Lấy 1 sự kiện sắp tới gần nhất
        List<CalendarEvent> upcoming = eventRepository.findUpcoming(
                user.getUserId(), LocalDateTime.now());

        // FIX #3: Lấy đúng 3 items bằng Pageable — không load toàn bộ tủ đồ.
        // DB tự giới hạn, không cần shuffle toàn bộ rồi limit.
        Page<WardrobeItem> itemPage = wardrobeItemRepository
                .findByUserUserIdAndDeletedAtIsNull(
                        user.getUserId(),
                        PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "createdAt"))
                );
        List<WardrobeItem> items = itemPage.getContent();

        List<HomePageResponse.SuggestedItem> suggested = items.stream()
                .map(i -> HomePageResponse.SuggestedItem.builder()
                        .category(i.getCategory() == null ? null : i.getCategory().name())
                        .name(i.getItemName())
                        .build())
                .toList();

        String imageUrl = items.isEmpty() || items.get(0).getImageFile() == null
                ? null
                : items.get(0).getImageFile().getFileUrl();

        int remaining = calculateTryOnRemaining(user);

        boolean validLocation = lat != null && lon != null
                && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

        return HomePageResponse.builder()
                .weather(weatherService.getCurrentWeather(
                        validLocation ? lat : null,
                        validLocation ? lon : null))
                .upcomingEvent(upcoming.isEmpty() ? null : mapper.toCalendarEvent(upcoming.get(0)))
                .outfitSuggestion(HomePageResponse.OutfitSuggestion.builder()
                        .eyebrow("Gợi ý AI Stylist")
                        .title("Outfit phù hợp hôm nay")
                        .quote("Sự kết hợp giữa nét hiện đại và thoải mái, " +
                                "phù hợp với thời tiết và lịch trình của bạn.")
                        .imageUrl(imageUrl)
                        .items(suggested)
                        .tryOnRemaining(remaining)
                        .build())
                .stats(HomePageResponse.Stats.builder()
                        .totalItems((int) wardrobeItemRepository
                                .countByUserUserIdAndDeletedAtIsNull(user.getUserId()))
                        .storageUsed(user.getStorageUsed())
                        .storageLimit(user.getStorageLimit())
                        .build())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CalendarEventResponse> getEvents(LocalDate from, LocalDate to, int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        LocalDateTime start = (from == null ? LocalDate.now().minusMonths(1) : from).atStartOfDay();
        LocalDateTime end = (to == null ? LocalDate.now().plusMonths(1) : to).atTime(LocalTime.MAX);

        // FIX #4: Truyền Pageable xuống repository — DB tự phân trang.
        // Không load toàn bộ danh sách vào RAM rồi cắt thủ công nữa.
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.ASC, "eventStart")
        );
        return eventRepository
                .findByUserAndDateRange(userId, start, end, pageable)
                .map(mapper::toCalendarEvent);
    }

    @Override
    @Transactional
    public CalendarEventResponse createEvent(CalendarEventRequest request) {
        User user = currentUserService.getCurrentUser();
        CalendarEvent event = new CalendarEvent();
        event.setUser(user);
        apply(event, request);
        return mapper.toCalendarEvent(eventRepository.save(event));
    }

    @Override
    @Transactional
    public CalendarEventResponse updateEvent(Long id, CalendarEventRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        CalendarEvent event = eventRepository.findByEventIdAndUserUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
        apply(event, request);
        return mapper.toCalendarEvent(eventRepository.save(event));
    }

    @Override
    @Transactional
    public void deleteEvent(Long id) {
        int affected = eventRepository.deleteByIdAndUserId(id, currentUserService.getCurrentUserId());
        if (affected == 0) throw new AppException(ErrorCode.EVENT_NOT_FOUND);
    }

    // ── Private helpers ──────────────────────────────────────────

    private int calculateTryOnRemaining(User user) {
        LocalDateTime start = "FREE".equalsIgnoreCase(user.getPlan())
                ? LocalDate.now().atStartOfDay()
                : LocalDate.now().with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
        long used = "FREE".equalsIgnoreCase(user.getPlan())
                ? tryOnSessionRepository.countTodayByUserId(user.getUserId(), start)
                : tryOnSessionRepository.countThisMonthByUserId(user.getUserId(), start);
        return (int) Math.max(0, nullSafe(user.getTryOnLimit()) - used);
    }

    private void apply(CalendarEvent event, CalendarEventRequest request) {
        event.setEventTitle(request.getTitle().trim());
        LocalTime time = request.getEventTime() != null ? request.getEventTime() : LocalTime.of(9, 0);
        event.setEventStart(LocalDateTime.of(request.getEventDate(), time));
        event.setEventEnd(event.getEventStart().plusHours(1));
        event.setLocation(request.getLocation());
        event.setContext(request.getEventType());
        event.setDescription(request.getNote());
    }

    private int nullSafe(Integer v) { return v == null ? 0 : v; }
}