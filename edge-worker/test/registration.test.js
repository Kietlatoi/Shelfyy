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

const GMAIL_ENV = {
  GMAIL_CLIENT_ID: 'gmail-client-id',
  GMAIL_CLIENT_SECRET: 'gmail-client-secret',
  GMAIL_REFRESH_TOKEN: 'gmail-refresh-token',
  GMAIL_FROM: 'sender@gmail.com',
};

function gmailFetch(onMessage) {
  return async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      return response({ access_token: 'gmail-access-token' });
    }
    assert.equal(url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    assert.equal(options.headers.authorization, 'Bearer gmail-access-token');
    const { raw } = JSON.parse(options.body);
    const message = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const encodedSubject = message.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)?.[1];
    onMessage?.({
      message,
      subject: Buffer.from(encodedSubject, 'base64').toString('utf8'),
    });
    return response({ id: 'gmail-message-id' });
  };
}

test('registration code is emailed as five digits and only its hash is kept in KV', async () => {
  const kv = new FakeKv();
  let emailPayload;
  const env = {
    RATE_LIMITS: kv,
    EMAIL_OTP_PEPPER: 'test-pepper-with-enough-entropy',
    ...GMAIL_ENV,
  };
  const result = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes', {
      headers: { 'cf-connecting-ip': '203.0.113.10' },
    }),
    { email: ' User@Example.com ' },
    {
      fetchImpl: gmailFetch((payload) => { emailPayload = payload; }),
    },
  );

  const code = emailPayload.subject.slice(0, 5);
  assert.match(code, /^\d{5}$/);
  assert.match(emailPayload.message, /^To: user@example\.com$/m);
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
    ...GMAIL_ENV,
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const challenge = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes'),
    { email: 'mai@example.com' },
    {
      fetchImpl: gmailFetch((payload) => { code = payload.subject.slice(0, 5); }),
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
    ...GMAIL_ENV,
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const challenge = await requestRegistrationCode(
    env,
    new Request('https://worker.test/v1/auth/registration-codes'),
    { email: 'mai@example.com' },
    {
      fetchImpl: gmailFetch((payload) => { sentCode = payload.subject.slice(0, 5); }),
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
    ...GMAIL_ENV,
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
        return gmailFetch((payload) => { emailPayload = payload; })(url, options);
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
    ...GMAIL_ENV,
    FIREBASE_PROJECT_ID: 'shelfy-test',
    FIREBASE_API_KEY: 'firebase-public-key',
  };
  const dependencies = {
    getAccessToken: async () => 'service-token',
    fetchImpl: async (url, options) => {
      if (url.includes('accounts:lookup')) {
        return response({ users: [{ localId: 'uid-1', email: 'mai@example.com' }] });
      }
      if (url.includes('googleapis.com/token') || url.includes('gmail.googleapis.com')) {
        return gmailFetch((payload) => { sentCode = payload.subject.slice(0, 5); })(url, options);
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
    ...GMAIL_ENV,
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
