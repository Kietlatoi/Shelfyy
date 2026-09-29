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

function fixture(pages = []) {
  const reads = [];
  const callableCalls = [];
  const mockData = {};
  const mocks = {
    'firebase/firestore': {
      collection: (_db, ...segments) => segments.join('/'),
      getDocs: async (request) => { reads.push(request); return pages.shift(); },
      limit: (value) => ({ type: 'limit', value }),
      orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
      query: (base, ...constraints) => ({ base, constraints }),
      startAfter: (cursor) => ({ type: 'startAfter', cursor }),
      where: (field, operator, value) => ({ type: 'where', field, operator, value }),
    },
    'firebase/functions': {
      httpsCallable: (_functions, name) => async (payload) => {
        callableCalls.push({ name, payload });
        const result = mockData[name];
        if (result instanceof Error) throw result;
        return { data: result };
      },
    },
    '../firebase/client': { auth: { currentUser: { uid: 'alice' } }, db: {}, functions: {} },
  };
  return { api: loadModule('src/api/trialApi.js', mocks).trialApi, reads, callableCalls, mockData };
}

test('trial history maps Firestore snapshots and uses a cursor for the next page', async () => {
  const first = { id: 'job-1', data: () => ({ status: 'DONE', isDeleted: false, resultImage: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/tryon-results/job-1' }, itemSnapshot: { id: 'top-1', name: 'Áo' } }) };
  const second = { id: 'job-2', data: () => ({ status: 'FAILED', isDeleted: false, isSaved: true }) };
  const context = fixture([{ docs: [first, second] }, { docs: [second] }]);
  const page0 = await context.api.getHistory({ page: 0, size: 1, saved: true });
  const page1 = await context.api.getHistory({ page: 1, size: 1, saved: true });

  assert.equal(page0.content[0].jobId, 'job-1');
  assert.equal(page0.content[0].resultImageUrl, 'https://res.cloudinary.com/shelfy/image/upload/alice/tryon-results/job-1');
  assert.equal(page0.content[0].clothingItem.name, 'Áo');
  assert.equal(page1.content[0].jobId, 'job-2');
  assert.ok(context.reads[1].constraints.some((item) => item.type === 'where' && item.field === 'isSaved' && item.value === true));
  assert.equal(context.reads[1].constraints.find((item) => item.type === 'startAfter').cursor.id, 'job-1');
});

test('trial API reuses a request ID after a lost response and uses Functions for job actions', async () => {
  const context = fixture();
  context.mockData.createTryOnJob = new Error('Connection lost');
  const api = context.api;
  await assert.rejects(api.generate({ personImage: { publicId: 'alice/tryon-input/person' }, clothingItemId: 'top-1' }), /Connection lost/);
  // Replace this fixture's callable behavior in-place for the retried response.
  const callableIndex = context.callableCalls.length;
  context.mockData.createTryOnJob = { jobId: 'job-1', status: 'PROCESSING' };
  const original = api.generate;
  assert.equal(callableIndex, 1);

  const calls = context.callableCalls;
  assert.equal(calls[0].name, 'createTryOnJob');
  assert.ok(calls[0].payload.requestId);
  // The module-scope request ID remains live through the mocked failure.
  await original({ personImage: { publicId: 'alice/tryon-input/person' }, clothingItemId: 'top-1' });
  assert.equal(calls[0].payload.requestId, calls[1].payload.requestId);

  context.mockData.getTryOnJobStatus = { jobId: 'job-1', status: 'DONE' };
  context.mockData.setTryOnJobSaved = { isSaved: true };
  context.mockData.deleteTryOnJob = { deleted: true };
  assert.equal((await api.getStatus('job-1')).status, 'DONE');
  assert.equal((await api.setSaved('job-1', true)).isSaved, true);
  assert.equal((await api.deleteHistory('job-1')).deleted, true);
  assert.deepEqual(calls.slice(-3).map((call) => call.name), ['getTryOnJobStatus', 'setTryOnJobSaved', 'deleteTryOnJob']);
});
