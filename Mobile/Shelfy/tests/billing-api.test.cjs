const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(file, mocks, env = {}) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env },
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

function fixture(play = false) {
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
    '../constants/distribution': {
      isGooglePlayBuild: play,
      requireDirectPayments: () => { if (play) throw new Error('Mua gói chưa khả dụng trên bản Google Play.'); },
    },
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
  assert.equal((await payments.createPayment('PRO', 'exp://127.0.0.1:8081/--/payment/result')).planId, 'PRO');
  assert.equal(context.calls[0].path, '/v1/billing/plans');
  assert.equal(context.calls[1].path, '/v1/billing/me');
  assert.equal(context.calls[2].path, '/v1/billing/checkout');
  assert.equal(context.calls[2].options.body.planId, 'PRO');
  assert.match(context.calls[2].options.body.requestId, /^\d+-[a-z0-9]+$/);
  assert.equal(context.calls[2].options.body.appReturnUrl, 'exp://127.0.0.1:8081/--/payment/result');
  assert.equal('price' in context.calls[2].options.body, false);
  assert.equal(/api.?key|checksum|client.?id/i.test(JSON.stringify(context.calls)), false);
});

test('Google Play build blocks PayOS API calls even when its server catalog enables purchases', async () => {
  const context = fixture(true);
  const subscriptions = loadModule('src/api/subscriptionApi.js', context.common).subscriptionApi;
  const payments = loadModule('src/api/paymentApi.js', context.common).paymentApi;
  const catalog = await subscriptions.getPlans();
  assert.equal(catalog.provider, 'GOOGLE_PLAY');
  assert.equal(catalog.purchaseEnabled, false);
  assert.equal(await payments.getPendingPayment(), null);
  await assert.rejects(payments.createPayment('PRO'), /Google Play/);
  await assert.rejects(payments.getPayment('123'), /Google Play/);
  await assert.rejects(payments.cancelPayment('123'), /Google Play/);
  assert.equal(context.calls.length, 0);
});

test('EAS profiles select their payment channel at build time', () => {
  const profiles = require('../eas.json').build;
  assert.equal(profiles.preview.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL, 'DIRECT');
  assert.equal(profiles.production.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL, 'GOOGLE_PLAY');
  assert.equal(profiles.apkpure.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL, 'APKPURE');
  assert.equal(profiles.apkpure.android.buildType, 'apk');
  assert.equal(profiles.apkpure.android.autoIncrement, true);
});

test('distribution guard blocks Google Play while allowing direct builds', () => {
  const direct = loadModule('src/constants/distribution.js', {}, { EXPO_PUBLIC_DISTRIBUTION_CHANNEL: 'DIRECT' });
  assert.equal(direct.isGooglePlayBuild, false);
  assert.doesNotThrow(() => direct.requireDirectPayments());
  const apkpure = loadModule('src/constants/distribution.js', {}, { EXPO_PUBLIC_DISTRIBUTION_CHANNEL: 'APKPURE' });
  assert.equal(apkpure.isGooglePlayBuild, false);
  assert.doesNotThrow(() => apkpure.requireDirectPayments());
  const play = loadModule('src/constants/distribution.js', {}, { EXPO_PUBLIC_DISTRIBUTION_CHANNEL: 'GOOGLE_PLAY' });
  assert.equal(play.isGooglePlayBuild, true);
  assert.throws(() => play.requireDirectPayments(), /Google Play/);
});

test('Google Play displays store offer price and sends only SKU and token for server verification', async () => {
  const calls = [];
  const api = loadModule('src/api/googlePlayApi.js', {
    './edgeApi': { edgeRequest: async (...args) => { calls.push(args); return { status: 'PAID' }; } },
  });
  const offer = api.playOffer({ id: 'pro', currency: 'VND', displayPrice: '69.000 ₫',
    discountOffers: [{ currency: 'VND', displayPrice: '65.000 ₫', offerTokenAndroid: 'offer' }] });
  assert.equal(offer.displayPrice, '65.000 ₫');
  assert.equal(offer.offerToken, 'offer');
  assert.equal(api.playOffer({ id: 'pro', currency: 'USD' }), null);
  assert.equal(api.playOffer({ id: 'pro', currency: 'VND', discountOffers: [{ currency: 'VND', rentalDetailsAndroid: {} }] }), null);
  await api.googlePlayApi.verify({ productId: 'pro', purchaseToken: 'google-token', price: 1, status: 'PAID' });
  assert.equal(calls[0][0], '/v1/billing/google-play/verify');
  assert.equal(JSON.stringify(calls[0][1].body), '{"productId":"pro","purchaseToken":"google-token"}');
  assert.throws(() => api.googlePlayApi.verify({ productId: 'pro' }), /chưa trả đủ/);
});
