import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeFields, encodeFields } from '../src/firestore-rest.js';

test('Firestore REST codec preserves financial report fields', () => {
  const input = {
    orderCode: 123456789,
    price: 69000,
    paid: true,
    fee: null,
    plan: 'PRO',
    items: [{ name: 'PRO', quantity: 1 }],
  };
  assert.deepEqual(decodeFields(encodeFields(input)), input);
});

test('Firestore REST codec omits undefined fields', () => {
  const encoded = encodeFields({ kept: 'yes', omitted: undefined });
  assert.deepEqual(Object.keys(encoded), ['kept']);
});
