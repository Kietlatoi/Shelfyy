const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(file, mocks) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

function fixture(pages) {
  const reads = [];
  const calls = [];
  const callableData = {
    getTodayDailyOutfit: { confirmed: false, wornDate: '2026-09-26', outfit: null },
    confirmTodayDailyOutfit: { confirmed: true, wornDate: '2026-09-26' },
  };
  const mocks = {
    'firebase/firestore': {
      collection: (_database, ...segments) => segments.join('/'),
      getDocs: async (request) => { reads.push(request); return pages.shift(); },
      limit: (value) => ({ type: 'limit', value }),
      orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
      query: (base, ...constraints) => ({ base, constraints }),
      startAfter: (cursor) => ({ type: 'startAfter', cursor }),
      where: (field, operator, value) => ({ type: 'where', field, operator, value }),
    },
    'firebase/functions': {
      httpsCallable: (_functions, name) => async (payload) => {
        calls.push({ name, payload });
        return { data: callableData[name] };
      },
    },
    '../firebase/client': { auth: { currentUser: { uid: 'alice' } }, db: {}, functions: {} },
  };
  return { api: loadModule('src/api/dailyOutfitApi.js', mocks).dailyOutfitApi, reads, calls };
}

test('daily outfit history keeps item snapshots and paginates with a Firestore cursor', async () => {
  const first = { id: '2026-09-26', data: () => ({ dateKey: '2026-09-26', name: 'Đi làm', itemIds: ['top-1'], itemSnapshots: [{ id: 'top-1', name: 'Áo' }] }) };
  const second = { id: '2026-09-25', data: () => ({ dateKey: '2026-09-25', name: 'Cuối tuần', itemIds: ['dress-1'], itemSnapshots: [{ id: 'dress-1', name: 'Đầm' }] }) };
  const fixtureData = fixture([
    { docs: [first, second] },
    { docs: [second] },
  ]);
  const firstPage = await fixtureData.api.list({ page: 0, size: 1, from: '2026-09-01', to: '2026-09-30' });
  const secondPage = await fixtureData.api.list({ page: 1, size: 1, from: '2026-09-01', to: '2026-09-30' });

  assert.equal(firstPage.content[0].outfit.items[0].name, 'Áo');
  assert.equal(firstPage.totalPages, 2);
  assert.equal(secondPage.content[0].wornDate, '2026-09-25');
  const cursor = fixtureData.reads[1].constraints.find((constraint) => constraint.type === 'startAfter');
  assert.equal(cursor.cursor.id, '2026-09-26');
});

test('today and confirmation use the authenticated-user Functions callables', async () => {
  const { api, calls } = fixture([]);
  const response = await api.confirmToday({ itemIds: ['top-1'], suggestionId: 'suggestion-1' });
  const today = await api.getToday();

  assert.equal(response.confirmed, true);
  assert.equal(today.wornDate, '2026-09-26');
  assert.deepEqual(calls.map((call) => call.name), ['confirmTodayDailyOutfit', 'getTodayDailyOutfit']);
  assert.equal(calls[0].payload.suggestionId, 'suggestion-1');
});
