const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchCurrentWeather, labelFromReverseGeocode } = require('../weatherProvider');

function providerResponse() {
  return {
    ok: true,
    async json() {
      return {
        timezone: 'Asia/Ho_Chi_Minh',
        current: {
          time: 1790424000,
          temperature_2m: 30.25,
          apparent_temperature: 33,
          relative_humidity_2m: 78,
          precipitation: 0,
          rain: 0,
          weather_code: 2,
          cloud_cover: 25,
          wind_speed_10m: 5.5,
          wind_direction_10m: 180,
          wind_gusts_10m: 9,
          is_day: 1,
        },
      };
    },
  };
}

test('weather provider maps Open-Meteo data and reverse geocoding to the mobile snapshot shape', async () => {
  let weatherUrl;
  let geocodeCoordinates;
  const weather = await fetchCurrentWeather(10.78, 106.69, async (url) => {
    weatherUrl = new URL(url);
    return providerResponse();
  }, async (lat, lon) => {
    geocodeCoordinates = [lat, lon];
    return 'Hồ Chí Minh';
  });

  assert.equal(weatherUrl.searchParams.get('latitude'), '10.78');
  assert.equal(weatherUrl.searchParams.get('longitude'), '106.69');
  assert.deepEqual(geocodeCoordinates, [10.78, 106.69]);
  assert.equal(weather.location, 'Hồ Chí Minh');
  assert.equal(weather.temperature, 30.25);
  assert.equal(weather.condition, 'Có mây rải rác');
  assert.equal(weather.icon, 'partly_cloudy_day');
  assert.equal(weather.isDay, true);
  assert.equal('rawPayload' in weather, false);
});

test('reverse-geocode failure does not prevent a weather result', async () => {
  const weather = await fetchCurrentWeather(10, 106, async () => providerResponse(), async () => {
    throw new Error('geocoder unavailable');
  });
  assert.equal(weather.location, 'Vị trí hiện tại');
});

test('reverse-geocode labels prefer normalized Vietnamese city names', () => {
  assert.equal(labelFromReverseGeocode({ address: { 'ISO3166-2-lvl4': 'VN-SG' } }), 'Hồ Chí Minh');
  assert.equal(labelFromReverseGeocode({ address: { state: 'Tỉnh Bình Dương' } }), 'Bình Dương');
});

test('weather provider reports an upstream timeout without returning partial data', async () => {
  await assert.rejects(
    fetchCurrentWeather(10, 106, async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }),
    { code: 'deadline-exceeded' }
  );
});
