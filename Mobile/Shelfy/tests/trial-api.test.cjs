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
    encodeURIComponent,
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

function fixture(pages = []) {
  const reads = [];
  const writes = [];
  const edgeCalls = [];
  const edgeResults = [];
  const documents = new Map();
  const firestore = {
    collection: (_db, ...segments) => segments.join('/'),
    doc: (_db, ...segments) => segments.join('/'),
    getDoc: async (reference) => documents.get(reference) || {
      id: reference.split('/').at(-1), exists: () => false, data: () => null,
    },
    getDocs: async (request) => { reads.push(request); return pages.shift(); },
    limit: (value) => ({ type: 'limit', value }),
    orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
    query: (base, ...constraints) => ({ base, constraints }),
    serverTimestamp: () => 'SERVER_TIME',
    setDoc: async (reference, data) => {
      writes.push({ type: 'set', reference, data });
      documents.set(reference, { id: reference.split('/').at(-1), exists: () => true, data: () => data });
    },
    startAfter: (cursor) => ({ type: 'startAfter', cursor }),
    updateDoc: async (reference, data) => {
      writes.push({ type: 'update', reference, data });
      const previous = documents.get(reference)?.data() || {};
      documents.set(reference, {
        id: reference.split('/').at(-1),
        exists: () => true,
        data: () => ({ ...previous, ...data }),
      });
    },
    where: (field, operator, value) => ({ type: 'where', field, operator, value }),
  };
  const mocks = {
    'firebase/firestore': firestore,
    '../firebase/client': { auth: { currentUser: { uid: 'alice' } }, db: {} },
    './edgeApi': {
      edgeRequest: async (url, options) => {
        edgeCalls.push({ url, options });
        const result = edgeResults.shift();
        if (result instanceof Error) throw result;
        return result;
      },
    },
  };
  return {
    api: loadModule('src/api/trialApi.js', mocks).trialApi,
    reads,
    writes,
    edgeCalls,
    edgeResults,
    documents,
  };
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

test('trial API reuses a request ID after a lost Worker response and persists job actions', async () => {
  const context = fixture();
  const clothingItem = {
    id: 'top-1',
    name: 'Áo',
    category: 'TOP',
    image: { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/top.jpg', publicId: 'alice/top' },
  };
  const personImage = { secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/person.jpg', publicId: 'alice/person' };
  context.edgeResults.push(new Error('Connection lost'), { jobId: 'job-1', status: 'PROCESSING' });
  await assert.rejects(context.api.generate({ personImage, clothingItem }), /Connection lost/);
  await context.api.generate({ personImage, clothingItem });

  assert.equal(context.edgeCalls[0].url, '/v1/try-on/predictions');
  assert.equal(context.edgeCalls[0].options.body.requestId, context.edgeCalls[1].options.body.requestId);
  assert.ok(context.writes.some((write) => write.reference === 'users/alice/tryOns/job-1'));

  context.edgeResults.push({ jobId: 'job-1', status: 'DONE', resultImage: { secureUrl: 'https://example.com/result.jpg' } });
  assert.equal((await context.api.getStatus('job-1')).status, 'DONE');
  assert.equal((await context.api.setSaved('job-1', true)).isSaved, true);
  context.edgeResults.push({ reported: true });
  assert.equal((await context.api.reportResult('job-1', 'OFFENSIVE')).reported, true);
  context.edgeResults.push({ deleted: true });
  assert.equal((await context.api.deleteHistory('job-1')).deleted, true);
  assert.deepEqual(
    context.edgeCalls.slice(-3).map((call) => call.url),
    [
      '/v1/try-on/predictions/job-1/status',
      '/v1/try-on/predictions/job-1/report',
      '/v1/try-on/predictions/job-1',
    ],
  );
});
