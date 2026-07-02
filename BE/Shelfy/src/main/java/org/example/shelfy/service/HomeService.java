package org.example.shelfy.service;

import org.example.shelfy.dto.request.CalendarEventRequest;
import org.example.shelfy.dto.response.CalendarEventResponse;
import org.example.shelfy.dto.response.HomePageResponse;
import org.springframework.data.domain.Page;

import java.time.LocalDate;

public interface HomeService {
    HomePageResponse getHome(Double lat, Double lon);
    Page<CalendarEventResponse> getEvents(LocalDate from, LocalDate to, int page, int size);
    CalendarEventResponse createEvent(CalendarEventRequest request);
    CalendarEventResponse updateEvent(Long id, CalendarEventRequest request);
    void deleteEvent(Long id);
}
