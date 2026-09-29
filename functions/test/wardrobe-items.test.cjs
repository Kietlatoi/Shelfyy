const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWardrobeItemsService } = require('../wardrobeItems');

function fakeDatabase(seed = {}) {
  const documents = new Map(Object.entries(seed));
  let queue = Promise.resolve();
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
      const result = queue.then(() => callback({
        get: (reference) => reference.get(),
        create: (reference, data) => {
          if (documents.has(reference.path)) throw new Error('already exists');
          documents.set(reference.path, data);
        },
        update: (reference, data) => documents.set(reference.path, { ...documents.get(reference.path), ...data }),
        delete: (reference) => documents.delete(reference.path),
      }));
      queue = result.catch(() => {});
      return result;
    },
  };
}

function fixture({ seed = {}, ids = ['item-1', 'item-2'] } = {}) {
  const database = fakeDatabase(seed);
  const service = createWardrobeItemsService({
    database,
    serverTimestamp: () => 'server-time',
    cloudName: 'shelfy',
    media: { readAttachments: async () => [], retain() {}, release() {} },
    createId: () => ids.shift(),
  });
  return { database, service };
}

test('Free users are capped server-side and item plus counter commit atomically', async () => {
  const context = fixture({ seed: {
    'users/alice/entitlements/current': { planId: 'FREE', status: 'ACTIVE' },
    '_wardrobeCounters/alice': { count: 99 },
  } });
  const item = await context.service.create('alice', { name: 'Áo len', category: 'TOP' });
  assert.equal(item.id, 'item-1');
  assert.equal(context.database.documents.get('users/alice/wardrobe/item-1').createdAt, 'server-time');
  assert.equal(context.database.documents.get('_wardrobeCounters/alice').count, 100);
  await assert.rejects(context.service.create('alice', { name: 'Quần', category: 'BOTTOM' }), { code: 'resource-exhausted' });
});

test('active paid plan controls storage capacity and expired plan falls back to Free limit', async () => {
  const paid = fixture({ seed: {
    'users/alice/entitlements/current': {
      planId: 'PRO', status: 'ACTIVE', wardrobeLimit: -1,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    '_wardrobeCounters/alice': { count: 1 },
  } });
  const item = await paid.service.create('alice', { name: 'Áo khoác', category: 'OUTERWEAR' });
  assert.equal(item.id, 'item-1');
  assert.equal(paid.database.documents.get('_wardrobeCounters/alice').count, 2);

  const expired = fixture({ seed: {
    'users/alice/entitlements/current': {
      planId: 'PRO', status: 'ACTIVE', wardrobeLimit: -1,
      expiresAt: new Date('2026-09-25T00:00:00.000Z'),
    },
    '_wardrobeCounters/alice': { count: 100 },
  } });
  await assert.rejects(expired.service.create('alice', { name: 'Áo', category: 'TOP' }), { code: 'resource-exhausted' });
});

test('owned Cloudinary references are validated and delete decrements the counter once', async () => {
  const context = fixture();
  await assert.rejects(context.service.create('alice', {
    name: 'Áo', category: 'TOP',
    image: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/bob/wardrobe/a.jpg', publicId: 'bob/wardrobe/a' },
  }), { code: 'invalid-argument' });

  const item = await context.service.create('alice', {
    name: 'Áo', category: 'TOP',
    image: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/wardrobe/a.jpg', publicId: 'alice/wardrobe/a' },
  });
  assert.equal((await context.service.delete('alice', item.id)).deleted, true);
  assert.equal(context.database.documents.get('_wardrobeCounters/alice').count, 0);
  assert.equal((await context.service.delete('alice', item.id)).deleted, true);
  assert.equal((await context.service.delete('bob', item.id)).deleted, true);
});

test('invalid payloads and unauthenticated calls are rejected before writes', async () => {
  const context = fixture();
  await assert.rejects(context.service.create(null, { name: 'Áo', category: 'TOP' }), { code: 'unauthenticated' });
  await assert.rejects(context.service.create('alice', { name: '', category: 'TOP' }), { code: 'invalid-argument' });
  await assert.rejects(context.service.create('alice', { name: 'Áo', category: 'INVALID' }), { code: 'invalid-argument' });
  assert.equal(context.database.documents.size, 0);
});
