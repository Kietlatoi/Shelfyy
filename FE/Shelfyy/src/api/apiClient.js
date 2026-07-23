import { clearAuth, getAccessToken, getRefreshToken, saveAuth } from './tokenStore';

const DEFAULT_API_BASE = '/api';
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;

let refreshPromise = null;

function normalizeApiBase(value) {
  const raw = String(value || DEFAULT_API_BASE).trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, '');

  if (!withoutTrailingSlash) return DEFAULT_API_BASE;
  if (!/^https?:\/\//i.test(withoutTrailingSlash)) return withoutTrailingSlash;

  try {
    const url = new URL(withoutTrailingSlash);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/api';
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    return withoutTrailingSlash;
  }

  return withoutTrailingSlash;
}

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);

function buildUrl(path, query) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error) return data.error;
  if (data.errors && typeof data.errors === 'object') {
    return Object.values(data.errors).filter(Boolean).join('\n') || fallback;
  }
  return fallback;
}

function decodeJwtPayload(token) {
  if (!token) return null;

  const [, payload] = String(token).split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
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
  if (window.location.hash !== '#/' && window.location.hash !== '') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new Event('hashchange'));
  }
}

async function performRefreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    handleAuthExpired();
    return null;
  }

  const data = await parseResponse(response);
  if (!data?.accessToken || !data?.refreshToken) {
    handleAuthExpired();
    return null;
  }

  saveAuth(data);
  return data.accessToken;
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
  const token = getAccessToken();
  if (!token) {
    return getRefreshToken() ? refreshAccessToken() : null;
  }

  if (shouldRefreshAccessToken(token)) {
    return refreshAccessToken();
  }

  return token;
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
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
    handleAuthExpired();
  }

  const data = await parseResponse(response);

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
