const { fetchCurrentWeather } = require('./weatherProvider');

const CACHE_TTL_MILLIS = 30 * 60 * 1000;
const SNAPSHOT_FIELDS = [
  'provider', 'latitude', 'longitude', 'timezone', 'location', 'temperature',
  'feelsLike', 'humidity', 'precipitation', 'rain', 'weatherCode', 'condition',
  'icon', 'cloudCover', 'windSpeed', 'windDirection', 'windGusts', 'isDay', 'observedAt',
];

function createWeatherService({ database, fetchWeather = fetchCurrentWeather, serverTimestamp, now = Date.now, HttpsError }) {
  const pending = new Map();

  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function requireUid(uid) {
    if (typeof uid !== 'string' || uid.length === 0) fail('unauthenticated', 'Vui lòng đăng nhập để xem thời tiết.');
  }

  function coordinatesFrom(data) {
    const latitude = Number(data?.lat);
    const longitude = Number(data?.lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      fail('invalid-argument', 'Cần tọa độ hiện tại hợp lệ để lấy thời tiết.');
    }
    return { latitude, longitude };
  }

  function locationCell({ latitude, longitude }) {
    return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  }

  function selectSnapshot(weather, coordinates) {
    const snapshot = {};
    for (const field of SNAPSHOT_FIELDS) {
      if (field in weather) snapshot[field] = weather[field];
    }
    // Retain only coarse coordinates; exact device location is used for the provider call only.
    snapshot.latitude = Math.round(coordinates.latitude * 100) / 100;
    snapshot.longitude = Math.round(coordinates.longitude * 100) / 100;
    return snapshot;
  }

  async function createSnapshot(uid, data) {
    requireUid(uid);
    const coordinates = coordinatesFrom(data);
    const cell = locationCell(coordinates);
    const snapshotRef = database.doc(`users/${uid}/weatherSnapshots/current`);
    const existing = await snapshotRef.get();
    const previous = existing.exists ? existing.data() : null;
    const currentTime = now();

    if (previous?.locationCell === cell
      && Number.isFinite(previous.cachedAtMillis)
      && currentTime - previous.cachedAtMillis < CACHE_TTL_MILLIS) {
      return { ...previous, id: 'current' };
    }

    const key = `${uid}:${cell}`;
    if (pending.has(key)) return pending.get(key);

    const request = (async () => {
      let weather;
      try {
        weather = await fetchWeather(coordinates.latitude, coordinates.longitude);
      } catch (error) {
        if (HttpsError && error instanceof HttpsError) throw error;
        const code = ['deadline-exceeded', 'unavailable', 'data-loss'].includes(error?.code)
          ? error.code
          : 'unavailable';
        fail(code, error?.message || 'Không thể cập nhật dữ liệu thời tiết.');
      }
      const snapshot = {
        ...selectSnapshot(weather, coordinates),
        locationCell: cell,
        cachedAtMillis: now(),
        createdAt: serverTimestamp(),
      };
      await snapshotRef.set(snapshot);
      const saved = await snapshotRef.get();
      return { ...saved.data(), id: 'current' };
    })();
    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  }

  async function latestSnapshot(uid) {
    requireUid(uid);
    const snapshot = await database.doc(`users/${uid}/weatherSnapshots/current`).get();
    if (!snapshot.exists) fail('not-found', 'Chưa có dữ liệu thời tiết đã lưu.');
    return { ...snapshot.data(), id: 'current' };
  }

  return { createSnapshot, latestSnapshot };
}

module.exports = { CACHE_TTL_MILLIS, createWeatherService };
