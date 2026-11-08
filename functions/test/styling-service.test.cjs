const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStylingService, getDateKey } = require('../styling');

function fakeDatabase(seed = {}) {
  const documents = new Map(Object.entries(seed));
  function ref(path) {
    return {
      path,
      id: path.split('/').at(-1),
      async get() {
        const value = documents.get(path);
        return { exists: Boolean(value), id: path.split('/').at(-1), data: () => value };
      },
      async set(value) { documents.set(path, value); },
    };
  }
  function query(path, filters = [], maximum = Infinity) {
    return {
      path,
      filters,
      maximum,
      where(field, operator, value) { return query(path, [...filters, [field, operator, value]], maximum); },
      limit(value) { return query(path, filters, value); },
      async get() {
        const prefix = `${path}/`;
        const docs = [...documents.entries()]
          .filter(([key, data]) => key.startsWith(prefix) && filters.every(([field, operator, value]) => {
            if (operator === '==') return data[field] === value;
            if (operator === '>=') return data[field] >= value;
            return false;
          }))
          .slice(0, maximum)
          .map(([key, data]) => ({ id: key.slice(prefix.length), ref: ref(key), data: () => data }));
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  return {
    documents,
    doc: ref,
    collection: query,
    async runTransaction(callback) {
      return callback({
        get: (reference) => reference.get(),
        create: (reference, value) => reference.set(value),
        set: (reference, value) => reference.set(value),
      });
    },
  };
}

function fixture() {
  const dateKey = '2026-09-26';
  const database = fakeDatabase({
    'users/alice': { fullName: 'Mai Anh', email: 'mai@example.test' },
    'users/alice/wardrobe/top-1': { name: 'Áo linen trắng', category: 'TOP', brand: 'Shelfy', material: 'linen', color: 'trắng', status: 'IN_USE', wearCount: 1, favorite: true, image: { secureUrl: 'https://res.cloudinary.com/demo/image/upload/alice/wardrobe/top' } },
    'users/alice/wardrobe/bottom-1': { name: 'Quần tây đen', category: 'BOTTOM', color: 'đen', status: 'IN_USE', wearCount: 2, favorite: false },
    'users/alice/wardrobe/shoe-1': { name: 'Giày loafer da', category: 'SHOES', material: 'da', status: 'IN_USE', wearCount: 1, favorite: false },
    'users/alice/weatherSnapshots/current': { location: 'Hồ Chí Minh', temperature: 33, feelsLike: 35, humidity: 80, condition: 'Trời quang' },
    'users/alice/calendarEvents/event-key': { id: 'google-event-1', dateKey, title: 'Họp khách hàng', startTime: '09:00', location: 'Văn phòng' },
    'users/alice/dailyOutfits/2026-09-24': { dateKey: '2026-09-24', itemIds: ['bottom-1'] },
  });
  let timestamp = 0;
  const service = createStylingService({
    database,
    serverTimestamp: () => `server-time-${++timestamp}`,
    timestampFromMillis: (value) => value,
    now: () => Date.parse(`${dateKey}T04:00:00.000Z`),
  });
  return { database, service, dateKey };
}

test('styling date keys use the Vietnam calendar day', () => {
  assert.equal(getDateKey(Date.parse('2026-09-25T18:00:00.000Z')), '2026-09-26');
});

test('generation loads UID-owned context and stores a string-ID rule-based suggestion', async () => {
  const { database, service, dateKey } = fixture();
  const suggestion = await service.generateToday('alice', { requestId: 'request-12345678' });

  assert.equal(suggestion.date, dateKey);
  assert.equal(suggestion.modelName, 'rule-based-v1');
  assert.ok(suggestion.items.length >= 2);
  assert.ok(suggestion.items.every((item) => typeof item.id === 'string'));
  assert.equal(suggestion.context.weather.location, 'Hồ Chí Minh');
  assert.equal(suggestion.context.events[0].title, 'Họp khách hàng');
  assert.equal(database.documents.has(`users/alice/suggestions/${suggestion.id}`), true);
});

test('an idempotent generation retry returns the same suggestion without another document', async () => {
  const { database, service } = fixture();
  const first = await service.generateToday('alice', { requestId: 'request-12345678' });
  const before = [...database.documents.keys()].filter((key) => key.startsWith('users/alice/suggestions/')).length;
  const retry = await service.generateToday('alice', { requestId: 'request-12345678' });
  const after = [...database.documents.keys()].filter((key) => key.startsWith('users/alice/suggestions/')).length;

  assert.equal(retry.id, first.id);
  assert.equal(after, before);
});

test('latestToday returns the most recent suggestion and empty closets fail clearly', async () => {
  const { service } = fixture();
  const created = await service.generateToday('alice', { requestId: 'request-abcdefgh' });
  assert.equal((await service.latestToday('alice')).suggestion.id, created.id);

  const emptyDatabase = fakeDatabase({ 'users/bob': { fullName: 'Bình' } });
  const emptyService = createStylingService({ database: emptyDatabase, serverTimestamp: () => 'now' });
  await assert.rejects(emptyService.generateToday('bob', { requestId: 'request-abcdefgh' }), { code: 'failed-precondition' });
});

test('styling still generates with missing weather or calendar context and falls back from an invalid timezone', async () => {
  const database = fakeDatabase({
    'users/alice': { timeZone: 'not-a-timezone' },
    'users/alice/wardrobe/top-1': { name: 'Áo cotton', category: 'TOP', status: 'IN_USE' },
    'users/alice/wardrobe/bottom-1': { name: 'Quần denim', category: 'BOTTOM', status: 'IN_USE' },
  });
  const service = createStylingService({
    database,
    serverTimestamp: () => 'now',
    now: () => Date.parse('2026-09-25T18:00:00.000Z'),
  });
  const suggestion = await service.generateToday('alice', { requestId: 'request-no-context' });

  assert.equal(suggestion.date, '2026-09-26');
  assert.equal(suggestion.context.weather, null);
  assert.equal(suggestion.context.events.length, 0);
});
