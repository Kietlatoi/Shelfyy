var { describeWeatherCode } = require('./weatherCodes');
var { reverseGeocode } = require('./reverseGeocodeClient');

var CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'rain',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'is_day',
].join(',');

function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toInteger(value) {
  var number = toNumber(value);
  return number == null ? null : Math.round(number);
}

function round2(value) {
  var number = toNumber(value);
  return number == null ? null : Math.round(number * 100) / 100;
}

function validateCoordinate(value, min, max) {
  var number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function buildOpenMeteoUrl(lat, lon) {
  var url = new URL(process.env.OPEN_METEO_API_URL || 'https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', CURRENT_FIELDS);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  return url;
}

function validateOpenMeteoResponse(body) {
  if (!body || typeof body !== 'object' || !body.current || typeof body.current !== 'object') {
    var shapeError = new Error('Open-Meteo trả về dữ liệu không đúng định dạng.');
    shapeError.status = 502;
    shapeError.code = 'WEATHER_PROVIDER_BAD_RESPONSE';
    throw shapeError;
  }

  var current = body.current;
  if (toNumber(current.temperature_2m) == null || toNumber(current.weather_code) == null || toNumber(current.time) == null) {
    var missingError = new Error('Open-Meteo thiếu dữ liệu thời tiết bắt buộc.');
    missingError.status = 502;
    missingError.code = 'WEATHER_PROVIDER_INCOMPLETE_RESPONSE';
    throw missingError;
  }

  return current;
}

async function fetchCurrentWeather(lat, lon) {
  if (!validateCoordinate(lat, -90, 90) || !validateCoordinate(lon, -180, 180)) {
    var validationError = new Error('Tọa độ vị trí không hợp lệ.');
    validationError.status = 422;
    validationError.code = 'VALIDATION_ERROR';
    throw validationError;
  }

  var controller = new AbortController();
  var timeout = setTimeout(function() {
    controller.abort();
  }, Number(process.env.WEATHER_REQUEST_TIMEOUT_MS || 8000));

  try {
    var url = buildOpenMeteoUrl(lat, lon);
    var response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Shelfy Node Weather Service',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      var upstreamError = new Error('Không lấy được dữ liệu thời tiết từ Open-Meteo.');
      upstreamError.status = 502;
      upstreamError.code = 'WEATHER_PROVIDER_ERROR';
      throw upstreamError;
    }

    var body = await response.json();
    var current = validateOpenMeteoResponse(body);
    var code = toInteger(current.weather_code);
    var description = describeWeatherCode(code);
    var observedAt = new Date(toNumber(current.time) * 1000);
    var locationLabel = await reverseGeocode(lat, lon);

    return {
      provider: 'OPEN_METEO',
      latitude: round2(Number(lat)),
      longitude: round2(Number(lon)),
      timezone: typeof body.timezone === 'string' ? body.timezone : null,
      locationLabel: locationLabel || 'Vị trí hiện tại',
      temperature: round2(current.temperature_2m),
      feelsLike: round2(current.apparent_temperature),
      humidity: toInteger(current.relative_humidity_2m),
      precipitation: round2(current.precipitation),
      rain: round2(current.rain),
      weatherCode: code,
      condition: description.text,
      icon: description.icon,
      cloudCover: toInteger(current.cloud_cover),
      windSpeed: round2(current.wind_speed_10m),
      windDirection: toInteger(current.wind_direction_10m),
      windGusts: round2(current.wind_gusts_10m),
      isDay: toInteger(current.is_day) === 1,
      observedAt: observedAt.toISOString(),
      rawPayload: body,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      var timeoutError = new Error('Open-Meteo phản hồi quá lâu.');
      timeoutError.status = 504;
      timeoutError.code = 'WEATHER_PROVIDER_TIMEOUT';
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  fetchCurrentWeather: fetchCurrentWeather,
};
