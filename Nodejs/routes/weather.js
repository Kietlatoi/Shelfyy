var express = require('express');
var { authenticate } = require('../middleware/auth');
var { query } = require('../db');
var { fetchCurrentWeather } = require('../services/openMeteoClient');
var { describeWeatherCode } = require('../services/weatherCodes');

var router = express.Router();

function snapshotResponse(row) {
  var description = describeWeatherCode(row.weather_code);
  return {
    id: row.weather_snapshot_id,
    provider: row.provider,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
    location: row.location_label || 'Vị trí hiện tại',
    temperature: row.temperature_celsius == null ? null : Number(row.temperature_celsius),
    feelsLike: row.apparent_temperature_celsius == null ? null : Number(row.apparent_temperature_celsius),
    humidity: row.relative_humidity,
    precipitation: row.precipitation_mm == null ? null : Number(row.precipitation_mm),
    rain: row.rain_mm == null ? null : Number(row.rain_mm),
    weatherCode: row.weather_code,
    condition: row.condition_text,
    icon: description.icon,
    cloudCover: row.cloud_cover,
    windSpeed: row.wind_speed_kmh == null ? null : Number(row.wind_speed_kmh),
    windDirection: row.wind_direction_deg,
    windGusts: row.wind_gusts_kmh == null ? null : Number(row.wind_gusts_kmh),
    isDay: row.is_day,
    observedAt: row.observed_at,
    createdAt: row.created_at,
  };
}

function validatePayload(body) {
  var lat = Number(body && body.lat);
  var lon = Number(body && body.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    var error = new Error('Cần tọa độ hiện tại hợp lệ để lấy thời tiết.');
    error.status = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return { lat: lat, lon: lon };
}

router.post('/snapshots', authenticate, async function(req, res, next) {
  try {
    var coordinates = validatePayload(req.body);
    var weather = await fetchCurrentWeather(coordinates.lat, coordinates.lon);

    var result = await query(
      `INSERT INTO weather_snapshots (
        user_id,
        latitude,
        longitude,
        timezone,
        location_label,
        temperature_celsius,
        apparent_temperature_celsius,
        relative_humidity,
        precipitation_mm,
        rain_mm,
        weather_code,
        condition_text,
        cloud_cover,
        wind_speed_kmh,
        wind_direction_deg,
        wind_gusts_kmh,
        is_day,
        provider,
        observed_at,
        raw_payload
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      )
      RETURNING *`,
      [
        req.user.userId,
        coordinates.lat,
        coordinates.lon,
        weather.timezone,
        weather.locationLabel,
        weather.temperature,
        weather.feelsLike,
        weather.humidity,
        weather.precipitation,
        weather.rain,
        weather.weatherCode,
        weather.condition,
        weather.cloudCover,
        weather.windSpeed,
        weather.windDirection,
        weather.windGusts,
        weather.isDay,
        weather.provider,
        weather.observedAt,
        weather.rawPayload,
      ]
    );

    var snapshot = snapshotResponse(result.rows[0]);
    snapshot.icon = weather.icon;
    res.status(201).json(snapshot);
  } catch (err) {
    next(err);
  }
});

router.get('/snapshots/latest', authenticate, async function(req, res, next) {
  try {
    var result = await query(
      'SELECT * FROM weather_snapshots WHERE user_id = $1 ORDER BY observed_at DESC, created_at DESC LIMIT 1',
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'WEATHER_SNAPSHOT_NOT_FOUND',
          message: 'Chưa có dữ liệu thời tiết đã lưu.',
        },
      });
    }

    return res.json(snapshotResponse(result.rows[0]));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
