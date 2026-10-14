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

function snapshot(id, data) {
  return { id, exists: () => data != null, data: () => data };
}

function fixture(pages = []) {
  const reads = [];
  const writes = [];
  const documents = new Map([
    ['users/alice', snapshot('alice', { timeZone: 'Asia/Ho_Chi_Minh' })],
    ['users/alice/wardrobe/top-1', snapshot('top-1', {
      name: 'Áo trắng', category: 'TOP', status: 'IN_USE', wearCount: 0,
    })],
    ['users/alice/suggestions/suggestion-1', snapshot('suggestion-1', {
      dateKey: '2026-09-26', weatherSnapshotId: 'current',
    })],
  ]);
  const firestore = {
    collection: (_database, ...segments) => segments.join('/'),
    doc: (_database, ...segments) => segments.join('/'),
    getDoc: async (reference) => documents.get(reference) || snapshot(reference.split('/').at(-1), null),
    getDocs: async (request) => { reads.push(request); return pages.shift(); },
    limit: (value) => ({ type: 'limit', value }),
    orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
    query: (base, ...constraints) => ({ base, constraints }),
    serverTimestamp: () => 'SERVER_TIME',
    startAfter: (cursor) => ({ type: 'startAfter', cursor }),
    where: (field, operator, value) => ({ type: 'where', field, operator, value }),
    runTransaction: async (_database, callback) => callback({
      get: async (reference) => documents.get(reference) || snapshot(reference.split('/').at(-1), null),
      set: (reference, data) => {
        writes.push({ type: 'set', reference, data });
        documents.set(reference, snapshot(reference.split('/').at(-1), data));
      },
      update: (reference, data) => writes.push({ type: 'update', reference, data }),
    }),
  };
  const mocks = {
    'firebase/firestore': firestore,
    '../firebase/client': { auth: { currentUser: { uid: 'alice' } }, db: {} },
    '../utils/dateTime': {
      localDateKey: () => '2026-09-26',
      validTimeZone: () => 'Asia/Ho_Chi_Minh',
    },
  };
  return {
    api: loadModule('src/api/dailyOutfitApi.js', mocks).dailyOutfitApi,
    reads,
    writes,
  };
}

test('daily outfit history keeps item snapshots and paginates with a Firestore cursor', async () => {
  const first = snapshot('2026-09-26', { dateKey: '2026-09-26', name: 'Đi làm', itemIds: ['top-1'], itemSnapshots: [{ id: 'top-1', name: 'Áo' }] });
  const second = snapshot('2026-09-25', { dateKey: '2026-09-25', name: 'Cuối tuần', itemIds: ['dress-1'], itemSnapshots: [{ id: 'dress-1', name: 'Đầm' }] });
  const context = fixture([{ docs: [first, second] }, { docs: [second] }]);
  const firstPage = await context.api.list({ page: 0, size: 1, from: '2026-09-01', to: '2026-09-30' });
  const secondPage = await context.api.list({ page: 1, size: 1, from: '2026-09-01', to: '2026-09-30' });

  assert.equal(firstPage.content[0].outfit.items[0].name, 'Áo');
  assert.equal(firstPage.totalPages, 2);
  assert.equal(secondPage.content[0].wornDate, '2026-09-25');
  assert.equal(context.reads[1].constraints.find((item) => item.type === 'startAfter').cursor.id, '2026-09-26');
});

test('today and confirmation read and write the authenticated user Firestore path', async () => {
  const context = fixture([]);
  const response = await context.api.confirmToday({ itemIds: ['top-1'], suggestionId: 'suggestion-1' });
  const today = await context.api.getToday();

  assert.equal(response.confirmed, true);
  assert.equal(today.wornDate, '2026-09-26');
  const dailyWrite = context.writes.find((write) => write.type === 'set');
  assert.equal(dailyWrite.reference, 'users/alice/dailyOutfits/2026-09-26');
  assert.equal(dailyWrite.data.itemSnapshots[0].name, 'Áo trắng');
  assert.ok(context.writes.some((write) => write.reference === 'users/alice/suggestions/suggestion-1'));
});
