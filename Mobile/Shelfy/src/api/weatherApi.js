import * as Location from 'expo-location';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';

const CACHE_TTL_MILLIS = 30 * 60 * 1000;
const DEFAULT_WEATHER_API = 'https://api.open-meteo.com/v1';

function requireUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để xem thời tiết.');
  return uid;
}

function coordinates(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Cần tọa độ hợp lệ để lấy thời tiết.');
  }
  return { latitude, longitude };
}

function weatherCondition(code) {
  if (code === 0) return 'Trời quang';
  if ([1, 2].includes(code)) return 'Có mây nhẹ';
  if (code === 3) return 'Nhiều mây';
  if ([45, 48].includes(code)) return 'Có sương mù';
  if (code >= 51 && code <= 57) return 'Mưa phùn';
  if (code >= 61 && code <= 67) return 'Có mưa';
  if (code >= 71 && code <= 77) return 'Có tuyết';
  if (code >= 80 && code <= 82) return 'Mưa rào';
  if (code >= 85 && code <= 86) return 'Mưa tuyết';
  if (code >= 95) return 'Có dông';
  return 'Thời tiết thay đổi';
}

async function locationName(latitude, longitude) {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    return place?.city || place?.subregion || place?.region || place?.country || 'Vị trí hiện tại';
  } catch {
    const isHoChiMinhCity = Math.abs(latitude - 10.7769) < 0.1 && Math.abs(longitude - 106.7009) < 0.1;
    return isHoChiMinhCity ? 'TP. Hồ Chí Minh' : 'Vị trí hiện tại';
  }
}

async function fetchCurrentWeather(latitude, longitude) {
  const baseUrl = (process.env.EXPO_PUBLIC_WEATHER_API_BASE_URL || DEFAULT_WEATHER_API).replace(/\/+$/, '');
  const fields = [
    'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'precipitation',
    'rain', 'weather_code', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m',
    'wind_gusts_10m', 'is_day',
  ].join(',');
  const url = `${baseUrl}/forecast?latitude=${encodeURIComponent(latitude)}`
    + `&longitude=${encodeURIComponent(longitude)}&current=${encodeURIComponent(fields)}`
    + '&timezone=auto&wind_speed_unit=kmh';
  const response = await fetch(url);
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.current) {
    throw new Error(result?.reason || 'Không thể cập nhật dữ liệu thời tiết.');
  }
  const current = result.current;
  const code = Number(current.weather_code);
  const temperature = Number(current.temperature_2m);
  const feelsLike = Number(current.apparent_temperature);
  const humidity = Number(current.relative_humidity_2m);
  const windSpeed = Number(current.wind_speed_10m);
  if (![temperature, feelsLike, humidity, windSpeed, code].every(Number.isFinite)) {
    throw new Error('Open-Meteo trả về dữ liệu thời tiết chưa đầy đủ.');
  }
  return {
    provider: 'OPEN_METEO',
    timezone: result.timezone || 'Asia/Ho_Chi_Minh',
    location: await locationName(latitude, longitude),
    temperature,
    feelsLike,
    humidity,
    precipitation: Number(current.precipitation || 0),
    rain: Number(current.rain || 0),
    weatherCode: code,
    condition: weatherCondition(code),
    cloudCover: Number(current.cloud_cover || 0),
    windSpeed,
    windDirection: Number(current.wind_direction_10m || 0),
    windGusts: Number(current.wind_gusts_10m || 0),
    isDay: Number(current.is_day) === 1,
    observedAt: current.time || new Date().toISOString(),
  };
}

export const weatherApi = {
  async createSnapshot({ lat, lon }) {
    const uid = requireUser();
    const { latitude, longitude } = coordinates(lat, lon);
    const locationCell = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const ref = doc(db, 'users', uid, 'weatherSnapshots', 'current');
    const existing = await getDoc(ref);
    const previous = existing.exists() ? existing.data() : null;
    if (previous?.locationCell === locationCell
      && Number.isFinite(previous.cachedAtMillis)
      && Date.now() - previous.cachedAtMillis < CACHE_TTL_MILLIS) {
      return { ...previous, id: 'current' };
    }

    const weather = await fetchCurrentWeather(latitude, longitude);
    const snapshot = {
      ...weather,
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100,
      locationCell,
      cachedAtMillis: Date.now(),
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, snapshot);
    return { ...snapshot, id: 'current' };
  },

  async latestSnapshot() {
    const uid = requireUser();
    const snapshot = await getDoc(doc(db, 'users', uid, 'weatherSnapshots', 'current'));
    if (!snapshot.exists()) {
      const error = new Error('Chưa có dữ liệu thời tiết đã lưu.');
      error.code = 'not-found';
      throw error;
    }
    return { ...snapshot.data(), id: snapshot.id };
  },
};
