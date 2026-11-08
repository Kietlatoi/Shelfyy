const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createVnpayClient } = require('../vnpayClient');

function createClient() {
  return createVnpayClient({
    getConfig: () => ({
      tmnCode: 'SHELFY01', hashSecret: 'sandbox-secret',
      payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: 'https://example.test/vnpayReturn', ipnUrl: 'https://example.test/vnpayIpn',
    }),
    now: () => new Date('2026-09-27T04:00:00.000Z'),
    randomInt: () => 1234,
  });
}

test('VNPay amount conversion accepts integer VND and rejects client-controlled decimals', () => {
  const client = createClient();
  assert.equal(client.amountToVnpAmount(99000), '9900000');
  assert.throws(() => client.amountToVnpAmount('99000.50'));
  assert.throws(() => client.amountToVnpAmount(-100));
});

test('payment URL uses a VND amount and signature verified without hash fields', () => {
  const client = createClient();
  const paymentUrl = client.buildPaymentUrl({ amount: 99000, clientIp: '192.0.2.4', orderInfo: 'Shelfy PRO test', txnRef: 'txn-1' });
  const url = new URL(paymentUrl);
  const params = Object.fromEntries(url.searchParams.entries());
  assert.equal(url.origin, 'https://sandbox.vnpayment.vn');
  assert.equal(params.vnp_Amount, '9900000');
  assert.equal(params.vnp_CurrCode, 'VND');
  assert.equal(params.vnp_TmnCode, 'SHELFY01');
  assert.equal(client.verifySignature(params), true);
  params.vnp_Amount = '100';
  assert.equal(client.verifySignature(params), false);
});

test('verification rejects missing, malformed, and ambiguous repeated values', () => {
  const client = createClient();
  assert.equal(client.verifySignature({}), false);
  assert.equal(client.verifySignature({ vnp_SecureHash: 'abcd' }), false);
  assert.equal(client.verifySignature({ vnp_TxnRef: ['a', 'b'], vnp_SecureHash: 'a'.repeat(128) }), false);
});
