const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCalendarOAuthService } = require('../calendarOAuth');

function fakeDatabase() {
  const documents = new Map();
  return {
    documents,
    doc(path) {
      return {
        async get() {
          const data = documents.get(path);
          return { exists: Boolean(data), data: () => data };
        },
        async set(data) { documents.set(path, data); },
        async delete() { documents.delete(path); },
      };
    },
    async runTransaction(callback) {
      return callback({
        get: (reference) => reference.get(),
        delete: (reference) => reference.delete(),
        set: (reference, data) => reference.set(data),
      });
    },
  };
}

function serviceOverrides(overrides = {}) {
  const database = fakeDatabase();
  const requests = [];
  const service = createCalendarOAuthService({
    database,
    clientId: 'test-client.apps.googleusercontent.com',
    clientSecret: 'test-secret',
    redirectUri: 'https://example.test/calendarCallback',
    serverTimestamp: () => 'server-time',
    timestampFromMillis: (milliseconds) => ({ toMillis: () => milliseconds }),
    now: () => 1_000_000,
    randomBytes: (size) => Buffer.alloc(size, 7),
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      return String(url).includes('/token')
        ? { ok: true, async json() { return { access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600, scope: 'calendar-scope' }; } }
        : { ok: true, async json() { return { id: 'google-user-1', email: 'mai@example.test' }; } };
    },
    ...overrides,
  });
  return { database, requests, service };
}

test('OAuth start creates an expiring hashed state and PKCE challenge bound to the user', async () => {
  const { database, service } = serviceOverrides();
  const result = await service.start('shelfy-user-1');
  const url = new URL(result.authorizationUrl);
  const stored = [...database.documents.entries()].find(([path]) => path.startsWith('_calendarOAuthStates/'))[1];

  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('state'), result.state);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.equal(stored.uid, 'shelfy-user-1');
  assert.notEqual(stored.stateHash, result.state);
  assert.equal(stored.expiresAt.toMillis(), 1_600_000);
  assert.ok(stored.codeVerifier);
});

test('OAuth callback consumes state once and stores tokens only in the private collection', async () => {
  const { database, requests, service } = serviceOverrides();
  const { state, authorizationUrl } = await service.start('shelfy-user-1');
  assert.ok(authorizationUrl);

  assert.deepEqual(await service.complete({ state, code: 'authorization-code' }), { status: 'connected' });
  assert.equal(database.documents.has(`_calendarOAuthStates/${require('node:crypto').createHash('sha256').update(state).digest('hex')}`), false);

  const privateConnection = database.documents.get('_googleCalendarConnections/shelfy-user-1');
  const publicStatus = database.documents.get('users/shelfy-user-1/integrationStatus/googleCalendar');
  assert.equal(privateConnection.accessToken, 'private-access');
  assert.equal(privateConnection.refreshToken, 'private-refresh');
  assert.equal(privateConnection.providerEmail, 'mai@example.test');
  assert.equal(publicStatus.connected, true);
  assert.equal(publicStatus.providerEmail, 'mai@example.test');
  assert.equal('accessToken' in publicStatus, false);
  assert.equal(requests[0].options.body.includes('code_verifier='), true);
  assert.equal((await service.complete({ state, code: 'authorization-code' })).status, 'error');
});

test('OAuth denial consumes a valid state without exchanging a code', async () => {
  const { database, requests, service } = serviceOverrides();
  const { state } = await service.start('shelfy-user-1');

  assert.deepEqual(await service.complete({ state, error: 'access_denied' }), { status: 'denied' });
  assert.equal(requests.length, 0);
  assert.equal(database.documents.has('users/shelfy-user-1/integrationStatus/googleCalendar'), false);
});

test('OAuth setup fails before creating state when configuration is missing', async () => {
  const { database, service } = serviceOverrides({ clientId: '' });
  await assert.rejects(service.start('shelfy-user-1'), { code: 'failed-precondition' });
  assert.equal(database.documents.size, 0);
});
