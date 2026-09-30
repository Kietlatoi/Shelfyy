const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedAccessToken = null;

function required(env, name) {
  const value = env[name];
  if (!value || String(value).startsWith('your-')) {
    throw new Error(`Missing Worker secret ${name}`);
  }
  return String(value);
}

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemBytes(pem) {
  const normalized = pem.replace(/\\n/g, '\n');
  const encoded = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function serviceAccountAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken?.projectId === env.FIREBASE_PROJECT_ID
    && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.value;
  }

  const clientEmail = required(env, 'FIREBASE_CLIENT_EMAIL');
  const privateKey = required(env, 'FIREBASE_PRIVATE_KEY');
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: FIRESTORE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claims}`;
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`Unable to authenticate Firestore service account (${response.status})`);
  }
  cachedAccessToken = {
    projectId: env.FIREBASE_PROJECT_ID,
    value: result.access_token,
    expiresAt: now + Number(result.expires_in || 3600),
  };
  return cachedAccessToken.value;
}

function projectName(env) {
  return `projects/${required(env, 'FIREBASE_PROJECT_ID')}/databases/(default)`;
}

function encodePath(path = '') {
  return String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

export function documentName(env, path) {
  return `${projectName(env)}/documents/${String(path).replace(/^\/+|\/+$/g, '')}`;
}

function apiUrl(env, suffix) {
  return `https://firestore.googleapis.com/v1/${projectName(env)}/${suffix}`;
}

async function firestoreFetch(env, suffix, options = {}) {
  const response = await fetch(apiUrl(env, suffix), {
    ...options,
    headers: {
      authorization: `Bearer ${await serviceAccountAccessToken(env)}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (response.status === 404 && options.allowMissing) return null;
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error?.message || `Firestore request failed (${response.status})`);
    error.status = response.status;
    error.firestoreCode = result?.error?.status;
    throw error;
  }
  return result;
}

export function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Firestore does not support non-finite numbers');
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };
  throw new Error(`Unsupported Firestore value: ${typeof value}`);
}

export function encodeFields(data) {
  return Object.fromEntries(Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, encodeValue(value)]));
}

export function decodeValue(value) {
  if (!value || 'nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

export function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodedDocument(document) {
  if (!document) return null;
  return {
    name: document.name,
    id: document.name.split('/').pop(),
    data: decodeFields(document.fields || {}),
    createTime: document.createTime,
    updateTime: document.updateTime,
  };
}

export async function getDocument(env, path, { transaction } = {}) {
  const query = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
  const result = await firestoreFetch(env, `documents/${encodePath(path)}${query}`, {
    method: 'GET',
    allowMissing: true,
  });
  return decodedDocument(result);
}

export function setWrite(env, path, data, precondition = {}) {
  const write = {
    update: {
      name: documentName(env, path),
      fields: encodeFields(data),
    },
  };
  if (precondition.updateTime) write.currentDocument = { updateTime: precondition.updateTime };
  else if (typeof precondition.exists === 'boolean') write.currentDocument = { exists: precondition.exists };
  return write;
}

export function deleteWrite(env, path, precondition = {}) {
  const write = { delete: documentName(env, path) };
  if (precondition.updateTime) write.currentDocument = { updateTime: precondition.updateTime };
  else if (typeof precondition.exists === 'boolean') write.currentDocument = { exists: precondition.exists };
  return write;
}

export async function commitWrites(env, writes, transaction) {
  return firestoreFetch(env, 'documents:commit', {
    method: 'POST',
    body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }),
  });
}

export async function beginTransaction(env) {
  const result = await firestoreFetch(env, 'documents:beginTransaction', {
    method: 'POST',
    body: JSON.stringify({ options: { readWrite: {} } }),
  });
  return result.transaction;
}

export async function rollbackTransaction(env, transaction) {
  if (!transaction) return;
  await firestoreFetch(env, 'documents:rollback', {
    method: 'POST',
    body: JSON.stringify({ transaction }),
  }).catch(() => {});
}

export async function batchGetDocuments(env, paths, transaction) {
  const result = await firestoreFetch(env, 'documents:batchGet', {
    method: 'POST',
    body: JSON.stringify({
      documents: paths.map((path) => documentName(env, path)),
      ...(transaction ? { transaction } : {}),
    }),
  });
  const byName = new Map();
  for (const entry of result || []) {
    if (entry.found) byName.set(entry.found.name, decodedDocument(entry.found));
    if (entry.missing) byName.set(entry.missing, null);
  }
  return paths.map((path) => byName.get(documentName(env, path)) ?? null);
}

export async function runQuery(env, structuredQuery, parentPath = '') {
  const parent = encodePath(parentPath);
  const suffix = parent ? `documents/${parent}:runQuery` : 'documents:runQuery';
  const result = await firestoreFetch(env, suffix, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  });
  return (result || []).filter((entry) => entry.document).map((entry) => decodedDocument(entry.document));
}

export async function countCollection(env, collectionId, parentPath = '') {
  const parent = encodePath(parentPath);
  const suffix = parent ? `documents/${parent}:runAggregationQuery` : 'documents:runAggregationQuery';
  const result = await firestoreFetch(env, suffix, {
    method: 'POST',
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId }] },
        aggregations: [{ alias: 'total', count: {} }],
      },
    }),
  });
  const value = result?.[0]?.result?.aggregateFields?.total;
  return Number(decodeValue(value) || 0);
}

export const query = {
  fieldFilter(fieldPath, op, value) {
    return { fieldFilter: { field: { fieldPath }, op, value: encodeValue(value) } };
  },
  and(...filters) {
    return { compositeFilter: { op: 'AND', filters } };
  },
};
