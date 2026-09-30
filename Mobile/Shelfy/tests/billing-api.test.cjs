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

function fixture() {
  const calls = [];
  const storage = new Map();
  const edgeRequest = async (path, options = {}) => {
    calls.push({ path, options });
    if (path === '/v1/billing/plans') return { provider: 'PAYOS', purchaseEnabled: true, plans: [] };
    if (path === '/v1/billing/me') return { planId: 'FREE' };
    if (path === '/v1/billing/checkout') {
      return { orderCode: 1234567890, planId: options.body.planId, status: 'PENDING', expiresAt: '2099-01-01T00:00:00.000Z' };
    }
    throw new Error(`Unexpected edge path ${path}`);
  };
  const common = {
    'firebase/firestore': {
      collection: () => ({}), doc: () => ({}), getDoc: async () => ({ exists: () => false }),
      getDocs: async () => ({ docs: [] }), limit: (value) => value, orderBy: () => ({}), query: () => ({}),
    },
    '../firebase/client': { auth: { currentUser: { uid: 'uid-1' } }, db: {} },
    './edgeApi': { edgeRequest },
    '@react-native-async-storage/async-storage': {
      __esModule: true,
      default: {
        getItem: async (key) => storage.get(key) || null,
        setItem: async (key, value) => storage.set(key, value),
        removeItem: async (key) => storage.delete(key),
      },
    },
  };
  return { calls, common };
}

test('subscription and payment APIs use the Worker and never pass price or provider secrets', async () => {
  const context = fixture();
  const subscriptions = loadModule('src/api/subscriptionApi.js', context.common).subscriptionApi;
  const payments = loadModule('src/api/paymentApi.js', context.common).paymentApi;
  assert.equal((await subscriptions.getPlans()).provider, 'PAYOS');
  assert.equal((await subscriptions.getMyPlan()).planId, 'FREE');
  assert.equal((await payments.createPayment('PRO')).planId, 'PRO');
  assert.equal(context.calls[0].path, '/v1/billing/plans');
  assert.equal(context.calls[1].path, '/v1/billing/me');
  assert.equal(context.calls[2].path, '/v1/billing/checkout');
  assert.equal(context.calls[2].options.body.planId, 'PRO');
  assert.match(context.calls[2].options.body.requestId, /^\d+-[a-z0-9]+$/);
  assert.equal('price' in context.calls[2].options.body, false);
  assert.equal(/api.?key|checksum|client.?id/i.test(JSON.stringify(context.calls)), false);
});
