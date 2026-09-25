import { CORE_API_URL } from './config';
import { clearAuth, getAccessToken, getRefreshToken, saveAuth } from './tokenStore';
import { router } from 'expo-router';

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;
let refreshPromise = null;

function buildUrl(path, query) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${CORE_API_URL}${cleanPath}`;
  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function safeAtob(input) {
  if (typeof atob === 'function') {
    return atob(input);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(safeAtob(padded));
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

export function handleAuthExpired() {
  clearAuth();
  try {
    router.replace('/(auth)/login');
  } catch {
    // router may not be ready yet
  }
}

async function performRefreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      handleAuthExpired();
      return null;
    }

    const data = await response.json();
    if (!data?.accessToken || !data?.refreshToken) {
      handleAuthExpired();
      return null;
    }

    await saveAuth(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function getValidAccessToken() {
  const token = await getAccessToken();
  if (!token) {
    const hasRefresh = await getRefreshToken();
    return hasRefresh ? refreshAccessToken() : null;
  }
  if (shouldRefreshAccessToken(token)) {
    return refreshAccessToken();
  }
  return token;
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error) return typeof data.error === 'string' ? data.error : data.error.message;
  if (data.errors && typeof data.errors === 'object') {
    return Object.values(data.errors).filter(Boolean).join('\n') || fallback;
  }
  return fallback;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    headers = {},
    retryOnUnauthorized = true,
  } = options;

  const isFormData = body instanceof FormData;
  const requestHeaders = { ...headers };

  if (!isFormData && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = auth ? await getValidAccessToken() : null;
  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
        ? body
        : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest(path, { ...options, retryOnUnauthorized: false });
    }
    handleAuthExpired();
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `HTTP ${response.status}`));
  }

  return data;
}

export function pageContent(pageResponse) {
  if (!pageResponse) return [];
  if (Array.isArray(pageResponse)) return pageResponse;
  return pageResponse.content || pageResponse.items || [];
}
