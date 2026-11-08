import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  PLANS,
  quotaDescriptor,
  resolveAppReturnUrl,
  validatePaymentStatus,
  verifyPayOsSignature,
} from '../src/billing.js';

test('PayOS signature sorts fields alphabetically and verifies HMAC-SHA256', async () => {
  const data = {
    returnUrl: 'https://example.com/return',
    orderCode: 123456,
    description: 'SHELFY 123456',
    cancelUrl: 'https://example.com/cancel',
    amount: 69000,
  };
  const checksumKey = 'test-checksum-key';
  const serialized = 'amount=69000&cancelUrl=https://example.com/cancel&description=SHELFY 123456&orderCode=123456&returnUrl=https://example.com/return';
  const signature = createHmac('sha256', checksumKey).update(serialized).digest('hex');
  assert.equal(await verifyPayOsSignature(data, signature, checksumKey), true);
  assert.equal(await verifyPayOsSignature({ ...data, amount: 1 }, signature, checksumKey), false);
});

test('catalog keeps server-authoritative Shelfy prices and limits', () => {
  assert.equal(PLANS.PRO.price, 69000);
  assert.equal(PLANS.PRO.durationDays, 30);
  assert.equal(PLANS.PRO.tryOnLimit, 100);
  assert.equal(PLANS.PREMIUM.price, 599000);
  assert.equal(PLANS.PREMIUM.durationDays, 365);
  assert.equal(PLANS.PREMIUM.tryOnLimit, 500);
  assert.equal(PLANS.FREE.wardrobeLimit, 100);
});

test('quota keys isolate free daily and paid monthly usage', () => {
  const free = quotaDescriptor(PLANS.FREE, 'uid-1');
  const pro = quotaDescriptor(PLANS.PRO, 'uid-1');
  assert.match(free.key, /^quota:uid-1:FREE:\d{4}-\d{2}-\d{2}$/);
  assert.match(pro.key, /^quota:uid-1:PRO:\d{4}-\d{2}$/);
  assert.equal(free.limit, 5);
  assert.equal(pro.limit, 100);
});

test('financial ledger accepts only documented statuses', () => {
  for (const status of ['CREATING', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW', 'REFUNDED']) {
    assert.equal(validatePaymentStatus(status), true);
  }
  assert.equal(validatePaymentStatus('SUCCESS'), false);
});

test('payment return URL accepts the installed app and Expo Go result route only', () => {
  const env = { APP_DEEP_LINK: 'shelfy://payment/result' };
  assert.equal(resolveAppReturnUrl(env), 'shelfy://payment/result');
  assert.equal(resolveAppReturnUrl(env, 'shelfy://payment/result'), 'shelfy://payment/result');
  assert.equal(
    resolveAppReturnUrl(env, 'exp://192.168.1.20:8081/--/payment/result'),
    'exp://192.168.1.20:8081/--/payment/result',
  );
  assert.throws(() => resolveAppReturnUrl(env, 'https://attacker.example/payment/result'), {
    code: 'INVALID_APP_RETURN_URL',
  });
  assert.throws(() => resolveAppReturnUrl(env, 'shelfy://profile/payment-history'), {
    code: 'INVALID_APP_RETURN_URL',
  });
});
