import { getValidAccessToken, handleAuthExpired, refreshAccessToken } from './apiClient';

function normalizeApiBase(value) {
  const raw = String(value || '').trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, '');

  if (!withoutTrailingSlash) return '';
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

export const NODE_API_BASE_URL = normalizeApiBase(import.meta.env.VITE_NODE_API_BASE_URL);

function buildUrl(path, query) {
  if (!NODE_API_BASE_URL) {
    throw new Error('Chưa cấu hình VITE_NODE_API_BASE_URL cho Nodejs service.');
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${NODE_API_BASE_URL}${cleanPath}`;
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

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  return fallback;
}

export async function nodeApiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    headers = {},
    retryOnUnauthorized = true,
  } = options;

  const requestHeaders = { ...headers };
  if (body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = auth ? await getValidAccessToken() : null;
  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return nodeApiRequest(path, {
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
