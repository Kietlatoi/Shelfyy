import {
  anonymizeBilling,
  cancelPayment,
  createCheckout,
  getBillingPlans,
  getEffectiveEntitlement,
  getMyPlan,
  getPayment,
  handlePayOsWebhook,
  paymentRedirect,
  quotaDescriptor,
  reconcilePendingPayments,
} from './billing.js';
import { createWardrobeItem } from './wardrobe.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const TRY_ON_CATEGORIES = new Set(['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR']);
const REPLICATE_API = 'https://api.replicate.com/v1';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders },
  });
}

function corsFor(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
    throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Nguồn gọi API không được phép.');
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    vary: 'Origin',
  };
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(415, 'JSON_REQUIRED', 'Yêu cầu phải dùng application/json.');
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Nội dung JSON không hợp lệ.');
  }
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value || String(value).startsWith('your-')) {
    throw new ApiError(503, 'SERVER_NOT_CONFIGURED', `Worker chưa được cấu hình biến ${name}.`);
  }
  return String(value);
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function authenticate(request, env) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
  }
  const idToken = authorization.slice(7).trim();
  const apiKey = requiredEnv(env, 'FIREBASE_API_KEY');
  const projectId = requiredEnv(env, 'FIREBASE_PROJECT_ID');
  const tokenPayload = decodeJwtPayload(idToken);
  const now = Math.floor(Date.now() / 1000);
  if (!tokenPayload
    || tokenPayload.aud !== projectId
    || tokenPayload.iss !== `https://securetoken.google.com/${projectId}`
    || !tokenPayload.sub
    || Number(tokenPayload.exp) <= now) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ idToken }),
    },
  );
  const result = await response.json();
  const user = result.users?.[0];
  if (!response.ok || !user || user.localId !== tokenPayload.sub || user.disabled) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa.');
  }
  return { uid: user.localId, email: user.email || '' };
}

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function cloudinarySignature(params, secret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return sha1Hex(`${serialized}${secret}`);
}

function cloudinaryUrlPrefix(env) {
  return `https://res.cloudinary.com/${requiredEnv(env, 'CLOUDINARY_CLOUD_NAME')}/image/upload/`;
}

function assertCloudinaryImage(env, uid, image, folder) {
  if (!image || typeof image.secureUrl !== 'string' || typeof image.publicId !== 'string') {
    throw new ApiError(400, 'INVALID_IMAGE', 'Thông tin ảnh không hợp lệ.');
  }
  if (!image.secureUrl.startsWith(cloudinaryUrlPrefix(env))
    || !image.publicId.startsWith(`${uid}/${folder}/`)
    || !image.secureUrl.includes(image.publicId)) {
    throw new ApiError(400, 'INVALID_IMAGE_OWNER', 'Ảnh không thuộc tài khoản hiện tại.');
  }
}

function assertSafeId(value, fieldName) {
  const normalized = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) {
    throw new ApiError(400, 'INVALID_ID', `${fieldName} không hợp lệ.`);
  }
  return normalized;
}

async function createUploadSignature(env, uid, body) {
  const folders = {
    wardrobe: 'wardrobe',
    avatar: 'avatars',
    tryOnInput: 'tryon-input',
  };
  const folderName = folders[body?.intent];
  if (!folderName) throw new ApiError(400, 'INVALID_UPLOAD_INTENT', 'Mục đích tải ảnh không hợp lệ.');
  if (!env.RATE_LIMITS) {
    throw new ApiError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const date = new Date().toISOString().slice(0, 10);
  const quotaKey = `upload-quota:${uid}:${date}`;
  const used = Number(await env.RATE_LIMITS.get(quotaKey) || 0);
  if (used >= 100) throw new ApiError(429, 'DAILY_UPLOAD_LIMIT', 'Bạn đã dùng hết 100 lượt tải ảnh hôm nay.');

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${uid}/${folderName}`;
  const publicId = crypto.randomUUID();
  const overwrite = false;
  const params = { folder, overwrite, public_id: publicId, timestamp };
  const signature = await cloudinarySignature(params, requiredEnv(env, 'CLOUDINARY_API_SECRET'));
  await env.RATE_LIMITS.put(quotaKey, String(used + 1), { expirationTtl: 172800 });
  return {
    apiKey: requiredEnv(env, 'CLOUDINARY_API_KEY'),
    cloudName: requiredEnv(env, 'CLOUDINARY_CLOUD_NAME'),
    folder,
    public_id: publicId,
    timestamp,
    overwrite,
    signature,
  };
}

function replicateCategory(category) {
  if (category === 'BOTTOM') return 'lower_body';
  if (category === 'DRESS') return 'dresses';
  return 'upper_body';
}

async function replicateRequest(env, path, options = {}) {
  const response = await fetch(`${REPLICATE_API}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${requiredEnv(env, 'REPLICATE_API_TOKEN')}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) {
    const message = typeof result?.detail === 'string' ? result.detail : 'Replicate từ chối yêu cầu.';
    throw new ApiError(response.status >= 500 ? 502 : 400, 'REPLICATE_ERROR', message);
  }
  return result;
}

function publicPrediction(prediction) {
  const statusMap = {
    starting: 'PENDING',
    processing: 'PROCESSING',
    succeeded: 'DONE',
    failed: 'FAILED',
    canceled: 'FAILED',
  };
  return {
    jobId: prediction.id,
    id: prediction.id,
    status: statusMap[prediction.status] || 'PROCESSING',
    processingTimeMs: prediction.metrics?.predict_time
      ? Math.round(Number(prediction.metrics.predict_time) * 1000)
      : null,
    errorCode: prediction.status === 'canceled' ? 'CANCELED' : null,
    errorMessage: prediction.error ? String(prediction.error).slice(0, 500) : null,
  };
}

function extractReplicateOutput(output) {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (typeof candidate !== 'string') {
    throw new ApiError(502, 'INVALID_REPLICATE_OUTPUT', 'Replicate không trả về ảnh kết quả.');
  }
  const url = new URL(candidate);
  const allowed = url.protocol === 'https:'
    && (url.hostname === 'replicate.delivery' || url.hostname.endsWith('.replicate.delivery'));
  if (!allowed) throw new ApiError(502, 'INVALID_REPLICATE_OUTPUT', 'Địa chỉ ảnh kết quả không hợp lệ.');
  return url.toString();
}

async function uploadTryOnResult(env, uid, predictionId, resultUrl) {
  const publicId = `${uid}/tryon-results/${predictionId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { overwrite: true, public_id: publicId, timestamp };
  const form = new FormData();
  form.append('file', resultUrl);
  form.append('api_key', requiredEnv(env, 'CLOUDINARY_API_KEY'));
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('overwrite', 'true');
  form.append('signature', await cloudinarySignature(params, requiredEnv(env, 'CLOUDINARY_API_SECRET')));
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${requiredEnv(env, 'CLOUDINARY_CLOUD_NAME')}/image/upload`,
    { method: 'POST', body: form },
  );
  const result = await response.json();
  if (!response.ok) throw new ApiError(502, 'CLOUDINARY_RESULT_UPLOAD_FAILED', 'Không thể lưu ảnh kết quả.');
  if (result.public_id !== publicId
    || result.type !== 'upload'
    || !result.secure_url?.startsWith(cloudinaryUrlPrefix(env))) {
    throw new ApiError(502, 'INVALID_CLOUDINARY_RESPONSE', 'Cloudinary trả về ảnh kết quả không hợp lệ.');
  }
  return { secureUrl: result.secure_url, publicId };
}

async function deleteCloudinaryImage(env, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: true, public_id: publicId, timestamp, type: 'upload' };
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));
  form.append('api_key', requiredEnv(env, 'CLOUDINARY_API_KEY'));
  form.append('signature', await cloudinarySignature(params, requiredEnv(env, 'CLOUDINARY_API_SECRET')));
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${requiredEnv(env, 'CLOUDINARY_CLOUD_NAME')}/image/destroy`,
    { method: 'POST', body: form },
  );
  if (!response.ok) throw new ApiError(502, 'CLOUDINARY_DELETE_FAILED', 'Không thể xóa ảnh trên Cloudinary.');
}

async function consumeTryOnQuota(env, uid, requestId) {
  if (!env.RATE_LIMITS) {
    throw new ApiError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  const requestKey = `request:${uid}:${requestId}`;
  const existingJobId = await env.RATE_LIMITS.get(requestKey);
  if (existingJobId) return { existingJobId, requestKey };

  const plan = await getEffectiveEntitlement(env, uid);
  const quota = quotaDescriptor(plan, uid);
  const quotaKey = quota.key;
  const used = Number(await env.RATE_LIMITS.get(quotaKey) || 0);
  if (used >= quota.limit) {
    const periodLabel = quota.period === 'MONTH' ? 'tháng này' : 'hôm nay';
    throw new ApiError(429, 'TRY_ON_LIMIT_REACHED', `Bạn đã dùng hết ${quota.limit} lượt thử đồ AI ${periodLabel}.`);
  }
  return { existingJobId: null, requestKey, quotaKey, used, quotaExpirationTtl: quota.expirationTtl };
}

async function rememberPrediction(env, quota, predictionId) {
  await Promise.all([
    env.RATE_LIMITS.put(quota.requestKey, predictionId, { expirationTtl: 86400 }),
    env.RATE_LIMITS.put(quota.quotaKey, String(quota.used + 1), { expirationTtl: quota.quotaExpirationTtl }),
    env.RATE_LIMITS.put(`prediction-owner:${predictionId}`, quota.uid, { expirationTtl: 31536000 }),
  ]);
}

async function predictionOwner(env, predictionId) {
  if (!env.RATE_LIMITS) {
    throw new ApiError(503, 'RATE_LIMIT_NOT_CONFIGURED', 'Worker chưa được gắn KV RATE_LIMITS.');
  }
  return env.RATE_LIMITS.get(`prediction-owner:${predictionId}`);
}

async function createPrediction(env, uid, body) {
  const requestId = assertSafeId(body?.requestId, 'requestId');
  const personImage = body?.personImage;
  const item = body?.clothingItem;
  assertCloudinaryImage(env, uid, personImage, 'tryon-input');
  assertCloudinaryImage(env, uid, item?.image, 'wardrobe');
  const category = String(item?.category || '').toUpperCase();
  if (!TRY_ON_CATEGORIES.has(category)) {
    throw new ApiError(400, 'UNSUPPORTED_CATEGORY', 'Try-on chỉ hỗ trợ áo, quần, váy và áo khoác.');
  }

  const quota = await consumeTryOnQuota(env, uid, requestId);
  if (quota.existingJobId) {
    if (await predictionOwner(env, quota.existingJobId) !== uid) {
      throw new ApiError(404, 'PREDICTION_NOT_FOUND', 'Không tìm thấy lượt thử đồ này.');
    }
    return publicPrediction(await replicateRequest(env, `/predictions/${quota.existingJobId}`));
  }

  const prediction = await replicateRequest(env, '/predictions', {
    method: 'POST',
    headers: { 'cancel-after': '5m' },
    body: JSON.stringify({
      version: requiredEnv(env, 'REPLICATE_MODEL_VERSION'),
      input: {
        garm_img: item.image.secureUrl,
        human_img: personImage.secureUrl,
        garment_des: String(item.name || 'clothing item').slice(0, 150),
        category: replicateCategory(category),
        crop: true,
        force_dc: category === 'DRESS',
        mask_only: false,
        steps: 30,
      },
    }),
  });
  assertSafeId(prediction.id, 'jobId');
  await rememberPrediction(env, { ...quota, uid }, prediction.id);
  return publicPrediction(prediction);
}

async function getPredictionStatus(env, uid, predictionId, body) {
  const jobId = assertSafeId(predictionId, 'jobId');
  if (await predictionOwner(env, jobId) !== uid) {
    throw new ApiError(404, 'PREDICTION_NOT_FOUND', 'Không tìm thấy lượt thử đồ này.');
  }
  const personPublicId = body?.personImagePublicId;
  if (personPublicId && !String(personPublicId).startsWith(`${uid}/tryon-input/`)) {
    throw new ApiError(400, 'INVALID_IMAGE_OWNER', 'Ảnh đầu vào không thuộc tài khoản hiện tại.');
  }
  const prediction = await replicateRequest(env, `/predictions/${jobId}`);
  const result = publicPrediction(prediction);
  if (prediction.status === 'succeeded') {
    const cacheKey = `prediction-result:${uid}:${jobId}`;
    const cached = await env.RATE_LIMITS.get(cacheKey, 'json');
    result.resultImage = cached || await uploadTryOnResult(env, uid, jobId, extractReplicateOutput(prediction.output));
    if (!cached) await env.RATE_LIMITS.put(cacheKey, JSON.stringify(result.resultImage), { expirationTtl: 31536000 });
    result.resultImageUrl = result.resultImage.secureUrl;
    if (personPublicId) await deleteCloudinaryImage(env, personPublicId).catch(() => {});
  } else if (['failed', 'canceled'].includes(prediction.status) && personPublicId) {
    await deleteCloudinaryImage(env, personPublicId).catch(() => {});
  }
  return result;
}

async function cancelPrediction(env, uid, predictionId, body) {
  const jobId = assertSafeId(predictionId, 'jobId');
  const personPublicId = body?.personImagePublicId;
  const resultPublicId = body?.resultPublicId;
  const owner = await predictionOwner(env, jobId);
  if (owner && owner !== uid) {
    throw new ApiError(404, 'PREDICTION_NOT_FOUND', 'Không tìm thấy lượt thử đồ này.');
  }
  if (owner === uid) {
    await replicateRequest(env, `/predictions/${jobId}/cancel`, { method: 'POST', body: '{}' }).catch(() => null);
  }
  const ownedIds = [personPublicId, resultPublicId].filter(Boolean);
  for (const publicId of ownedIds) {
    const owned = String(publicId).startsWith(`${uid}/tryon-input/`)
      || String(publicId).startsWith(`${uid}/tryon-results/`);
    if (!owned) throw new ApiError(400, 'INVALID_IMAGE_OWNER', 'Ảnh không thuộc tài khoản hiện tại.');
    await deleteCloudinaryImage(env, String(publicId)).catch(() => {});
  }
  return { jobId, deleted: true };
}

async function deleteOwnedMedia(env, uid, body) {
  const publicIds = [...new Set(Array.isArray(body?.publicIds) ? body.publicIds.map(String) : [])];
  if (publicIds.length === 0 || publicIds.length > 5) {
    throw new ApiError(400, 'INVALID_MEDIA_LIST', 'Danh sách ảnh cần xóa không hợp lệ.');
  }
  for (const publicId of publicIds) {
    const owned = ['wardrobe', 'avatars', 'tryon-input', 'tryon-results']
      .some((folder) => publicId.startsWith(`${uid}/${folder}/`));
    if (!owned) throw new ApiError(400, 'INVALID_IMAGE_OWNER', 'Ảnh không thuộc tài khoản hiện tại.');
    await deleteCloudinaryImage(env, publicId);
  }
  return { deleted: true, publicIds };
}

async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/health') {
    return { status: 'ok' };
  }

  if (request.method === 'POST' && url.pathname === '/v1/webhooks/payos') {
    return handlePayOsWebhook(env, await readJson(request));
  }
  if (request.method === 'GET' && url.pathname === '/v1/billing/return') {
    return paymentRedirect(env, request, 'return');
  }
  if (request.method === 'GET' && url.pathname === '/v1/billing/cancel') {
    return paymentRedirect(env, request, 'cancel');
  }

  const user = await authenticate(request, env);
  const { uid } = user;
  if (request.method === 'GET' && url.pathname === '/v1/billing/plans') {
    return getBillingPlans(env);
  }
  if (request.method === 'GET' && url.pathname === '/v1/billing/me') {
    return getMyPlan(env, user);
  }
  if (request.method === 'POST' && url.pathname === '/v1/billing/checkout') {
    return createCheckout(env, user, await readJson(request));
  }
  if (request.method === 'POST' && url.pathname === '/v1/account/anonymize-billing') {
    return anonymizeBilling(env, user);
  }
  if (request.method === 'POST' && url.pathname === '/v1/wardrobe/items') {
    return createWardrobeItem(env, user, await readJson(request), (ownerUid, image, folder) => (
      assertCloudinaryImage(env, ownerUid, image, folder)
    ));
  }
  if (request.method === 'POST' && url.pathname === '/v1/uploads/signatures') {
    return createUploadSignature(env, uid, await readJson(request));
  }
  if (request.method === 'POST' && url.pathname === '/v1/try-on/predictions') {
    return createPrediction(env, uid, await readJson(request));
  }
  if (request.method === 'DELETE' && url.pathname === '/v1/media') {
    return deleteOwnedMedia(env, uid, await readJson(request));
  }

  const statusMatch = url.pathname.match(/^\/v1\/try-on\/predictions\/([^/]+)\/status$/);
  if (request.method === 'POST' && statusMatch) {
    return getPredictionStatus(env, uid, statusMatch[1], await readJson(request));
  }
  const cancelMatch = url.pathname.match(/^\/v1\/try-on\/predictions\/([^/]+)$/);
  if (request.method === 'DELETE' && cancelMatch) {
    return cancelPrediction(env, uid, cancelMatch[1], await readJson(request));
  }
  const paymentMatch = url.pathname.match(/^\/v1\/billing\/payments\/(\d{10,16})$/);
  if (request.method === 'GET' && paymentMatch) {
    return getPayment(env, user, paymentMatch[1]);
  }
  const paymentCancelMatch = url.pathname.match(/^\/v1\/billing\/payments\/(\d{10,16})\/cancel$/);
  if (request.method === 'POST' && paymentCancelMatch) {
    return cancelPayment(env, user, paymentCancelMatch[1]);
  }
  throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy API này.');
}

export default {
  async fetch(request, env) {
    let corsHeaders = {};
    try {
      corsHeaders = corsFor(request, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
      const result = await route(request, env);
      if (result instanceof Response) return result;
      return json({ data: result }, 200, corsHeaders);
    } catch (error) {
      const status = Number(error?.status) || (error instanceof ApiError ? error.status : 500);
      const code = error?.code || (error instanceof ApiError ? error.code : 'INTERNAL_ERROR');
      const message = status < 500 ? error.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.';
      return json({ error: { code, message } }, status, corsHeaders);
    }
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(reconcilePendingPayments(env));
  },
};
