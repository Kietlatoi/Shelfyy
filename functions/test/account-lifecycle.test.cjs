const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccountLifecycle } = require('../accountLifecycle');

function fakeDatabase(seed = {}) {
  let documents = new Map(Object.entries(seed));
  let id = 0;
  const snapshot = (path, source = documents) => ({ id: path.split('/').at(-1), ref: doc(path), exists: source.has(path), data: () => source.get(path) });
  function collection(path, filters = [], ordering = null, maximum = Infinity, cursor = null) {
    return {
      doc: name => doc(`${path}/${name || `auto-${++id}`}`),
      async add(data) { const ref = this.doc(); await ref.set(data); return ref; },
      where: (field, operator, value) => collection(path, [...filters, [field, operator, value]], ordering, maximum, cursor),
      orderBy: field => collection(path, filters, field, maximum, cursor),
      limit: count => collection(path, filters, ordering, count, cursor),
      startAfter: value => collection(path, filters, ordering, maximum, value),
      async get(source = documents) {
        let rows = [...source].filter(([key, value]) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1
          && filters.every(([field, operator, expected]) => operator === '==' ? value[field] === expected : value[field] <= expected));
        const fieldValue = ([key, value]) => ordering === '__name__' ? key.split('/').at(-1) : value[ordering];
        if (ordering) rows.sort((a, b) => fieldValue(a) < fieldValue(b) ? -1 : fieldValue(a) > fieldValue(b) ? 1 : 0);
        if (cursor) rows = rows.filter(row => fieldValue(row) > cursor);
        const docs = rows.slice(0, maximum).map(([key]) => snapshot(key, source));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  function doc(path) {
    return {
      path, collection: name => collection(`${path}/${name}`),
      get: async (source = documents) => snapshot(path, source),
      set: async data => { documents.set(path, data); },
      update: async patch => { assert.ok(documents.has(path)); documents.set(path, { ...documents.get(path), ...patch }); },
      delete: async () => { documents.delete(path); },
    };
  }
  return {
    get documents() { return documents; }, doc, collection,
    async recursiveDelete(ref) { for (const path of documents.keys()) if (path === ref.path || path.startsWith(`${ref.path}/`)) documents.delete(path); },
    async runTransaction(callback) {
      const working = new Map(documents);
      let written = false;
      const result = await callback({
        get: ref => { assert.equal(written, false, 'Transactions must read before writing'); return ref.get(working); },
        set: (ref, data) => { written = true; working.set(ref.path, data); },
        create: (ref, data) => { written = true; assert.equal(working.has(ref.path), false); working.set(ref.path, data); },
        update: (ref, patch) => { written = true; assert.ok(working.has(ref.path)); working.set(ref.path, { ...working.get(ref.path), ...patch }); },
      });
      documents = working;
      return result;
    },
  };
}

function fixture(seed = {}) {
  const database = fakeDatabase(seed);
  let time = 1_800_000_000_000;
  const effects = { deletedUsers: [], updates: [], revoked: [], images: [], tryOns: [], calendars: [] };
  const auth = {
    updateUser: async (uid, patch) => { effects.updates.push({ uid, ...patch }); },
    revokeRefreshTokens: async uid => { effects.revoked.push(uid); },
    deleteUser: async uid => { effects.deletedUsers.push(uid); },
  };
  const cloudinary = { deleteImage: async (publicId, deliveryType) => { effects.images.push({ publicId, deliveryType }); } };
  const tryOn = { deleteHistory: async (uid, id) => { effects.tryOns.push(id); await database.doc(`users/${uid}/tryOns/${id}`).delete(); } };
  const calendar = { disconnect: async uid => { effects.calendars.push(uid); } };
  const service = createAccountLifecycle({ database, auth, cloudinary, tryOn, calendar, now: () => time, serverTimestamp: () => 'server-time' });
  return { database, auth, cloudinary, tryOn, service, effects, now: () => time, advance: milliseconds => { time += milliseconds; } };
}

test('self deletion requires authenticated recent sign-in and rejects stale or future claims', async () => {
  const f = fixture();
  await assert.rejects(f.service.requestSelfDeletion({}), { code: 'unauthenticated' });
  for (const auth_time of [undefined, (f.now() - 301_000) / 1000, (f.now() + 61_000) / 1000]) {
    await assert.rejects(f.service.requestSelfDeletion({ auth: { uid: 'alice', token: { auth_time } } }), { code: 'failed-precondition' });
  }
  assert.equal(f.database.documents.size, 0);
  assert.deepEqual(await f.service.requestSelfDeletion({ auth: { uid: 'alice', token: { auth_time: f.now() / 1000 } } }), { accepted: true });
});

test('duplicate deletion requests create one queued job, access tombstone and audit event', async () => {
  const f = fixture({ 'users/alice': { displayName: 'Alice' } });
  await f.service.requestDeletion('alice', 'user:alice');
  await f.service.requestDeletion('alice', 'admin:operator');
  assert.equal(f.database.documents.get('_accountAccess/alice').status, 'deleting');
  assert.equal(f.database.documents.get('_accountDeletionJobs/alice').phase, 'tryOns');
  const audit = [...f.database.documents].filter(([path]) => path.startsWith('_adminAudit/'));
  assert.equal(audit.length, 1);
  assert.deepEqual(audit[0][1], { action: 'request-account-deletion', uid: 'alice', actor: 'user:alice', createdAt: 'server-time' });
  assert.equal(f.database.documents.has('users/alice'), true);
});

for (const status of ['deleting', 'deleted']) {
  for (const disabled of [true, false]) {
    test(`setDisabled(${disabled}) refuses an account marked ${status}`, async () => {
      const f = fixture({ '_accountAccess/alice': { status } });
      await assert.rejects(f.service.setDisabled('alice', disabled, 'admin:operator'), { code: 'failed-precondition' });
      assert.equal(f.effects.updates.length, 0);
      assert.equal(f.database.documents.get('_accountAccess/alice').status, status);
    });
  }
}

test('a deletion request arriving during enable cannot be overwritten with active access', async () => {
  const f = fixture({ '_accountAccess/alice': { status: 'disabled' } });
  f.auth.updateUser = async () => { await f.service.requestDeletion('alice', 'user:alice'); };
  try { await f.service.setDisabled('alice', false, 'admin:operator'); }
  catch (error) { assert.equal(error.code, 'failed-precondition'); }
  assert.equal(f.database.documents.get('_accountAccess/alice').status, 'deleting');
});

test('Cloudinary failure preserves user data and Auth until retry finishes media cleanup', async () => {
  const asset = { publicId: 'alice/tryon-input/person', deliveryType: 'authenticated' };
  const f = fixture({
    'users/alice': { displayName: 'Alice' }, 'users/alice/mediaAssets/person': asset,
    '_accountAccess/alice': { status: 'deleting' },
    '_accountDeletionJobs/alice': { uid: 'alice', phase: 'media', cursor: null, nextAttemptMillis: 0 },
  });
  f.cloudinary.deleteImage = async () => { throw new Error('Provider unavailable'); };
  assert.deepEqual(await f.service.processQueue(), { examined: 1 });
  assert.equal(f.database.documents.has('users/alice/mediaAssets/person'), true);
  assert.equal(f.database.documents.has('users/alice'), true);
  assert.deepEqual(f.effects.deletedUsers, []);
  assert.equal(f.database.documents.get('_accountDeletionJobs/alice').phase, 'media');
  assert.equal(f.database.documents.get('_accountDeletionJobs/alice').leaseUntilMillis, 0);
  assert.deepEqual(await f.service.processQueue(), { examined: 0 });
  f.advance(5 * 60_000);
  f.cloudinary.deleteImage = async (publicId, deliveryType) => f.effects.images.push({ publicId, deliveryType });
  await f.service.processQueue();
  assert.deepEqual(f.effects.images, [asset]);
  assert.equal(f.database.documents.has('users/alice/mediaAssets/person'), false);
  assert.equal(f.database.documents.has('users/alice'), true);
  assert.deepEqual(f.effects.deletedUsers, []);
});

test('deletion progresses through providers and records while retaining reconciliation ledger', async () => {
  const ledger = { uid: 'alice', amount: 100000, status: 'PAID' };
  const f = fixture({
    'users/alice': { displayName: 'Alice' },
    'users/alice/tryOns/job': { status: 'DONE' },
    '_tryOnJobs/job': { uid: 'alice' },
    'users/alice/mediaAssets/shirt': { publicId: 'alice/wardrobe/shirt', deliveryType: 'upload' },
    'users/alice/wardrobe/item': { name: 'Shirt' },
    '_calendarOAuthStates/state': { uid: 'alice' },
    '_suggestionReceipts/receipt': { uid: 'alice' },
    '_wearEventReceipts/receipt': { uid: 'alice' },
    '_tryOnReceipts/receipt': { uid: 'alice' },
    '_wardrobeCounters/alice': { count: 1 },
    '_paymentTransactions/txn': ledger,
    'users/bob': { displayName: 'Bob' },
  });
  await f.service.requestDeletion('alice', 'user:alice');
  f.advance(65 * 60_000);
  for (let attempt = 0; attempt < 8 && f.database.documents.get('_accountDeletionJobs/alice').phase !== 'complete'; attempt++) await f.service.processQueue();
  assert.equal(f.database.documents.get('_accountDeletionJobs/alice').phase, 'complete');
  assert.deepEqual(f.effects.tryOns, ['job']);
  assert.deepEqual(f.effects.images, [{ publicId: 'alice/wardrobe/shirt', deliveryType: 'upload' }]);
  assert.deepEqual(f.effects.calendars, ['alice']);
  assert.deepEqual(f.effects.deletedUsers, ['alice']);
  assert.equal([...f.database.documents.keys()].some(path => path === 'users/alice' || path.startsWith('users/alice/')), false);
  for (const path of ['_tryOnJobs/job', '_calendarOAuthStates/state', '_suggestionReceipts/receipt', '_wearEventReceipts/receipt', '_tryOnReceipts/receipt', '_wardrobeCounters/alice']) assert.equal(f.database.documents.has(path), false, path);
  assert.deepEqual(f.database.documents.get('_paymentTransactions/txn'), ledger);
  assert.equal(f.database.documents.has('users/bob'), true);
  assert.equal(f.database.documents.get('_accountAccess/alice').status, 'deleted');
  assert.deepEqual(await f.service.processQueue(), { examined: 0 });
});

test('pending provider cancellation keeps the deletion in try-on phase without deleting its private job', async () => {
  const f = fixture({ 'users/alice/tryOns/job': { status: 'PROCESSING' }, '_tryOnJobs/job': { cancellationPending: true } });
  f.tryOn.deleteHistory = async () => {};
  await f.service.requestDeletion('alice', 'user:alice');
  f.advance(120_000);
  await f.service.processQueue();
  assert.equal(f.database.documents.get('_accountDeletionJobs/alice').phase, 'tryOns');
  assert.equal(f.database.documents.has('_tryOnJobs/job'), true);
  assert.deepEqual(f.effects.deletedUsers, []);
});
