package org.example.shelfy.service;

import org.example.shelfy.dto.response.WeatherResponse;

public interface WeatherService {
    WeatherResponse getCurrentWeather(Double lat, Double lon);
}
