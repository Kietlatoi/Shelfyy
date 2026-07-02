const ACCESS_TOKEN_KEY = 'shelfy_access_token';
const REFRESH_TOKEN_KEY = 'shelfy_refresh_token';
const USER_KEY = 'shelfy_user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth(authResponse) {
  if (!authResponse) return;
  if (authResponse.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken);
  }
  if (authResponse.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
  }
  if (authResponse.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
  }
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
