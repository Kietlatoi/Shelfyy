const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMediaService } = require('../media');

function fakeDatabase(seed = {}) {
  let documents = new Map(Object.entries(seed));
  const field = (data, name) => name.split('.').reduce((value, part) => value?.[part], data);
  const snapshot = (path, source = documents) => ({
    id: path.split('/').at(-1), ref: doc(path), exists: source.has(path), data: () => source.get(path),
  });
  function query(select, filters = [], sort = null, maximum = Infinity) {
    return {
      where: (name, operator, value) => query(select, [...filters, [name, operator, value]], sort, maximum),
      orderBy: name => query(select, filters, name, maximum),
      limit: count => query(select, filters, sort, count),
      async get(source = documents) {
        let rows = [...source].filter(([path, data]) => select(path) && filters.every(([name, operator, expected]) => {
          const actual = field(data, name);
          if (operator === '==') return actual === expected;
          if (operator === '<=') return actual <= expected;
          if (operator === 'array-contains') return Array.isArray(actual) && actual.includes(expected);
          throw new Error(`Unsupported fake query operator ${operator}`);
        }));
        if (sort) rows.sort((a, b) => field(a[1], sort) - field(b[1], sort));
        const docs = rows.slice(0, maximum).map(([path]) => snapshot(path, source));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  function collection(path) {
    return query(candidate => candidate.startsWith(`${path}/`) && candidate.split('/').length === path.split('/').length + 1);
  }
  function doc(path) {
    return {
      path, collection: name => collection(`${path}/${name}`),
      get: async (source = documents) => snapshot(path, source),
      async create(data) { assert.equal(documents.has(path), false, 'Document already exists'); documents.set(path, data); },
      async update(data) { assert.ok(documents.has(path), 'Document must exist for update'); documents.set(path, { ...documents.get(path), ...data }); },
    };
  }
  return {
    get documents() { return documents; },
    doc, collection,
    collectionGroup: name => query(path => path.split('/').at(-2) === name),
    async runTransaction(callback) {
      const working = new Map(documents);
      let hasWritten = false;
      const tx = {
        get: async ref => { assert.equal(hasWritten, false, 'Firestore requires all reads before writes'); return ref.get(working); },
        update: (ref, patch) => { hasWritten = true; assert.ok(working.has(ref.path)); working.set(ref.path, { ...working.get(ref.path), ...patch }); },
        set: (ref, data, options) => { hasWritten = true; working.set(ref.path, options?.merge ? { ...working.get(ref.path), ...data } : data); },
      };
      const result = await callback(tx);
      documents = working;
      return result;
    },
  };
}

const DAY = 86_400_000;
function fixture(seed = {}) {
  const database = fakeDatabase(seed);
  const deleted = [];
  const verified = [];
  let time = 1_800_000_000_000;
  const cloudinary = {
    verifyUpload: async ({ publicId, deliveryType }) => {
      verified.push({ publicId, deliveryType });
      return { publicId, deliveryType, secureUrl: `https://res.cloudinary.com/shelfy/image/${deliveryType}/v1/${publicId}.jpg`,
        format: 'jpg', bytes: 5000, width: 640, height: 960 };
    },
    deleteImage: async (publicId, deliveryType) => { deleted.push({ publicId, deliveryType }); },
  };
  const service = createMediaService({ database, cloudinary, serverTimestamp: () => 'server-time', now: () => time });
  return { database, service, cloudinary, deleted, verified, advance: milliseconds => { time += milliseconds; }, now: () => time };
}

test('register and complete store only canonical verified metadata and completion is idempotent', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  const ref = f.service.reference('alice', 'alice/wardrobe/shirt');
  assert.equal((await ref.get()).data().state, 'pending');
  const asset = await f.service.complete('alice', 'alice/wardrobe/shirt');
  assert.deepEqual(asset, { publicId: 'alice/wardrobe/shirt', deliveryType: 'upload',
    secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/wardrobe/shirt.jpg',
    format: 'jpg', bytes: 5000, width: 640, height: 960 });
  assert.deepEqual((await ref.get()).data().asset, asset);
  assert.equal((await ref.get()).data().state, 'ready');
  assert.deepEqual(await f.service.complete('alice', asset.publicId), asset);
  assert.equal(f.verified.length, 1);
});

test('complete rejects a different user or an unregistered upload', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  await assert.rejects(f.service.complete('bob', 'alice/wardrobe/shirt'), { code: 'failed-precondition' });
  await assert.rejects(f.service.complete('alice', 'alice/wardrobe/missing'), { code: 'failed-precondition' });
  assert.equal(f.verified.length, 0);
});

test('complete rejects an unregistered public ID even when its basename matches a registered folder', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  await assert.rejects(f.service.complete('alice', 'alice/avatars/shirt'), { code: 'failed-precondition' });
  assert.equal(f.verified.length, 0);
});

test('already verified completion cannot be retrieved under a different folder with the same basename', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  await f.service.complete('alice', 'alice/wardrobe/shirt');
  await assert.rejects(f.service.complete('alice', 'alice/avatars/shirt'), { code: 'failed-precondition' });
});

test('attachment public ID must match the registered asset as well as its verified URL', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  const asset = await f.service.complete('alice', 'alice/wardrobe/shirt');
  const forged = { ...asset, publicId: 'alice/avatars/shirt' };
  await assert.rejects(f.database.runTransaction(tx => f.service.readAttachments(tx, 'alice', [forged], 'wardrobe')), { code: 'failed-precondition' });
});

for (const state of ['pending', 'deleting', 'deleted']) {
  test(`attachments reject an asset in ${state} state`, async () => {
    const f = fixture();
    const publicId = 'alice/wardrobe/shirt';
    await f.service.register('alice', 'wardrobe', publicId);
    const ref = f.service.reference('alice', publicId);
    const asset = await f.cloudinary.verifyUpload({ publicId, deliveryType: 'upload' });
    await ref.update({ state, asset });
    await assert.rejects(f.database.runTransaction(tx => f.service.readAttachments(tx, 'alice', [asset], 'wardrobe')), { code: 'failed-precondition' });
  });
}

test('attachments reject tampered URL and wrong intent but verified assets can be retained', async () => {
  const f = fixture();
  await f.service.register('alice', 'wardrobe', 'alice/wardrobe/shirt');
  const asset = await f.service.complete('alice', 'alice/wardrobe/shirt');
  await assert.rejects(f.database.runTransaction(tx => f.service.readAttachments(tx, 'alice', [{ ...asset, secureUrl: 'https://other/image.jpg' }], 'wardrobe')));
  await assert.rejects(f.database.runTransaction(tx => f.service.readAttachments(tx, 'alice', [asset], 'avatar')));
  await f.database.runTransaction(async tx => {
    const refs = await f.service.readAttachments(tx, 'alice', [asset], 'wardrobe');
    f.service.retain(tx, refs);
  });
  assert.equal((await f.service.reference('alice', asset.publicId).get()).data().state, 'retained');
});

for (const [name, path, reference] of [
  ['wardrobe image', 'users/alice/wardrobe/item', publicId => ({ image: { publicId } })],
  ['wardrobe thumbnail', 'users/alice/wardrobe/item', publicId => ({ thumbnail: { publicId } })],
  ['suggestion history', 'users/alice/suggestions/outfit', publicId => ({ mediaPublicIds: [publicId] })],
  ['daily outfit history', 'users/alice/dailyOutfits/day', publicId => ({ mediaPublicIds: [publicId] })],
  ['try-on history', 'users/alice/tryOns/job', publicId => ({ mediaPublicIds: [publicId] })],
  ['profile avatar', 'users/alice', publicId => ({ avatar: { publicId } })],
  ['pending try-on job', '_tryOnJobs/job', publicId => ({ personImage: { publicId } })],
]) {
  test(`cleanup preserves an image referenced by ${name}`, async () => {
    const publicId = 'alice/wardrobe/shirt';
    const f = fixture({ [path]: reference(publicId) });
    await f.service.register('alice', 'wardrobe', publicId);
    await f.service.complete('alice', publicId);
    f.advance(2 * DAY);
    const ref = f.service.reference('alice', publicId);
    await f.service.cleanupOne(ref);
    assert.deepEqual(f.deleted, []);
    assert.equal((await ref.get()).data().cleanupAfterMillis, f.now() + 30 * DAY);
  });
}

for (const [intent, publicId, deliveryType] of [
  ['wardrobe', 'alice/wardrobe/shirt', 'upload'],
  ['tryOnInput', 'alice/tryon-input/person', 'authenticated'],
]) {
  test(`orphan cleanup uses ${deliveryType} delivery and does not repeat a successful delete`, async () => {
    const f = fixture();
    await f.service.register('alice', intent, publicId);
    await f.service.complete('alice', publicId);
    const ref = f.service.reference('alice', publicId);
    await f.service.cleanupOne(ref);
    assert.equal(f.deleted.length, 0, 'New uploads receive a grace period');
    f.advance(2 * DAY);
    await f.service.cleanupOne(ref);
    await f.service.cleanupOne(ref);
    assert.deepEqual(f.deleted, [{ publicId, deliveryType }]);
    assert.equal((await ref.get()).data().state, 'deleted');
  });
}

test('scheduled cleanup retries provider failures and keeps the asset unavailable for attachment', async () => {
  const f = fixture();
  const publicId = 'alice/tryon-input/person';
  await f.service.register('alice', 'tryOnInput', publicId);
  const asset = await f.service.complete('alice', publicId);
  f.advance(2 * DAY);
  f.cloudinary.deleteImage = async () => { throw new Error('Temporary provider outage'); };
  assert.deepEqual(await f.service.cleanup(), { examined: 1 });
  const ref = f.service.reference('alice', publicId);
  assert.equal((await ref.get()).data().state, 'deleting');
  await assert.rejects(f.database.runTransaction(tx => f.service.readAttachments(tx, 'alice', [asset], 'tryOnInput')));
  assert.deepEqual(await f.service.cleanup(), { examined: 0 });
  f.advance(60 * 60_000);
  f.cloudinary.deleteImage = async (id, type) => f.deleted.push({ publicId: id, deliveryType: type });
  assert.deepEqual(await f.service.cleanup(), { examined: 1 });
  assert.deepEqual(f.deleted, [{ publicId, deliveryType: 'authenticated' }]);
  assert.equal((await ref.get()).data().state, 'deleted');
});
