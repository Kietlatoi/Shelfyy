import { serviceAccountAccessToken } from './firestore-rest.js';

const RESEND_API = 'https://api.resend.com/emails';
const DEFAULT_CODE_TTL_SECONDS = 600;
const DEFAULT_RESEND_SECONDS = 60;
const DEFAULT_MAX_ATTEMPTS = 5;

export class RegistrationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function required(env, name) {
  const value = env[name];
  if (!value || String(value).startsWith('your-')) {
    throw new RegistrationError(503, 'SERVER_NOT_CONFIGURED', `Worker chưa được cấu hình biến ${name}.`);
  }
  return String(value);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RegistrationError(400, 'INVALID_EMAIL', 'Vui lòng nhập địa chỉ email hợp lệ.');
  }
  return email;
}

function normalizeName(value) {
  const fullName = String(value || '').trim().replace(/\s+/g, ' ');
  if (fullName.length < 2 || fullName.length > 100) {
    throw new RegistrationError(400, 'INVALID_FULL_NAME', 'Họ và tên phải có từ 2 đến 100 ký tự.');
  }
  return fullName;
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 6 || password.length > 128) {
    throw new RegistrationError(400, 'INVALID_PASSWORD', 'Mật khẩu phải có từ 6 đến 128 ký tự.');
  }
  return password;
}

function validateCode(value) {
  const code = String(value || '').trim();
  if (!/^\d{5}$/.test(code)) {
    throw new RegistrationError(400, 'INVALID_CODE', 'Mã xác thực phải gồm đúng 5 chữ số.');
  }
  return code;
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function randomFiveDigitCode() {
  const values = new Uint32Array(1);
  const maximum = Math.floor(0x100000000 / 100000) * 100000;
  do crypto.getRandomValues(values); while (values[0] >= maximum);
  return String(values[0] % 100000).padStart(5, '0');
}

async function incrementLimit(kv, key, limit, ttl, message) {
  const used = Number(await kv.get(key) || 0);
  if (used >= limit) throw new RegistrationError(429, 'RATE_LIMITED', message);
  await kv.put(key, String(used + 1), { expirationTtl: ttl });
}

async function sendVerificationEmail(env, email, code, fetchImpl, purpose = 'registration') {
  const isPasswordReset = purpose === 'password-reset';
  const title = isPasswordReset ? 'Đặt lại mật khẩu Shelfy' : 'Xác thực email Shelfy';
  const action = isPasswordReset ? 'đặt lại mật khẩu' : 'xác thực email';
  const response = await fetchImpl(RESEND_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${required(env, 'RESEND_API_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: required(env, 'EMAIL_FROM'),
      to: [email],
      subject: `${code} là mã ${action} Shelfy của bạn`,
      text: `Mã ${action} Shelfy của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
      html: `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#172033"><h2>${title}</h2><p>Mã ${action} của bạn là:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#625ff5">${code}</p><p>Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p><p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p></body></html>`,
    }),
  });
  if (!response.ok) {
    const providerError = await response.json().catch(() => null);
    console.error('Resend rejected email', {
      status: response.status,
      name: providerError?.name,
      message: providerError?.message,
    });
    throw new RegistrationError(502, 'EMAIL_SEND_FAILED', 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
  }
}

export async function requestRegistrationCode(env, request, body, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl || fetch;
  if (!env.RATE_LIMITS) {
    throw new RegistrationError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const email = normalizeEmail(body?.email);
  const pepper = required(env, 'EMAIL_OTP_PEPPER');
  const emailHash = await hmacHex(pepper, email);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = await hmacHex(pepper, ip);
  const resendSeconds = positiveInteger(env.EMAIL_CODE_RESEND_SECONDS, DEFAULT_RESEND_SECONDS);
  const cooldownKey = `registration:cooldown:${emailHash}`;
  if (await env.RATE_LIMITS.get(cooldownKey)) {
    throw new RegistrationError(429, 'RESEND_TOO_SOON', `Vui lòng đợi ${resendSeconds} giây trước khi gửi lại mã.`);
  }
  await incrementLimit(env.RATE_LIMITS, `registration:email-rate:${emailHash}`, 5, 3600, 'Email này đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.');
  await incrementLimit(env.RATE_LIMITS, `registration:ip-rate:${ipHash}`, 20, 3600, 'Thiết bị này đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.');

  const code = randomFiveDigitCode();
  const challengeId = crypto.randomUUID();
  const ttl = positiveInteger(env.EMAIL_CODE_TTL_SECONDS, DEFAULT_CODE_TTL_SECONDS);
  const challenge = {
    emailHash,
    codeHash: await hmacHex(pepper, `${challengeId}:${email}:${code}`),
    attempts: 0,
    expiresAt: Date.now() + ttl * 1000,
  };
  await env.RATE_LIMITS.put(`registration:challenge:${challengeId}`, JSON.stringify(challenge), { expirationTtl: ttl });
  try {
    await sendVerificationEmail(env, email, code, fetchImpl);
  } catch (error) {
    await env.RATE_LIMITS.delete(`registration:challenge:${challengeId}`);
    throw error;
  }
  await env.RATE_LIMITS.put(cooldownKey, '1', { expirationTtl: resendSeconds });
  return { challengeId, expiresInSeconds: ttl, resendAfterSeconds: resendSeconds };
}

async function findFirebaseUserByEmail(env, email, dependencies) {
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const fetchImpl = dependencies.fetchImpl || fetch;
  const getAccessToken = dependencies.getAccessToken || serviceAccountAccessToken;
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await getAccessToken(env)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: [email] }),
    },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RegistrationError(502, 'FIREBASE_LOOKUP_FAILED', 'Không thể xử lý yêu cầu đặt lại mật khẩu.');
  }
  return (result?.users || []).find((user) => (
    String(user.email || '').trim().toLowerCase() === email && !user.disabled
  )) || null;
}

export async function requestPasswordResetCode(env, request, body, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl || fetch;
  if (!env.RATE_LIMITS) {
    throw new RegistrationError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const email = normalizeEmail(body?.email);
  const pepper = required(env, 'EMAIL_OTP_PEPPER');
  const emailHash = await hmacHex(pepper, email);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = await hmacHex(pepper, ip);
  const resendSeconds = positiveInteger(env.EMAIL_CODE_RESEND_SECONDS, DEFAULT_RESEND_SECONDS);
  const cooldownKey = `password-reset:cooldown:${emailHash}`;
  if (await env.RATE_LIMITS.get(cooldownKey)) {
    throw new RegistrationError(429, 'RESEND_TOO_SOON', `Vui lòng đợi ${resendSeconds} giây trước khi gửi lại mã.`);
  }
  await incrementLimit(env.RATE_LIMITS, `password-reset:email-rate:${emailHash}`, 5, 3600, 'Email này đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.');
  await incrementLimit(env.RATE_LIMITS, `password-reset:ip-rate:${ipHash}`, 20, 3600, 'Thiết bị này đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.');

  const account = await findFirebaseUserByEmail(env, email, dependencies);
  const code = randomFiveDigitCode();
  const challengeId = crypto.randomUUID();
  const ttl = positiveInteger(env.EMAIL_CODE_TTL_SECONDS, DEFAULT_CODE_TTL_SECONDS);
  const challenge = {
    emailHash,
    codeHash: await hmacHex(pepper, `${challengeId}:${email}:${code}`),
    accountUid: account?.localId || null,
    attempts: 0,
    expiresAt: Date.now() + ttl * 1000,
  };
  await env.RATE_LIMITS.put(`password-reset:challenge:${challengeId}`, JSON.stringify(challenge), { expirationTtl: ttl });
  if (account) {
    try {
      await sendVerificationEmail(env, email, code, fetchImpl, 'password-reset');
    } catch (error) {
      await env.RATE_LIMITS.delete(`password-reset:challenge:${challengeId}`);
      throw error;
    }
  }
  await env.RATE_LIMITS.put(cooldownKey, '1', { expirationTtl: resendSeconds });
  return {
    challengeId,
    expiresInSeconds: ttl,
    resendAfterSeconds: resendSeconds,
    message: 'Nếu email đã đăng ký, Shelfy sẽ gửi mã xác thực tới hộp thư của bạn.',
  };
}

async function updateFirebasePassword(env, accountUid, password, dependencies) {
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const apiKey = required(env, 'FIREBASE_API_KEY');
  const fetchImpl = dependencies.fetchImpl || fetch;
  const getAccessToken = dependencies.getAccessToken || serviceAccountAccessToken;
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await getAccessToken(env)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        localId: accountUid,
        password,
        validSince: String(Math.floor(Date.now() / 1000)),
        targetProjectId: projectId,
      }),
    },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.localId !== accountUid) {
    throw new RegistrationError(502, 'FIREBASE_PASSWORD_UPDATE_FAILED', 'Không thể cập nhật mật khẩu. Vui lòng thử lại sau.');
  }
}

export async function completePasswordReset(env, body, dependencies = {}) {
  if (!env.RATE_LIMITS) {
    throw new RegistrationError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const challengeId = String(body?.challengeId || '');
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    throw new RegistrationError(400, 'INVALID_CHALLENGE', 'Yêu cầu xác thực không hợp lệ.');
  }
  const email = normalizeEmail(body?.email);
  const code = validateCode(body?.code);
  const password = validatePassword(body?.newPassword);
  const key = `password-reset:challenge:${challengeId}`;
  const challenge = await env.RATE_LIMITS.get(key, 'json');
  if (!challenge || Number(challenge.expiresAt) <= Date.now()) {
    throw new RegistrationError(410, 'CODE_EXPIRED', 'Mã xác thực đã hết hạn. Vui lòng gửi mã mới.');
  }
  const maxAttempts = positiveInteger(env.EMAIL_CODE_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  if (Number(challenge.attempts) >= maxAttempts) {
    await env.RATE_LIMITS.delete(key);
    throw new RegistrationError(429, 'TOO_MANY_CODE_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần. Vui lòng gửi mã mới.');
  }
  const pepper = required(env, 'EMAIL_OTP_PEPPER');
  const emailHash = await hmacHex(pepper, email);
  const codeHash = await hmacHex(pepper, `${challengeId}:${email}:${code}`);
  challenge.attempts = Number(challenge.attempts || 0) + 1;
  const remainingTtl = Math.max(60, Math.ceil((Number(challenge.expiresAt) - Date.now()) / 1000));
  await env.RATE_LIMITS.put(key, JSON.stringify(challenge), { expirationTtl: remainingTtl });
  const valid = challenge.accountUid
    && constantTimeEqual(challenge.emailHash, emailHash)
    && constantTimeEqual(challenge.codeHash, codeHash);
  if (!valid) {
    throw new RegistrationError(400, 'INCORRECT_CODE', 'Mã xác thực không đúng. Vui lòng kiểm tra lại.');
  }
  await updateFirebasePassword(env, challenge.accountUid, password, dependencies);
  await env.RATE_LIMITS.delete(key);
  return { updated: true };
}

async function createVerifiedFirebaseUser(env, { email, password, fullName }, dependencies) {
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const apiKey = required(env, 'FIREBASE_API_KEY');
  const fetchImpl = dependencies.fetchImpl || fetch;
  const getAccessToken = dependencies.getAccessToken || serviceAccountAccessToken;
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await getAccessToken(env)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, password, displayName: fullName, emailVerified: true }),
    },
  );
  const result = await response.json().catch(() => null);
  if (response.ok && result?.localId) return { uid: result.localId };
  const providerCode = result?.error?.message;
  if (providerCode === 'EMAIL_EXISTS') {
    throw new RegistrationError(409, 'EMAIL_EXISTS', 'Email này đã được sử dụng. Vui lòng đăng nhập.');
  }
  if (providerCode === 'WEAK_PASSWORD') {
    throw new RegistrationError(400, 'WEAK_PASSWORD', 'Mật khẩu chưa đáp ứng yêu cầu của Firebase.');
  }
  throw new RegistrationError(502, 'FIREBASE_CREATE_FAILED', 'Không thể tạo tài khoản. Vui lòng thử lại sau.');
}

export async function completeRegistration(env, body, dependencies = {}) {
  if (!env.RATE_LIMITS) {
    throw new RegistrationError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const challengeId = String(body?.challengeId || '');
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    throw new RegistrationError(400, 'INVALID_CHALLENGE', 'Yêu cầu xác thực không hợp lệ.');
  }
  const email = normalizeEmail(body?.email);
  const code = validateCode(body?.code);
  const fullName = normalizeName(body?.fullName);
  const password = validatePassword(body?.password);
  const key = `registration:challenge:${challengeId}`;
  const challenge = await env.RATE_LIMITS.get(key, 'json');
  if (!challenge || Number(challenge.expiresAt) <= Date.now()) {
    throw new RegistrationError(410, 'CODE_EXPIRED', 'Mã xác thực đã hết hạn. Vui lòng gửi mã mới.');
  }
  const maxAttempts = positiveInteger(env.EMAIL_CODE_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  if (Number(challenge.attempts) >= maxAttempts) {
    await env.RATE_LIMITS.delete(key);
    throw new RegistrationError(429, 'TOO_MANY_CODE_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần. Vui lòng gửi mã mới.');
  }
  const pepper = required(env, 'EMAIL_OTP_PEPPER');
  const emailHash = await hmacHex(pepper, email);
  const codeHash = await hmacHex(pepper, `${challengeId}:${email}:${code}`);
  challenge.attempts = Number(challenge.attempts || 0) + 1;
  const remainingTtl = Math.max(60, Math.ceil((Number(challenge.expiresAt) - Date.now()) / 1000));
  await env.RATE_LIMITS.put(key, JSON.stringify(challenge), { expirationTtl: remainingTtl });
  if (!constantTimeEqual(challenge.emailHash, emailHash) || !constantTimeEqual(challenge.codeHash, codeHash)) {
    throw new RegistrationError(400, 'INCORRECT_CODE', 'Mã xác thực không đúng. Vui lòng kiểm tra lại.');
  }
  const account = await createVerifiedFirebaseUser(env, { email, password, fullName }, dependencies);
  await env.RATE_LIMITS.delete(key);
  return { created: true, uid: account.uid };
}
