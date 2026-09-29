const crypto = require('node:crypto');

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');
const STATE_TTL_MILLIS = 10 * 60 * 1000;
const GOOGLE_TOKEN_TIMEOUT_MILLIS = 10 * 1000;

function createCalendarOAuthService({
  database,
  clientId,
  clientSecret,
  redirectUri,
  serverTimestamp,
  timestampFromMillis,
  now = Date.now,
  randomBytes = crypto.randomBytes,
  fetchImpl = fetch,
  HttpsError,
}) {
  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function readValue(value) {
    return typeof value === 'function' ? value() : value;
  }

  function config(requireSecret = false) {
    const id = String(readValue(clientId) || '').trim();
    const secret = String(readValue(clientSecret) || '').trim();
    const callbackUrl = String(readValue(redirectUri) || '').trim();
    if (!id || id === 'demo-client-id.apps.googleusercontent.com' || !callbackUrl) {
      fail('failed-precondition', 'Chưa cấu hình Google Calendar OAuth cho môi trường này.');
    }
    let parsedCallback;
    try {
      parsedCallback = new URL(callbackUrl);
    } catch {
      fail('failed-precondition', 'URL callback Google Calendar không hợp lệ.');
    }
    if (parsedCallback.protocol !== 'https:' || parsedCallback.hostname.endsWith('.invalid')) {
      fail('failed-precondition', 'Callback Google Calendar phải dùng HTTPS.');
    }
    if (requireSecret && !secret) {
      fail('failed-precondition', 'Chưa cấu hình secret Google Calendar OAuth.');
    }
    return { clientId: id, clientSecret: secret, redirectUri: callbackUrl };
  }

  function validState(state) {
    return typeof state === 'string' && state.length >= 32 && state.length <= 256;
  }

  function hashState(state) {
    return crypto.createHash('sha256').update(state).digest('hex');
  }

  async function start(uid) {
    if (typeof uid !== 'string' || !uid) fail('unauthenticated', 'Vui lòng đăng nhập để kết nối Google Calendar.');
    const oauthConfig = config();
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const stateHash = hashState(state);
    const expiresAtMillis = now() + STATE_TTL_MILLIS;

    await database.doc(`_calendarOAuthStates/${stateHash}`).set({
      uid,
      stateHash,
      codeVerifier,
      expiresAt: timestampFromMillis(expiresAtMillis),
      createdAt: serverTimestamp(),
    });

    const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
    authorizationUrl.searchParams.set('client_id', oauthConfig.clientId);
    authorizationUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', SCOPES);
    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('include_granted_scopes', 'true');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: authorizationUrl.toString(), expiresAt: new Date(expiresAtMillis).toISOString(), state };
  }

  async function consumeState(state) {
    if (!validState(state)) fail('invalid-argument', 'Phiên kết nối Google Calendar không hợp lệ.');
    const stateHash = hashState(state);
    const stateRef = database.doc(`_calendarOAuthStates/${stateHash}`);
    let savedState;
    await database.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef);
      if (!snapshot.exists) fail('failed-precondition', 'Phiên kết nối Google Calendar không hợp lệ hoặc đã hết hạn.');
      const data = snapshot.data();
      const expiresAtMillis = typeof data.expiresAt?.toMillis === 'function'
        ? data.expiresAt.toMillis()
        : Number(data.expiresAt);
      if (data.stateHash !== stateHash || !data.uid || !data.codeVerifier || expiresAtMillis <= now()) {
        transaction.delete(stateRef);
        return;
      }
      transaction.delete(stateRef);
      savedState = data;
    });
    if (!savedState) fail('failed-precondition', 'Phiên kết nối Google Calendar không hợp lệ hoặc đã hết hạn.');
    return savedState;
  }

  async function fetchJson(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GOOGLE_TOKEN_TIMEOUT_MILLIS);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error('Google OAuth request failed.');
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Google OAuth request timed out.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function exchangeCode(code, codeVerifier, oauthConfig) {
    const parameters = new URLSearchParams({
      code,
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      redirect_uri: oauthConfig.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });
    return fetchJson(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: parameters.toString(),
    });
  }

  async function complete({ state, code, error }) {
    let savedState;
    try {
      savedState = await consumeState(state);
      if (error) return { status: 'denied' };
      if (typeof code !== 'string' || code.length === 0 || code.length > 4096) {
        return { status: 'error' };
      }

      const oauthConfig = config(true);
      const tokens = await exchangeCode(code, savedState.codeVerifier, oauthConfig);
      if (typeof tokens.access_token !== 'string' || !tokens.access_token) return { status: 'error' };

      let profile = {};
      try {
        profile = await fetchJson(USERINFO_ENDPOINT, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
      } catch {
        // Calendar access can still work if Google's optional email lookup fails.
      }

      const connectionRef = database.doc(`_googleCalendarConnections/${savedState.uid}`);
      const statusRef = database.doc(`users/${savedState.uid}/integrationStatus/googleCalendar`);
      await database.runTransaction(async (transaction) => {
        const previous = await transaction.get(connectionRef);
        const access = await transaction.get(database.doc(`_accountAccess/${savedState.uid}`));
        if (access.exists && access.data().status !== 'active') fail('permission-denied', 'Tài khoản không còn hoạt động.');
        const oldConnection = previous.exists ? previous.data() : {};
        const refreshToken = tokens.refresh_token || oldConnection.refreshToken;
        if (!refreshToken) fail('failed-precondition', 'Google chưa cấp refresh token. Hãy thử cấp quyền lại.');

        const providerEmail = typeof profile.email === 'string' ? profile.email : oldConnection.providerEmail || null;
        const connectedAt = serverTimestamp();
        transaction.set(connectionRef, {
          provider: 'GOOGLE',
          connectionId: randomBytes(16).toString('hex'),
          providerAccountId: typeof profile.id === 'string' ? profile.id : oldConnection.providerAccountId || null,
          providerEmail,
          accessToken: tokens.access_token,
          refreshToken,
          scope: typeof tokens.scope === 'string' ? tokens.scope : oldConnection.scope || SCOPES,
          expiresAtMillis: Number.isFinite(Number(tokens.expires_in))
            ? now() + Number(tokens.expires_in) * 1000
            : null,
          connectedAt,
          updatedAt: serverTimestamp(),
        });
        transaction.set(statusRef, {
          provider: 'GOOGLE',
          connected: true,
          providerEmail,
          scope: typeof tokens.scope === 'string' ? tokens.scope : oldConnection.scope || SCOPES,
          connectedAt,
          updatedAt: serverTimestamp(),
        });
      });

      return { status: 'connected' };
    } catch {
      return { status: 'error' };
    }
  }

  return { start, complete };
}

module.exports = { SCOPES, STATE_TTL_MILLIS, createCalendarOAuthService };
