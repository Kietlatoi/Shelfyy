const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTryOnService } = require('../tryOn');

function fakeDatabase(seed = {}) {
  const documents = new Map(Object.entries(seed));
  let transactionQueue = Promise.resolve();
  const ref = (path) => ({
    path,
    id: path.split('/').at(-1),
    async get() {
      const data = documents.get(path);
      return { exists: Boolean(data), id: path.split('/').at(-1), ref: ref(path), data: () => data };
    },
    async update(changes) { documents.set(path, { ...documents.get(path), ...changes }); },
    async set(data) { documents.set(path, data); },
    async delete() { documents.delete(path); },
  });
  const collection = (path, filters = [], sort = null, maximum = Infinity) => ({
    where: (field, operator, value) => collection(path, [...filters, [field, operator, value]], sort, maximum),
    orderBy: field => collection(path, filters, field, maximum),
    limit: count => collection(path, filters, sort, count),
    async get() {
      let rows = [...documents].filter(([key, value]) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1
        && filters.every(([field, operator, expected]) => {
          assert.equal(operator, '<=');
          return value[field] <= expected;
        }));
      if (sort) rows.sort((a, b) => a[1][sort] - b[1][sort]);
      const docs = await Promise.all(rows.slice(0, maximum).map(([key]) => ref(key).get()));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  return {
    documents,
    doc: ref,
    collection,
    runTransaction(callback) {
      const result = transactionQueue.then(() => callback({
        get: (reference) => reference.get(),
        create: (reference, data) => {
          if (documents.has(reference.path)) throw new Error('already exists');
          documents.set(reference.path, data);
        },
        set: (reference, data) => documents.set(reference.path, data),
        update: (reference, data) => documents.set(reference.path, { ...documents.get(reference.path), ...data }),
      }));
      transactionQueue = result.catch(() => {});
      return result;
    },
  };
}

function fixture({ limit = 5, planId = 'FREE', expiresAt = null, replicateOverrides = {}, cloudinaryOverrides = {} } = {}) {
  const database = fakeDatabase({
    'users/alice': { timeZone: 'Asia/Ho_Chi_Minh' },
    'users/alice/entitlements/current': { planId, status: 'ACTIVE', tryOnLimit: limit, expiresAt },
    'users/alice/wardrobe/top-1': {
      name: 'Áo sơ mi', brand: 'Shelfy', color: 'trắng', category: 'TOP', status: 'IN_USE',
      image: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/wardrobe/top-1.jpg', publicId: 'alice/wardrobe/top-1' },
    },
  });
  let predictionCreates = 0;
  const submittedInputs = [];
  let predictionStatus = { id: 'prediction-1', status: 'starting' };
  const deletedAssets = [];
  const uploadedResults = [];
  let time = Date.parse('2026-09-26T04:00:00.000Z');
  const service = createTryOnService({
    database,
    serverTimestamp: () => 'server-time',
    deleteField: () => null,
    cloudName: 'shelfy',
    now: () => time,
    replicate: {
      isConfigured: () => true,
      async createPrediction(input) { predictionCreates += 1; submittedInputs.push(input); return { id: 'prediction-1', status: 'starting' }; },
      async getPrediction() { return predictionStatus; },
      async cancelPrediction() { return { status: 'canceled' }; },
      ...replicateOverrides,
    },
    cloudinary: {
      async createTemporaryInputUrl(input) {
        return `https://api.cloudinary.com/v1_1/shelfy/image/download?public_id=${encodeURIComponent(input.publicId)}`;
      },
      async uploadResultFromUrl(sourceUrl, input) {
        uploadedResults.push({ sourceUrl, input });
        return { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-results/job.png', publicId: `${input.uid}/tryon-results/${input.jobId}` };
      },
      async deleteImage(publicId) { deletedAssets.push(publicId); },
      ...cloudinaryOverrides,
    },
  });
  return {
    database,
    service,
    deletedAssets,
    uploadedResults,
    submittedInputs,
    predictionCreates: () => predictionCreates,
    setPredictionStatus: (value) => { predictionStatus = value; },
    advance: milliseconds => { time += milliseconds; },
    now: () => time,
  };
}

function validInput(requestId = 'request-12345678') {
  return {
    requestId,
    clothingItemId: 'top-1',
    personImage: {
      secureUrl: 'https://res.cloudinary.com/shelfy/image/authenticated/v1/alice/tryon-input/person.jpg',
      publicId: 'alice/tryon-input/person',
      format: 'jpg',
      deliveryType: 'authenticated',
    },
  };
}

test('create reserves quota, validates same-user assets, and deduplicates retry requests', async () => {
  const context = fixture();
  const first = await context.service.create('alice', validInput());
  const retry = await context.service.create('alice', validInput());

  assert.equal(first.jobId, retry.jobId);
  assert.equal(first.status, 'PROCESSING');
  assert.equal(context.predictionCreates(), 1);
  assert.match(context.submittedInputs[0].personImageUrl, /^https:\/\/api\.cloudinary\.com\/v1_1\/shelfy\/image\/download\?/);
  assert.equal(context.database.documents.get(`users/alice/wardrobe/top-1`).wearCount, undefined);
  const usage = [...context.database.documents.entries()].find(([path]) => path.startsWith('_tryOnUsage/'))[1];
  assert.equal(usage.count, 1);
  assert.equal(context.database.documents.has(`_tryOnJobs/${first.jobId}`), true);
  assert.equal('personImage' in context.database.documents.get(`users/alice/tryOns/${first.jobId}`), false);
});

test('try-on status persists the provider output in Cloudinary and removes the temporary portrait', async () => {
  const context = fixture();
  const job = await context.service.create('alice', validInput());
  context.setPredictionStatus({ id: 'prediction-1', status: 'succeeded', output: ['https://replicate.delivery/example/output.png'], metrics: { predict_time: 9.5 } });
  const completed = await context.service.getStatus('alice', job.jobId);

  assert.equal(completed.status, 'DONE');
  assert.equal(completed.resultImageUrl, 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-results/job.png');
  assert.equal(completed.processingTimeMs, 9500);
  assert.equal(context.uploadedResults[0].sourceUrl, 'https://replicate.delivery/example/output.png');
  assert.deepEqual(context.deletedAssets, ['alice/tryon-input/person']);
  assert.equal(context.database.documents.get(`_tryOnJobs/${job.jobId}`).personImage, null);
});

test('ownership, provider setup, and quota are checked before a second prediction can run', async () => {
  const context = fixture({ limit: 1, planId: 'PRO', expiresAt: new Date('2027-01-01T00:00:00Z') });
  await assert.rejects(context.service.create('bob', {
    ...validInput(),
    personImage: {
      secureUrl: 'https://res.cloudinary.com/shelfy/image/authenticated/v1/bob/tryon-input/person.jpg',
      publicId: 'bob/tryon-input/person',
      format: 'jpg',
      deliveryType: 'authenticated',
    },
  }), { code: 'not-found' });
  await assert.rejects(context.service.create('alice', { ...validInput('request-second'), personImage: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/v1/bob/tryon-input/x.jpg', publicId: 'bob/tryon-input/x' } }), { code: 'invalid-argument' });
  await assert.rejects(context.service.create('alice', { ...validInput('request-third'), personImage: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-input/x.jpg', publicId: 'alice/tryon-input/x', deliveryType: 'upload' } }), { code: 'invalid-argument' });
  await context.service.create('alice', validInput());
  await assert.rejects(context.service.create('alice', validInput('request-second')), { code: 'resource-exhausted' });
  assert.equal(context.predictionCreates(), 1);
});

test('an expired paid entitlement falls back to five tries per day', async () => {
  const context = fixture({ limit: 100, planId: 'PRO', expiresAt: new Date('2026-09-25T00:00:00.000Z') });
  for (let index = 0; index < 5; index += 1) {
    await context.service.create('alice', validInput(`expired-plan-${index}`));
  }
  await assert.rejects(context.service.create('alice', validInput('expired-plan-six')), { code: 'resource-exhausted' });
  assert.equal(context.predictionCreates(), 5);
});

test('saving requires a completed result and delete history is idempotent and owner-scoped', async () => {
  const context = fixture();
  const job = await context.service.create('alice', validInput());
  await assert.rejects(context.service.setSaved('alice', job.jobId, true), { code: 'failed-precondition' });
  context.setPredictionStatus({ id: 'prediction-1', status: 'succeeded', output: 'https://replicate.delivery/example/output.png' });
  await context.service.getStatus('alice', job.jobId);
  assert.equal((await context.service.setSaved('alice', job.jobId, true)).isSaved, true);
  await assert.rejects(context.service.setSaved('bob', job.jobId, false), { code: 'not-found' });
  assert.equal((await context.service.deleteHistory('alice', job.jobId)).deleted, true);
  assert.equal(context.database.documents.get(`users/alice/tryOns/${job.jobId}`).isDeleted, true);
  await assert.rejects(context.service.getStatus('alice', job.jobId), { code: 'not-found' });
});

test('background reconcile finishes a try-on without mobile polling and cleans its portrait', async () => {
  const context = fixture();
  const job = await context.service.create('alice', validInput());
  context.setPredictionStatus({ status: 'succeeded', output: 'https://replicate.delivery/example/result.png' });
  assert.deepEqual(await context.service.reconcile(), { examined: 0 });
  context.advance(60_000);
  assert.deepEqual(await context.service.reconcile(), { examined: 1 });
  const saved = context.database.documents.get(`users/alice/tryOns/${job.jobId}`);
  const internal = context.database.documents.get(`_tryOnJobs/${job.jobId}`);
  assert.equal(saved.status, 'DONE');
  assert.match(saved.resultImage.secureUrl, /^https:\/\/res\.cloudinary\.com\/shelfy\//);
  assert.equal(context.uploadedResults.length, 1);
  assert.deepEqual(context.deletedAssets, ['alice/tryon-input/person']);
  assert.equal(internal.personImage, null);
  assert.equal(internal.nextReconcileAtMillis, Number.MAX_SAFE_INTEGER);
});

test('one failed provider poll is deferred while another job completes in the same reconcile batch', async () => {
  let calls = 0;
  const context = fixture({ replicateOverrides: {
    getPrediction: async () => {
      if (++calls === 1) throw new Error('Provider transport failure');
      return { status: 'succeeded', output: 'https://replicate.delivery/example/result.png' };
    },
  } });
  const first = await context.service.create('alice', validInput('first-request'));
  const second = await context.service.create('alice', validInput('second-request'));
  context.advance(60_000);
  assert.deepEqual(await context.service.reconcile(), { examined: 2 });
  assert.equal(context.database.documents.get(`users/alice/tryOns/${first.jobId}`).status, 'PROCESSING');
  assert.equal(context.database.documents.get(`_tryOnJobs/${first.jobId}`).nextReconcileAtMillis, context.now() + 5 * 60_000);
  assert.equal(context.database.documents.get(`users/alice/tryOns/${second.jobId}`).status, 'DONE');
});

test('reconcile retries portrait and result cleanup after a deleted job hits Cloudinary errors', async () => {
  let providerAvailable = false;
  const removed = [];
  const context = fixture({ cloudinaryOverrides: {
    deleteImage: async publicId => {
      if (!providerAvailable) throw new Error('Cloudinary outage');
      removed.push(publicId);
    },
  } });
  const job = await context.service.create('alice', validInput());
  context.setPredictionStatus({ status: 'succeeded', output: 'https://replicate.delivery/example/result.png' });
  context.advance(60_000);
  await context.service.reconcile();
  const publicPath = `users/alice/tryOns/${job.jobId}`;
  const privatePath = `_tryOnJobs/${job.jobId}`;
  assert.equal(context.database.documents.get(privatePath).inputCleanupPending, true);
  await context.service.deleteHistory('alice', job.jobId);
  assert.equal(context.database.documents.get(publicPath).isDeleted, true);
  assert.equal(context.database.documents.get(publicPath).resultCleanupPending, true);
  providerAvailable = true;
  context.advance(60_000);
  await context.service.reconcile();
  assert.deepEqual(removed, ['alice/tryon-input/person', `alice/tryon-results/${job.jobId}`]);
  assert.equal(context.database.documents.get(privatePath).personImage, null);
  assert.equal(context.database.documents.get(privatePath).inputCleanupPending, false);
  assert.equal(context.database.documents.get(publicPath).resultImage, null);
  assert.equal(context.database.documents.get(publicPath).resultCleanupPending, false);
  assert.equal(context.database.documents.get(privatePath).nextReconcileAtMillis, Number.MAX_SAFE_INTEGER);
});

test('reconcile leaves jobs owned by a deleting account for account cleanup without provider work', async () => {
  let polls = 0;
  const context = fixture({ replicateOverrides: { getPrediction: async () => { polls++; throw new Error('Must not poll'); } } });
  const job = await context.service.create('alice', validInput());
  context.database.documents.set('_accountAccess/alice', { status: 'deleting' });
  context.advance(60_000);
  assert.deepEqual(await context.service.reconcile(), { examined: 1 });
  assert.equal(polls, 0);
  assert.equal(context.uploadedResults.length, 0);
  assert.equal(context.deletedAssets.length, 0);
  assert.equal(context.database.documents.get(`users/alice/tryOns/${job.jobId}`).status, 'PROCESSING');
  assert.equal(context.database.documents.get(`_tryOnJobs/${job.jobId}`).nextReconcileAtMillis, context.now() + 5 * 60_000);
});
