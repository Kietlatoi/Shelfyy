const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(overrides = {}) {
  const calls = { gps: 0, warnings: 0 };
  const Location = {
    Accuracy: { Balanced: 3 },
    hasServicesEnabledAsync: async () => true,
    requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
    getCurrentPositionAsync: async () => {
      calls.gps += 1;
      return { coords: { latitude: 21.0285, longitude: 105.8542 } };
    },
    ...overrides,
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/geolocation.js'), 'utf8')
    .replace("import * as Location from 'expo-location';", '')
    .replace('export async function', 'async function');
  const context = vm.createContext({ Location, console: { warn: () => { calls.warnings += 1; } } });
  vm.runInContext(source, context);
  return { getLocation: context.getCurrentLocation, calls };
}

test('unavailable GPS returns default coordinates without a LogBox warning', async () => {
  const { getLocation, calls } = load({ getCurrentPositionAsync: async () => { throw new Error('Current location is unavailable'); } });
  const location = await getLocation();
  assert.equal(location.lat, 10.7769);
  assert.equal(location.lon, 106.7009);
  assert.equal(location.isFallback, true);
  assert.equal(calls.warnings, 0);
});

test('disabled location services skip the GPS request', async () => {
  const { getLocation, calls } = load({ hasServicesEnabledAsync: async () => false });
  assert.equal((await getLocation()).isFallback, true);
  assert.equal(calls.gps, 0);
});

test('denied permission skips the GPS request', async () => {
  const { getLocation, calls } = load({ requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) });
  assert.equal((await getLocation()).isFallback, true);
  assert.equal(calls.gps, 0);
});

test('available GPS uses device coordinates', async () => {
  const { getLocation } = load();
  const location = await getLocation();
  assert.equal(location.lat, 21.0285);
  assert.equal(location.lon, 105.8542);
  assert.equal(location.isFallback, false);
});
