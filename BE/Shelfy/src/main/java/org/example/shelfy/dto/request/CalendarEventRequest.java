package org.example.shelfy.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class CalendarEventRequest {
    @NotBlank(message = "Tiêu đề sự kiện không được để trống")
    @Size(max = 255, message = "Tiêu đề sự kiện tối đa 255 ký tự")
    private String title;

    @NotNull(message = "Ngày sự kiện không được để trống")
    @FutureOrPresent(message = "Ngày sự kiện không được nằm trong quá khứ")
    private LocalDate eventDate;

    @Schema(description = "Nếu bỏ trống, hệ thống sẽ mặc định 09:00")
    private LocalTime eventTime;

    @Size(max = 255, message = "Địa điểm tối đa 255 ký tự")
    private String location;

    @Size(max = 50, message = "Loại sự kiện tối đa 50 ký tự")
    private String eventType;

    @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
    private String note;
}
