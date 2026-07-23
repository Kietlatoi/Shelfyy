package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.request.CalendarEventRequest;
import org.example.shelfy.dto.response.CalendarEventResponse;
import org.example.shelfy.entity.CalendarEvent;
import org.example.shelfy.entity.User;
import org.example.shelfy.exception.AppException;
import org.example.shelfy.exception.ErrorCode;
import org.example.shelfy.mapper.EntityMapper;
import org.example.shelfy.repository.CalendarEventRepository;
import org.example.shelfy.service.CurrentUserService;
import org.example.shelfy.service.HomeService;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class HomeServiceImpl implements HomeService {

    private final CurrentUserService currentUserService;
    private final CalendarEventRepository eventRepository;
    private final EntityMapper mapper;

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

    private void apply(CalendarEvent event, CalendarEventRequest request) {
        event.setEventTitle(request.getTitle().trim());
        LocalTime time = request.getEventTime() != null ? request.getEventTime() : LocalTime.of(9, 0);
        event.setEventStart(LocalDateTime.of(request.getEventDate(), time));
        event.setEventEnd(event.getEventStart().plusHours(1));
        event.setLocation(request.getLocation());
        event.setContext(request.getEventType());
        event.setDescription(request.getNote());
    }
}
