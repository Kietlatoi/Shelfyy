const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWeatherService } = require('../weather');

function createFakeDatabase() {
  const documents = new Map();
  return {
    documents,
    doc(path) {
      return {
        async get() {
          const data = documents.get(path);
          return { exists: Boolean(data), data: () => data };
        },
        async set(data) {
          documents.set(path, data);
        },
      };
    },
  };
}

test('weather snapshots validate auth and coordinates before contacting providers', async () => {
  const database = createFakeDatabase();
  let providerCalls = 0;
  const service = createWeatherService({
    database,
    fetchWeather: async () => { providerCalls += 1; return {}; },
    serverTimestamp: () => 'server-time',
    now: () => 1_000_000,
  });

  await assert.rejects(service.createSnapshot(null, { lat: 10, lon: 106 }), { code: 'unauthenticated' });
  await assert.rejects(service.createSnapshot('alice', { lat: 91, lon: 106 }), { code: 'invalid-argument' });
  await assert.rejects(service.createSnapshot('alice', { lat: 10, lon: 'west' }), { code: 'invalid-argument' });
  assert.equal(providerCalls, 0);
});

test('weather snapshots reuse a fresh location cache and store no raw provider payload', async () => {
  const database = createFakeDatabase();
  let clock = 1_000_000;
  let providerCalls = 0;
  const service = createWeatherService({
    database,
    fetchWeather: async () => {
      providerCalls += 1;
      return {
        provider: 'OPEN_METEO',
        latitude: 10.78,
        longitude: 106.69,
        location: 'Hồ Chí Minh',
        temperature: 30,
        feelsLike: 33,
        humidity: 70,
        weatherCode: 2,
        condition: 'Có mây rải rác',
        icon: 'partly_cloudy_day',
        isDay: true,
        observedAt: '2026-09-26T12:00:00.000Z',
        rawPayload: { privateProviderData: true },
      };
    },
    serverTimestamp: () => 'server-time',
    now: () => clock,
  });

  const first = await service.createSnapshot('alice', { lat: 10.78123, lon: 106.69321 });
  const cached = await service.createSnapshot('alice', { lat: 10.78201, lon: 106.69401 });
  const stored = database.documents.get('users/alice/weatherSnapshots/current');

  assert.equal(providerCalls, 1);
  assert.equal(first.id, 'current');
  assert.equal(cached.temperature, 30);
  assert.equal(stored.latitude, 10.78);
  assert.equal(stored.longitude, 106.69);
  assert.equal(stored.cachedAtMillis, clock);
  assert.equal(stored.createdAt, 'server-time');
  assert.equal('rawPayload' in stored, false);

  clock += 30 * 60 * 1000 + 1;
  await service.createSnapshot('alice', { lat: 10.78123, lon: 106.69321 });
  assert.equal(providerCalls, 2);
});

test('latest weather returns the user snapshot or a not-found error', async () => {
  const database = createFakeDatabase();
  const service = createWeatherService({ database, fetchWeather: async () => ({}), serverTimestamp: () => 0 });

  await assert.rejects(service.latestSnapshot('alice'), { code: 'not-found' });
  database.documents.set('users/alice/weatherSnapshots/current', { temperature: 27, id: 'wrong-id' });

  assert.deepEqual(await service.latestSnapshot('alice'), { temperature: 27, id: 'current' });
});
