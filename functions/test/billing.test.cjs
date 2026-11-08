const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBillingService, PLAN_CATALOG } = require('../billing');

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
        set: (reference, data) => documents.set(reference.path, data),
        update: (reference, data) => documents.set(reference.path, { ...documents.get(reference.path), ...data }),
        delete: (reference) => documents.delete(reference.path),
      }));
      queue = result.catch(() => {});
      return result;
    },
  };
}

function fixture({ enabled = true, seed = {}, now = Date.parse('2026-09-27T04:00:00.000Z') } = {}) {
  const database = fakeDatabase(seed);
  let txnRef = 'txn-10001';
  const urlInputs = [];
  const vnpay = {
    isConfigured: () => true,
    generateTxnRef: () => txnRef,
    buildPaymentUrl: (input) => { urlInputs.push(input); return `https://sandbox.vnpayment.vn/pay/${input.txnRef}`; },
    verifySignature: (params) => params.vnp_SecureHash === 'valid',
    amountToVnpAmount: (amount) => String(Number(amount) * 100),
    getConfig: () => ({ tmnCode: 'SHELFY', payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' }),
  };
  const service = createBillingService({
    database,
    vnpay,
    paymentsEnabled: () => enabled,
    serverTimestamp: () => 'server-time',
    now: () => now,
  });
  return { database, service, urlInputs, setTxnRef: (value) => { txnRef = value; } };
}

test('catalog returns server-owned prices and plan limits', async () => {
  const { service } = fixture();
  const catalog = await service.getPlans('alice');
  assert.deepEqual(catalog.plans, PLAN_CATALOG);
  assert.equal(catalog.plans.find((plan) => plan.id === 'PRO').price, 99000);
  assert.equal(catalog.purchaseEnabled, true);
});

test('missing entitlement resolves to Free and reports quota from the private usage ledger', async () => {
  const usageId = require('node:crypto').createHash('sha256').update('alice').digest('hex');
  const { service, database } = fixture({ seed: {
    [`_tryOnUsage/${usageId}`]: { periodKey: '2026-09-27', count: 2 },
  } });
  const plan = await service.getMyPlan('alice');
  assert.equal(plan.planId, 'FREE');
  assert.equal(plan.quota.used, 2);
  assert.equal(plan.quota.limit, 5);
  assert.equal(database.documents.get('users/alice/entitlements/current').planId, 'FREE');
});

test('expired paid plans are safely downgraded and use the Free daily limit', async () => {
  const { service, database } = fixture({ seed: {
    'users/alice/entitlements/current': {
      planId: 'PRO', status: 'ACTIVE', tryOnLimit: 100,
      expiresAt: new Date('2026-09-26T04:00:00.000Z'), source: 'VNPAY',
    },
  } });
  const plan = await service.getMyPlan('alice');
  assert.equal(plan.planId, 'FREE');
  assert.equal(plan.quota.limit, 5);
  assert.equal(database.documents.get('users/alice/entitlements/current').expiredPlanId, 'PRO');
});

test('payment creation is disabled until configured and takes amount only from the catalog', async () => {
  const disabled = fixture({ enabled: false });
  await assert.rejects(disabled.service.createVnpayPayment('alice', { planId: 'PRO' }), { code: 'failed-precondition' });

  const context = fixture();
  const created = await context.service.createVnpayPayment('alice', { planId: 'PRO', amount: 1 });
  assert.equal(created.transactionCode, 'txn-10001');
  assert.equal(created.paymentUrl, 'https://sandbox.vnpayment.vn/pay/txn-10001');
  assert.equal(context.urlInputs[0].amount, 99000);
  assert.equal(context.database.documents.get('users/alice/payments/txn-10001').status, 'PENDING');
});

test('signed callback activates entitlement once and duplicate callbacks stay idempotent', async () => {
  const context = fixture();
  await context.service.createVnpayPayment('alice', { planId: 'PRO' });
  const callback = {
    vnp_SecureHash: 'valid', vnp_TxnRef: 'txn-10001', vnp_Amount: '9900000',
    vnp_TmnCode: 'SHELFY', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '987654',
  };
  const first = await context.service.processVnpayCallback(callback);
  const duplicate = await context.service.processVnpayCallback(callback);
  const entitlement = context.database.documents.get('users/alice/entitlements/current');
  assert.equal(first.success, true);
  assert.equal(duplicate.success, true);
  assert.equal(duplicate.rspCode, '02');
  assert.equal(entitlement.planId, 'PRO');
  assert.equal(entitlement.tryOnLimit, 100);
  assert.equal(new Date(entitlement.expiresAt).getTime(), Date.parse('2026-10-27T04:00:00.000Z'));
  assert.equal(context.database.documents.get('users/alice/payments/txn-10001').status, 'SUCCESS');
});

test('invalid signatures and amount mismatches cannot grant a plan', async () => {
  const context = fixture();
  await context.service.createVnpayPayment('alice', { planId: 'PRO' });
  const base = {
    vnp_TmnCode: 'SHELFY', vnp_TxnRef: 'txn-10001', vnp_Amount: '1', vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
  };
  const invalid = await context.service.processVnpayCallback({ ...base, vnp_SecureHash: 'bad' });
  const mismatch = await context.service.processVnpayCallback({ ...base, vnp_SecureHash: 'valid' });
  assert.equal(invalid.rspCode, '97');
  assert.equal(mismatch.rspCode, '04');
  assert.equal(context.database.documents.get('users/alice/entitlements/current'), undefined);
  assert.equal(context.database.documents.get('users/alice/payments/txn-10001').status, 'FAILED');
});

test('active higher tier cannot be downgraded by starting a lower tier checkout', async () => {
  const context = fixture({ seed: {
    'users/alice/entitlements/current': {
      planId: 'PREMIUM', status: 'ACTIVE', expiresAt: new Date('2026-10-27T04:00:00.000Z'),
    },
  } });
  await assert.rejects(context.service.createVnpayPayment('alice', { planId: 'PRO' }), { code: 'failed-precondition' });
});
