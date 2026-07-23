var DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function getConfig() {
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: String(
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      'http://localhost:3000/api/calendar/google/callback'
    ).trim(),
    scopes: String(process.env.GOOGLE_CALENDAR_SCOPES || DEFAULT_SCOPES).trim(),
    prompt: String(process.env.GOOGLE_OAUTH_PROMPT || 'consent').trim(),
    authUrl: String(process.env.GOOGLE_OAUTH_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth').trim(),
    tokenUrl: String(process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token').trim(),
    userInfoUrl: String(process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v2/userinfo').trim(),
    eventsUrl: String(process.env.GOOGLE_CALENDAR_EVENTS_URL || 'https://www.googleapis.com/calendar/v3/calendars/primary/events').trim(),
    timeoutMs: Number(process.env.GOOGLE_CALENDAR_TIMEOUT_MS || 10000),
  };
}

function requireGoogleConfig() {
  var config = getConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    var error = new Error('Chưa cấu hình Google Calendar OAuth cho Nodejs service.');
    error.status = 503;
    error.code = 'GOOGLE_CALENDAR_NOT_CONFIGURED';
    throw error;
  }
  return config;
}

function buildAuthorizationUrl(state) {
  var config = requireGoogleConfig();
  var url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  if (config.prompt) url.searchParams.set('prompt', config.prompt);
  return url.toString();
}

async function fetchJson(url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function() {
    controller.abort();
  }, timeoutMs);

  try {
    var response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    var text = await response.text();
    var body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      var message = body.error_description || body.error || 'Google API request failed.';
      var error = new Error(message);
      error.status = response.status >= 500 ? 502 : response.status;
      error.code = 'GOOGLE_API_ERROR';
      error.googleStatus = response.status;
      throw error;
    }

    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      var timeout = new Error('Google API phản hồi quá lâu.');
      timeout.status = 504;
      timeout.code = 'GOOGLE_API_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function exchangeCodeForTokens(code) {
  var config = requireGoogleConfig();
  var params = new URLSearchParams();
  params.set('code', code);
  params.set('client_id', config.clientId);
  params.set('client_secret', config.clientSecret);
  params.set('redirect_uri', config.redirectUri);
  params.set('grant_type', 'authorization_code');

  return fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  }, config.timeoutMs);
}

async function refreshAccessToken(refreshToken) {
  var config = requireGoogleConfig();
  var params = new URLSearchParams();
  params.set('client_id', config.clientId);
  params.set('client_secret', config.clientSecret);
  params.set('refresh_token', refreshToken);
  params.set('grant_type', 'refresh_token');

  return fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  }, config.timeoutMs);
}

async function getGoogleProfile(accessToken) {
  var config = requireGoogleConfig();
  return fetchJson(config.userInfoUrl, {
    headers: { Authorization: 'Bearer ' + accessToken },
  }, config.timeoutMs);
}

async function fetchTodayEvents(accessToken, range, limit) {
  var config = requireGoogleConfig();
  var url = new URL(config.eventsUrl);
  url.searchParams.set('timeMin', range.timeMin);
  url.searchParams.set('timeMax', range.timeMax);
  url.searchParams.set('timeZone', range.timeZone);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', String(limit || 20));
  url.searchParams.set('showDeleted', 'false');

  return fetchJson(url, {
    headers: { Authorization: 'Bearer ' + accessToken },
  }, config.timeoutMs);
}

module.exports = {
  DEFAULT_SCOPES: DEFAULT_SCOPES,
  buildAuthorizationUrl: buildAuthorizationUrl,
  exchangeCodeForTokens: exchangeCodeForTokens,
  refreshAccessToken: refreshAccessToken,
  getGoogleProfile: getGoogleProfile,
  fetchTodayEvents: fetchTodayEvents,
  getConfig: getConfig,
};
