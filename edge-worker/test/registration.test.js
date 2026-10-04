import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completePasswordReset,
  completeRegistration,
  requestPasswordResetCode,
  requestRegistrationCode,
} from '../src/registration.js';

class FakeKv {
  constructor() {
    this.values = new Map();
  }

  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('registration code is emailed as five digits and only its hash is kept in KV', async () => {
  const kv = new FakeKv();
  let emailPayload;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
  };
  const result = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes', {
      headers: { 'cf-connecting-ip': '203.0.113.10' },
    }),
    { email: ' User@Example.com ' },
    {
      fetchImpl: async (_url, options) => {
        emailPayload = JSON.parse(options.body);
        return response({ id: 'email-1' });
      },
    },
  );

  const code = emailPayload.subject.slice(0, 5);
  assert.match(code, /^\d{5}$/);
  assert.deepEqual(emailPayload.to, ['user@example.com']);
  const stored = await kv.get(`registration:challenge:${result.challengeId}`, 'json');
  assert.equal(Object.hasOwn(stored, 'code'), false);
  assert.match(stored.codeHash, /^[a-f0-9]{64}$/);
});

test('a valid code creates one verified Firebase account and consumes the challenge', async () => {
  const kv = new FakeKv();
  let code;
  let firebasePayload;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const challenge = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes'),
    { email: 'mai@example.com' },
    {
      fetchImpl: async (_url, options) => {
        code = JSON.parse(options.body).subject.slice(0, 5);
        return response({ id: 'email-2' });
      },
    },
  );

  const result = await completeRegistration(env, {
    challengeId: challenge.challengeId,
    email: 'mai@example.com',
    code,
    password: 'SafePassword-123!',
    fullName: 'Mai Anh',
  }, {
    getAccessToken: async () => 'service-token',
    fetchImpl: async (url, options) => {
      assert.match(url, /projects\/shelfy-test\/accounts/);
      assert.equal(options.headers.authorization, 'Bearer service-token');
      firebasePayload = JSON.parse(options.body);
      return response({ localId: 'firebase-uid-1' });
    },
  });

  assert.deepEqual(result, { created: true, uid: 'firebase-uid-1' });
  assert.deepEqual(firebasePayload, {
    email: 'mai@example.com',
    password: 'SafePassword-123!',
    displayName: 'Mai Anh',
    emailVerified: true,
  });
  assert.equal(await kv.get(`registration:challenge:${challenge.challengeId}`), null);
});

test('an incorrect code cannot create a Firebase account', async () => {
  const kv = new FakeKv();
  let sentCode;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const challenge = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes'),
    { email: 'mai@example.com' },
    {
      fetchImpl: async (_url, options) => {
        sentCode = JSON.parse(options.body).subject.slice(0, 5);
        return response({ id: 'email-3' });
      },
    },
  );
  const incorrectCode = sentCode === '99999' ? '00000' : '99999';

  await assert.rejects(completeRegistration(env, {
    challengeId: challenge.challengeId,
    email: 'mai@example.com',
    code: incorrectCode,
    password: 'SafePassword-123!',
    fullName: 'Mai Anh',
  }, {
    getAccessToken: async () => 'must-not-run',
    fetchImpl: async () => { throw new Error('must not create account'); },
  }), { code: 'INCORRECT_CODE' });
});

test('password reset sends an OTP only for an existing Firebase account', async () => {
  const kv = new FakeKv();
  let emailPayload;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
    FIREBASE_PROJECT_ID: 'shelfy-test',
  };
  const result = await requestPasswordResetCode(
    env,
    new Request('https://worker.test/v1/auth/password-reset-codes'),
    { email: 'mai@example.com' },
    {
      getAccessToken: async () => 'service-token',
      fetchImpl: async (url, options) => {
        if (url.includes('accounts:lookup')) {
          return response({ users: [{ localId: 'uid-1', email: 'mai@example.com' }] });
        }
        emailPayload = JSON.parse(options.body);
        return response({ id: 'email-reset-1' });
      },
    },
  );

  assert.match(emailPayload.subject, /^\d{5} là mã đặt lại mật khẩu Shelfy/);
  const challenge = await kv.get(`password-reset:challenge:${result.challengeId}`, 'json');
  assert.equal(challenge.accountUid, 'uid-1');
  assert.equal(Object.hasOwn(challenge, 'code'), false);
});

test('a valid password reset OTP updates Firebase and revokes older sessions', async () => {
  const kv = new FakeKv();
  let sentCode;
  let updatePayload;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const dependencies = {
    getAccessToken: async () => 'service-token',
    fetchImpl: async (url, options) => {
      if (url.includes('accounts:lookup')) {
        return response({ users: [{ localId: 'uid-1', email: 'mai@example.com' }] });
      }
      if (url === 'https://api.resend.com/emails') {
        sentCode = JSON.parse(options.body).subject.slice(0, 5);
        return response({ id: 'email-reset-2' });
      }
      updatePayload = JSON.parse(options.body);
      return response({ localId: 'uid-1' });
    },
  };
  const challenge = await requestPasswordResetCode(
    env,
    new Request('https://worker.test/v1/auth/password-reset-codes'),
    { email: 'mai@example.com' },
    dependencies,
  );
  const result = await completePasswordReset(env, {
    email: 'mai@example.com',
    challengeId: challenge.challengeId,
    code: sentCode,
    newPassword: 'NewSafePassword-456!',
  }, dependencies);

  assert.deepEqual(result, { updated: true });
  assert.equal(updatePayload.localId, 'uid-1');
  assert.equal(updatePayload.password, 'NewSafePassword-456!');
  assert.match(updatePayload.validSince, /^\d{10}$/);
  assert.equal(updatePayload.targetProjectId, 'shelfy-test');
  assert.equal(await kv.get(`password-reset:challenge:${challenge.challengeId}`), null);
});

test('password reset does not reveal whether an email is registered', async () => {
  const kv = new FakeKv();
  let resendCalls = 0;
  const result = await requestPasswordResetCode({
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Shelfy <verify@shelfy.test>',
    FIREBASE_PROJECT_ID: 'shelfy-test',
  }, new Request('https://worker.test/v1/auth/password-reset-codes'), {
    email: 'missing@example.com',
  }, {
    getAccessToken: async () => 'service-token',
    fetchImpl: async (url) => {
      if (url.includes('accounts:lookup')) return response({ users: [] });
      resendCalls += 1;
      return response({ id: 'unexpected' });
    },
  });

  assert.match(result.message, /Nếu email đã đăng ký/);
  assert.equal(resendCalls, 0);
});
