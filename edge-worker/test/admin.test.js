import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAdmin } from '../src/admin.js';

test('admin access is restricted to the configured owner UID', () => {
  const env = { ADMIN_UID: 'owner-uid' };
  assert.equal(assertAdmin(env, { uid: 'owner-uid' }).uid, 'owner-uid');
  assert.throws(
    () => assertAdmin(env, { uid: 'regular-user' }),
    (error) => error.status === 403 && error.code === 'ADMIN_REQUIRED',
  );
});
