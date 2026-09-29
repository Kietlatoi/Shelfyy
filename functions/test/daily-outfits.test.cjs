const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDailyOutfitService } = require('../dailyOutfits');

function fakeDatabase(seed = {}) {
  const documents = new Map(Object.entries(seed));
  let transactionQueue = Promise.resolve();
  const ref = (path) => ({
    path,
    id: path.split('/').at(-1),
    async get() {
      const data = documents.get(path);
      return { exists: Boolean(data), id: path.split('/').at(-1), data: () => data };
    },
  });
  return {
    documents,
    doc: ref,
    runTransaction(callback) {
      const result = transactionQueue.then(() => callback({
        get: (reference) => reference.get(),
        create: (reference, data) => documents.set(reference.path, data),
        set: (reference, data) => documents.set(reference.path, data),
        update: (reference, data) => documents.set(reference.path, { ...documents.get(reference.path), ...data }),
      }));
      transactionQueue = result.catch(() => {});
      return result;
    },
  };
}

function fixture() {
  const database = fakeDatabase({
    'users/alice': { timeZone: 'Asia/Ho_Chi_Minh' },
    'users/alice/wardrobe/top-1': { name: 'Áo linen', category: 'TOP', favorite: true, status: 'IN_USE', wearCount: 2 },
    'users/alice/wardrobe/bottom-1': { name: 'Quần đen', category: 'BOTTOM', status: 'IN_USE', wearCount: 3 },
    'users/alice/wardrobe/shoes-1': { name: 'Giày', category: 'SHOES', status: 'IN_USE', wearCount: 1 },
    'users/alice/suggestions/suggestion-1': { dateKey: '2026-09-26', status: 'GENERATED', items: [{ id: 'top-1' }, { id: 'bottom-1' }] },
  });
  const service = createDailyOutfitService({
    database,
    serverTimestamp: () => 'server-time',
    now: () => Date.parse('2026-09-25T18:00:00.000Z'),
  });
  return { database, service };
}

test('confirmation uses the user local date, snapshots owned items and confirms the linked suggestion', async () => {
  const { database, service } = fixture();
  const response = await service.confirmToday('alice', {
    itemIds: ['top-1', 'bottom-1'],
    name: 'Đi làm',
    suggestionId: 'suggestion-1',
  });

  assert.equal(response.wornDate, '2026-09-26');
  assert.equal(response.outfit.items.length, 2);
  assert.deepEqual(response.itemIds, ['top-1', 'bottom-1']);
  assert.equal(database.documents.get('users/alice/wardrobe/top-1').wearCount, 3);
  assert.equal(database.documents.get('users/alice/suggestions/suggestion-1').status, 'CONFIRMED');
  assert.equal(database.documents.get('users/alice/dailyOutfits/2026-09-26').itemIds.length, 2);
});

test('reconfirming an unchanged daily outfit does not increment wear counters again', async () => {
  const { database, service } = fixture();
  await service.confirmToday('alice', { itemIds: ['top-1', 'bottom-1'] });
  const response = await service.confirmToday('alice', { itemIds: ['top-1', 'bottom-1'] });

  assert.deepEqual(response.wearCountUpdated.addedItemIds, []);
  assert.equal(database.documents.get('users/alice/wardrobe/top-1').wearCount, 3);
  assert.equal(database.documents.get('users/alice/wardrobe/bottom-1').wearCount, 4);
});

test('two concurrent confirmations of the same outfit only count the wear once', async () => {
  const { database, service } = fixture();
  await Promise.all([
    service.confirmToday('alice', { itemIds: ['top-1', 'bottom-1'] }),
    service.confirmToday('alice', { itemIds: ['top-1', 'bottom-1'] }),
  ]);

  assert.equal(database.documents.get('users/alice/wardrobe/top-1').wearCount, 3);
  assert.equal(database.documents.get('users/alice/wardrobe/bottom-1').wearCount, 4);
});

test('changing today outfit adjusts only changed item counts and rejects foreign or invalid item IDs', async () => {
  const { database, service } = fixture();
  await service.confirmToday('alice', { itemIds: ['top-1', 'bottom-1'] });
  const response = await service.confirmToday('alice', { itemIds: ['top-1', 'shoes-1'] });

  assert.deepEqual(response.wearCountUpdated.addedItemIds, ['shoes-1']);
  assert.deepEqual(response.wearCountUpdated.removedItemIds, ['bottom-1']);
  assert.equal(database.documents.get('users/alice/wardrobe/shoes-1').wearCount, 2);
  assert.equal(database.documents.get('users/alice/wardrobe/bottom-1').wearCount, 3);
  await assert.rejects(service.confirmToday('alice', { itemIds: ['top-1', 'bob-item'] }), { code: 'not-found' });
  await assert.rejects(service.confirmToday('alice', { itemIds: ['top-1', 'top-1'] }), { code: 'invalid-argument' });
});
