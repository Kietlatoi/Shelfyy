const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture({ destination = 'mobile', invalidState = false, configured = true, tokenError = false } = {}) {
  const routes = {};
  const calls = { writes: [], exchanges: 0, consumed: 0 };
  const router = {};
  for (const method of ['get', 'post', 'delete']) {
    router[method] = (url, ...handlers) => { routes[method + url] = handlers.at(-1); };
  }
  const query = async (sql, params) => {
    calls.writes.push({ sql, params });
    return { rows: [], rowCount: 0 };
  };
  const dependencies = {
    crypto: require('node:crypto'),
    express: { Router: () => router },
    '../middleware/auth': { authenticate() {} },
    '../db': {
      query,
      withTransaction: async (callback) => callback({ query: async () => {
        calls.consumed += 1;
        return invalidState ? { rowCount: 0, rows: [] } : {
          rowCount: 1, rows: [{ user_id: 42, redirect_after: destination }],
        };
      } }),
    },
    '../services/cryptoBox': { encryptSecret: () => 'encrypted', decryptSecret: () => '' },
    '../services/googleOAuthClient': {
      getConfig: () => ({ scopes: 'calendar' }),
      buildAuthorizationUrl: () => {
        if (!configured) throw Object.assign(new Error('Missing config'), { code: 'GOOGLE_CALENDAR_NOT_CONFIGURED' });
        return 'https://accounts.google.com/authorize';
      },
      exchangeCodeForTokens: async () => {
        calls.exchanges += 1;
        if (tokenError) throw new Error('Token exchange failed');
        return { access_token: 'private-token', refresh_token: 'private-refresh', expires_in: 3600 };
      },
      getGoogleProfile: async () => ({ id: 'user', email: 'test@example.com' }),
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/calendar.js'), 'utf8'), {
    require: (name) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    },
    module: { exports: {} }, process: { env: {} }, URL,
  });
  const res = {
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    type(value) { this.contentType = value; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    redirect(value) { this.location = value; return this; },
  };
  return { routes, calls, res };
}

test('mobile connect records a fixed destination, ignoring a supplied redirect URL', async () => {
  const { routes, calls, res } = fixture();
  await routes['post/google/connect']({ user: { userId: 42 }, body: { client: 'mobile', redirect: 'https://evil.example' } }, res, assert.ifError);
  assert.equal(calls.writes[1].params[2], 'mobile');
  assert.equal(res.statusCode, 201);
  assert.match(res.body.authorizationUrl, /^https:\/\/accounts.google.com/);
});

test('missing OAuth configuration fails before database writes', async () => {
  const { routes, calls, res } = fixture({ configured: false });
  let error;
  await routes['post/google/connect']({ user: { userId: 42 }, body: {} }, res, (err) => { error = err; });
  assert.equal(error.code, 'GOOGLE_CALENDAR_NOT_CONFIGURED');
  assert.equal(calls.writes.length, 0);
});

test('mobile callback stores tokens and shows a completion page without exposing tokens', async () => {
  const { routes, calls, res } = fixture();
  await routes['get/google/callback']({ query: { code: 'code', state: 'state' } }, res);
  assert.match(res.body, /Đã kết nối Google Calendar/);
  assert.equal(res.location, undefined);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.doesNotMatch(res.body, /private-token|private-refresh/);
  assert.equal(calls.exchanges, 1);
  assert.ok(calls.writes.some(({ sql }) => sql.includes('INSERT INTO calendar_connections')));
});

test('web callback keeps its existing frontend redirect', async () => {
  const { routes, res } = fixture({ destination: '/#/home' });
  await routes['get/google/callback']({ query: { code: 'code', state: 'state' } }, res);
  assert.equal(res.location, 'http://localhost:5173/#/home?calendar=connected');
});

test('denial validates and consumes state without exchanging a code', async () => {
  const { routes, calls, res } = fixture();
  await routes['get/google/callback']({ query: { error: 'access_denied', state: 'state' } }, res);
  assert.match(res.body, /chưa cấp quyền/);
  assert.equal(calls.consumed, 1);
  assert.equal(calls.exchanges, 0);
});

test('expired or replayed state cannot exchange tokens', async () => {
  const { routes, calls, res } = fixture({ invalidState: true });
  await routes['get/google/callback']({ query: { code: 'code', state: 'expired' } }, res);
  assert.equal(calls.exchanges, 0);
  assert.match(res.location, /GOOGLE_OAUTH_STATE_INVALID/);
});

test('mobile token exchange failure shows an error page', async () => {
  const { routes, res } = fixture({ tokenError: true });
  await routes['get/google/callback']({ query: { code: 'code', state: 'state' } }, res);
  assert.match(res.body, /Chưa thể kết nối/);
  assert.equal(res.location, undefined);
});
