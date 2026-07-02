package org.example.shelfy.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class WeatherResponse {
    private String location;
    private Double temperature;
    private String condition;
    private Double feelsLike;
    private Integer humidity;
    private String uvIndex;
    private String forecastIn5Hours;
}
