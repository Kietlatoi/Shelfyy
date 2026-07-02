package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Builder
public class CalendarEventResponse {
    private Long id;
    private String title;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private String location;
    private String eventType;
    private String note;
}
