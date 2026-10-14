import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPlayPurchase, validatePlayPurchase, playAccountId, playMoney, getPlayContext } from '../src/google-play.js';
import { decodeFields } from '../src/firestore-rest.js';

const env = { FIREBASE_PROJECT_ID: 'shelfy-test', GOOGLE_PLAY_PRO_PRODUCT_ID: 'pro', GOOGLE_PLAY_PREMIUM_PRODUCT_ID: 'premium' };
const user = { uid: 'user-1', email: 'test@example.com' };
const token = 'google-test-purchase-token';

async function fixture(plan = null) {
  const documents = new Map([['users/user-1', { data: { email: user.email }, updateTime: 'v1' }]]);
  if (plan) documents.set('users/user-1/entitlements/current', { data: plan, updateTime: 'v1' });
  const get = async (_env, path) => documents.get(path) || null;
  let commits = 0;
  const deps = {
    getDocument: get,
    batchGetDocuments: async (_env, paths) => Promise.all(paths.map((path) => get(_env, path))),
    withTransaction: async (_env, work) => work('tx'),
    commitWrites: async (_env, writes) => {
      commits += 1;
      for (const write of writes) {
        const path = write.update.name.split('/documents/')[1];
        documents.set(path, { data: decodeFields(write.update.fields), updateTime: `v${commits + 1}` });
      }
    },
  };
  const purchase = {
    obfuscatedExternalAccountId: await playAccountId(user.uid),
    purchaseStateContext: { purchaseState: 'PURCHASED' },
    productLineItem: [{ productId: 'pro', productOfferDetails: { quantity: 1, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' } }],
    orderId: 'GPA.test', purchaseCompletionTime: new Date().toISOString(),
  };
  return { documents, deps, purchase, grant: (p = purchase, t = token, amount = 69000) => applyPlayPurchase(env, user, p, t, p.productLineItem[0].productId, amount, deps) };
}

test('Play context stays unavailable until credentials and distinct product IDs are configured', async () => {
  assert.equal((await getPlayContext(env, user)).purchaseEnabled, false);
  assert.equal((await getPlayContext({ ...env, GOOGLE_PLAY_BILLING_ENABLED: 'true', FIREBASE_CLIENT_EMAIL: 'service', FIREBASE_PRIVATE_KEY: 'key' }, user)).purchaseEnabled, true);
});

test('Google purchase grants exactly once and keeps tokens out of user history', async () => {
  const f = await fixture();
  const payment = await f.grant();
  const before = f.documents.get('users/user-1/entitlements/current').data.expiresAt;
  assert.equal(payment.status, 'PAID');
  assert.equal(payment.provider, 'GOOGLE_PLAY');
  assert.equal(payment.amountPaid, 69000);
  assert.equal('purchaseToken' in payment, false);
  assert.equal('purchaseTokenHash' in payment, false);
  await f.grant();
  assert.equal(f.documents.get('users/user-1/entitlements/current').data.expiresAt, before);
  assert.equal(f.documents.get(`users/user-1/payments/${payment.orderCode}`).data.purchaseToken, undefined);
});

test('Google pending purchase does not grant rights until payment completes', async () => {
  const f = await fixture();
  const pending = { ...f.purchase, purchaseStateContext: { purchaseState: 'PENDING' } };
  assert.equal((await f.grant(pending, token, null)).status, 'PENDING');
  assert.equal(f.documents.has('users/user-1/entitlements/current'), false);
  assert.equal((await f.grant()).status, 'PAID');
});

test('Google renewal extends same plan, upgrade starts PREMIUM immediately, downgrade needs review', async () => {
  const expiresAt = new Date(Date.now() + 10 * 86400000).toISOString();
  const f = await fixture({ planId: 'PRO', status: 'ACTIVE', expiresAt });
  await f.grant();
  assert.equal(Date.parse(f.documents.get('users/user-1/entitlements/current').data.expiresAt), Date.parse(expiresAt) + 30 * 86400000);
  const premium = { ...f.purchase, productLineItem: [{ productId: 'premium' }] };
  await f.grant(premium, 'new-premium-token', 599000);
  const current = f.documents.get('users/user-1/entitlements/current').data;
  assert.equal(current.planId, 'PREMIUM');
  assert.ok(Math.abs(Date.parse(current.expiresAt) - Date.now() - 365 * 86400000) < 5000);
  assert.equal((await f.grant(f.purchase, 'later-pro-token')).status, 'REVIEW');
  assert.equal(f.documents.get('users/user-1/entitlements/current').data.expiresAt, current.expiresAt);
});

test('Google rejects forged ownership, invalid SKU, quantity and consumed tokens without ledger', async () => {
  const f = await fixture();
  assert.throws(() => validatePlayPurchase(f.purchase, 'pro', 'another-user'), /không thuộc/);
  assert.throws(() => validatePlayPurchase(f.purchase, 'premium', f.purchase.obfuscatedExternalAccountId), /không hợp lệ/);
  await assert.rejects(f.grant({ ...f.purchase, productLineItem: [{ productId: 'pro', productOfferDetails: { quantity: 2 } }] }), /không hợp lệ/);
  await assert.rejects(f.grant({ ...f.purchase, productLineItem: [{ productId: 'pro', productOfferDetails: { consumptionState: 'CONSUMPTION_STATE_CONSUMED' } }] }), /đã được sử dụng/);
  assert.equal(f.documents.size, 1);
});

test('Google test payments grant rights but contribute zero to real revenue', async () => {
  const f = await fixture();
  const payment = await f.grant({ ...f.purchase, testPurchaseContext: { fopType: 'TEST' } });
  assert.equal(payment.status, 'PAID');
  assert.equal(payment.amountPaid, 0);
  assert.equal(payment.providerAmount, 69000);
  assert.equal(payment.isTest, true);
});

test('Google refund revokes the latest grant once and cannot be restored by replay', async () => {
  const f = await fixture();
  await f.grant();
  const cancelled = { ...f.purchase, purchaseStateContext: { purchaseState: 'CANCELLED' } };
  assert.equal((await f.grant(cancelled)).status, 'REFUNDED');
  assert.equal(f.documents.get('users/user-1/entitlements/current').data.planId, 'FREE');
  assert.equal((await f.grant()).status, 'REFUNDED');
  assert.equal((await f.grant(cancelled)).status, 'REFUNDED');
});

test('Google amount comes from authenticated order total, not mobile or PayOS catalog', () => {
  assert.equal(playMoney({ total: { currencyCode: 'VND', units: '68000', nanos: 0 }, lineItems: [{ productId: 'pro' }] }, 'pro'), 68000);
  assert.throws(() => playMoney({ total: { currencyCode: 'USD', units: '3' }, lineItems: [{ productId: 'pro' }] }, 'pro'), /VND/);
  assert.throws(() => playMoney({ total: { currencyCode: 'VND', units: '69000' }, lineItems: [{ productId: 'premium' }] }, 'pro'), /khớp sản phẩm/);
});
