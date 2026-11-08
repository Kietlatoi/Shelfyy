const WEATHER_CODES = {
  0: ['Trời quang', 'light_mode'],
  1: ['Ít mây', 'light_mode'],
  2: ['Có mây rải rác', 'partly_cloudy_day'],
  3: ['Nhiều mây', 'cloud'],
  45: ['Sương mù', 'foggy'],
  48: ['Sương mù đóng băng', 'foggy'],
  51: ['Mưa phùn nhẹ', 'rainy_light'],
  53: ['Mưa phùn', 'rainy_light'],
  55: ['Mưa phùn dày', 'rainy'],
  56: ['Mưa phùn lạnh nhẹ', 'weather_mix'],
  57: ['Mưa phùn lạnh dày', 'weather_mix'],
  61: ['Mưa nhẹ', 'rainy_light'],
  63: ['Mưa vừa', 'rainy'],
  65: ['Mưa lớn', 'rainy_heavy'],
  66: ['Mưa lạnh nhẹ', 'weather_mix'],
  67: ['Mưa lạnh mạnh', 'weather_mix'],
  71: ['Tuyết nhẹ', 'weather_snowy'],
  73: ['Tuyết vừa', 'weather_snowy'],
  75: ['Tuyết dày', 'weather_snowy'],
  77: ['Hạt tuyết', 'weather_snowy'],
  80: ['Mưa rào nhẹ', 'rainy_light'],
  81: ['Mưa rào', 'rainy'],
  82: ['Mưa rào lớn', 'rainy_heavy'],
  85: ['Mưa tuyết nhẹ', 'weather_snowy'],
  86: ['Mưa tuyết mạnh', 'weather_snowy'],
  95: ['Dông', 'thunderstorm'],
  96: ['Dông kèm mưa đá nhẹ', 'thunderstorm'],
  99: ['Dông kèm mưa đá mạnh', 'thunderstorm'],
};

const CURRENT_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation',
  'rain', 'weather_code', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m',
  'wind_gusts_10m', 'is_day',
].join(',');

let nextGeocodeRequestAt = 0;
let geocodeQueue = Promise.resolve();

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value, digits = 2) {
  const number = finiteNumber(value);
  if (number == null) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function weatherError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function labelFromReverseGeocode(body) {
  if (!body || typeof body !== 'object') return null;
  const address = body.address && typeof body.address === 'object' ? body.address : {};
  const vietnamCity = {
    'VN-SG': 'Hồ Chí Minh',
    'VN-HN': 'Hà Nội',
    'VN-DN': 'Đà Nẵng',
    'VN-HP': 'Hải Phòng',
    'VN-CT': 'Cần Thơ',
  }[address['ISO3166-2-lvl4']];
  if (vietnamCity) return vietnamCity;

  const candidates = [address.city, address.town, address.municipality, address.state_district, address.county, address.state, body.name];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const normalized = candidate.trim().replace(/\s+/g, ' ');
    if (/^(thành phố|tỉnh)\s+/i.test(normalized)) return normalized.replace(/^(thành phố|tỉnh)\s+/i, '');
    return normalized;
  }
  if (typeof body.display_name === 'string') return body.display_name.split(',')[0].trim() || null;
  return null;
}

function timedFetch(fetchImpl, url, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function reverseGeocode(lat, lon, fetchImpl) {
  geocodeQueue = geocodeQueue.catch(() => null).then(async () => {
    const delay = Math.max(0, nextGeocodeRequestAt - Date.now());
    nextGeocodeRequestAt = Math.max(Date.now(), nextGeocodeRequestAt) + 1100;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

    const url = new URL(process.env.REVERSE_GEOCODING_API_URL || 'https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'vi,en');
    url.searchParams.set('zoom', '10');

    try {
      const response = await timedFetch(fetchImpl, url, {
        Accept: 'application/json',
        'User-Agent': process.env.REVERSE_GEOCODING_USER_AGENT || 'ShelfyWeather/1.0',
      }, 4000);
      if (!response.ok) return null;
      return labelFromReverseGeocode(await response.json());
    } catch {
      return null;
    }
  });
  return geocodeQueue;
}

async function fetchCurrentWeather(latitude, longitude, fetchImpl = fetch, reverseGeocodeImpl = reverseGeocode) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw weatherError('invalid-argument', 'Tọa độ vị trí không hợp lệ.');
  }

  const url = new URL(process.env.OPEN_METEO_API_URL || 'https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', CURRENT_FIELDS);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');

  let response;
  try {
    response = await timedFetch(fetchImpl, url, { Accept: 'application/json', 'User-Agent': 'ShelfyWeather/1.0' }, 8000);
  } catch (error) {
    if (error.name === 'AbortError') throw weatherError('deadline-exceeded', 'Dịch vụ thời tiết phản hồi quá lâu.');
    throw weatherError('unavailable', 'Không thể kết nối dịch vụ thời tiết.');
  }
  if (!response.ok) throw weatherError('unavailable', 'Không lấy được dữ liệu thời tiết.');

  const body = await response.json();
  const current = body?.current;
  if (!current || finiteNumber(current.temperature_2m) == null || finiteNumber(current.weather_code) == null || finiteNumber(current.time) == null) {
    throw weatherError('data-loss', 'Dịch vụ thời tiết trả về dữ liệu không đầy đủ.');
  }

  const weatherCode = Math.round(current.weather_code);
  const [condition, icon] = WEATHER_CODES[weatherCode] || ['Không rõ điều kiện thời tiết', 'device_unknown'];
  let location = null;
  try {
    location = await reverseGeocodeImpl(lat, lon, fetchImpl);
  } catch {
    // Weather remains useful when the optional reverse-geocoding provider fails.
  }
  return {
    provider: 'OPEN_METEO',
    timezone: typeof body.timezone === 'string' ? body.timezone : null,
    location: location || 'Vị trí hiện tại',
    temperature: round(current.temperature_2m),
    feelsLike: round(current.apparent_temperature),
    humidity: finiteNumber(current.relative_humidity_2m) == null ? null : Math.round(current.relative_humidity_2m),
    precipitation: round(current.precipitation),
    rain: round(current.rain),
    weatherCode,
    condition,
    icon,
    cloudCover: finiteNumber(current.cloud_cover) == null ? null : Math.round(current.cloud_cover),
    windSpeed: round(current.wind_speed_10m),
    windDirection: finiteNumber(current.wind_direction_10m) == null ? null : Math.round(current.wind_direction_10m),
    windGusts: round(current.wind_gusts_10m),
    isDay: Math.round(current.is_day) === 1,
    observedAt: new Date(current.time * 1000).toISOString(),
  };
}

module.exports = { fetchCurrentWeather, labelFromReverseGeocode };
