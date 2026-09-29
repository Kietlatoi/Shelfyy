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
  const callable = (name) => async (payload) => {
    calls.push({ name, payload });
    return { data: { name } };
  };
  const common = {
    'firebase/functions': { httpsCallable: (_functions, name) => callable(name) },
    '../firebase/client': { functions: {} },
  };
  return { calls, common };
}

test('subscription and payment APIs use Firebase callables and never pass price or provider secrets', async () => {
  const context = fixture();
  const subscriptions = loadModule('src/api/subscriptionApi.js', context.common).subscriptionApi;
  const payments = loadModule('src/api/paymentApi.js', context.common).paymentApi;
  assert.deepEqual(await subscriptions.getPlans(), { name: 'getSubscriptionPlans' });
  assert.deepEqual(await subscriptions.getMyPlan(), { name: 'getMyEntitlement' });
  assert.deepEqual(await payments.createVnpayPayment('PRO'), { name: 'createVnpayPayment' });
  assert.equal(JSON.stringify(context.calls), JSON.stringify([
    { name: 'getSubscriptionPlans', payload: {} },
    { name: 'getMyEntitlement', payload: {} },
    { name: 'createVnpayPayment', payload: { planId: 'PRO' } },
  ]));
});
