package org.example.shelfy.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.shelfy.dto.response.WeatherResponse;
import org.example.shelfy.service.WeatherService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WeatherServiceImpl implements WeatherService {
    private final RestTemplate restTemplate;

    @Value("${weather.api-key:}")
    private String apiKey;
    @Value("${weather.api-url}")
    private String apiUrl;

    @Override
    // FIX #16: key = "#lat + ':' + #lon" khi lat/lon null sẽ ra "null:null" —
    // mọi user không truyền location đều dùng chung 1 cache entry. Thêm
    // condition để chỉ cache khi có toạ độ thực (tránh key "null:null" dùng
    // chung), demoWeather() ở nhánh null vẫn rẻ nên không cần cache.
    @Cacheable(value = "weather", key = "#lat + ':' + #lon",
            condition = "#lat != null && #lon != null", unless = "#result == null")
    public WeatherResponse getCurrentWeather(Double lat, Double lon) {
        if (apiKey == null || apiKey.isBlank() || lat == null || lon == null) {
            return demoWeather();
        }
        try {
            String url = UriComponentsBuilder.fromHttpUrl(apiUrl)
                    .queryParam("lat", lat)
                    .queryParam("lon", lon)
                    .queryParam("appid", apiKey)
                    .queryParam("units", "metric")
                    .queryParam("lang", "vi")
                    .toUriString();
            Map<?, ?> body = restTemplate.getForObject(url, Map.class);
            if (body == null) return demoWeather();
            Object mainObj = body.get("main");
            Map<?, ?> main = mainObj instanceof Map<?, ?> m ? m : Map.of();
            Object weatherObj = body.get("weather");
            List<?> weather = weatherObj instanceof List<?> list ? list : List.of();
            Map<?, ?> w = (!weather.isEmpty() && weather.get(0) instanceof Map<?, ?> wm) ? wm : Map.of();
            Object locationName = body.get("name");
            Object description = w.get("description");
            return WeatherResponse.builder()
                    .location(locationName == null ? "TP. Hồ Chí Minh" : String.valueOf(locationName))
                    .temperature(toDouble(main.get("temp")))
                    .feelsLike(toDouble(main.get("feels_like")))
                    .humidity(toInt(main.get("humidity")))
                    .condition(description == null ? "Trời nhiều mây" : String.valueOf(description))
                    .uvIndex("Trung bình")
                    .forecastIn5Hours("Ổn định")
                    .build();
        } catch (Exception e) {
            return demoWeather();
        }
    }

    private WeatherResponse demoWeather() {
        return WeatherResponse.builder()
                .location("TP. Hồ Chí Minh")
                .temperature(36.0)
                .condition("Nắng ráo")
                .feelsLike(35.0)
                .humidity(65)
                .uvIndex("Trung bình")
                .forecastIn5Hours("Nắng ấm")
                .build();
    }

    private Double toDouble(Object value) { return value instanceof Number n ? n.doubleValue() : null; }
    private Integer toInt(Object value) { return value instanceof Number n ? n.intValue() : null; }
}