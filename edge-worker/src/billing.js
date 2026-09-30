import {
  batchGetDocuments,
  beginTransaction,
  commitWrites,
  deleteWrite,
  getDocument,
  query,
  rollbackTransaction,
  runQuery,
  setWrite,
} from './firestore-rest.js';

const PAYOS_API = 'https://api-merchant.payos.vn';
const DAY_MILLIS = 24 * 60 * 60 * 1000;
const PAYMENT_STATUSES = new Set([
  'CREATING', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW', 'REFUNDED',
]);

export const PLANS = Object.freeze({
  FREE: Object.freeze({
    id: 'FREE', name: 'Cơ bản', price: 0, durationDays: 0,
    tryOnLimit: 5, quotaPeriod: 'DAY', wardrobeLimit: 100,
    features: ['Thử đồ AI 5 lượt/ngày', 'Tủ đồ tối đa 100 món', 'Gợi ý theo thời tiết và lịch thiết bị'],
  }),
  PRO: Object.freeze({
    id: 'PRO', name: 'PRO', price: 69000, durationDays: 30,
    tryOnLimit: 100, quotaPeriod: 'MONTH', wardrobeLimit: -1,
    features: ['Thử đồ AI 100 lượt/tháng', 'Tủ đồ không giới hạn', 'Gợi ý theo thời tiết và lịch thiết bị'],
  }),
  PREMIUM: Object.freeze({
    id: 'PREMIUM', name: 'PREMIUM', price: 599000, durationDays: 365,
    tryOnLimit: 500, quotaPeriod: 'MONTH', wardrobeLimit: -1,
    features: ['Toàn bộ quyền lợi PRO', 'Thử đồ AI 500 lượt/tháng', 'Tủ đồ không giới hạn'],
  }),
});

function required(env, name) {
  const value = env[name];
  if (!value || String(value).startsWith('your-')) {
    const error = new Error(`Worker chưa được cấu hình biến ${name}.`);
    error.status = 503;
    error.code = 'SERVER_NOT_CONFIGURED';
    throw error;
  }
  return String(value);
}

function configured(env, name) {
  const value = env[name];
  return Boolean(value && !String(value).startsWith('your-'));
}

function publicBaseUrl(env) {
  return required(env, 'PUBLIC_BASE_URL').replace(/\/+$/, '');
}

function nowIso() {
  return new Date().toISOString();
}

function asMillis(value) {
  const millis = Date.parse(String(value || ''));
  return Number.isFinite(millis) ? millis : 0;
}

function safeText(value, max = 200) {
  return String(value || '').slice(0, max);
}

function randomOrderCode() {
  const suffix = crypto.getRandomValues(new Uint16Array(1))[0] % 1000;
  return Date.now() * 1000 + suffix;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmacSha256Hex(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function signatureValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function signatureData(data) {
  return Object.keys(data || {})
    .sort()
    .map((key) => `${key}=${signatureValue(data[key])}`)
    .join('&');
}

function constantTimeEqual(left, right) {
  const leftBytes = new TextEncoder().encode(String(left || '').toLowerCase());
  const rightBytes = new TextEncoder().encode(String(right || '').toLowerCase());
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

export async function verifyPayOsSignature(data, signature, checksumKey) {
  const expected = await hmacSha256Hex(signatureData(data), checksumKey);
  return constantTimeEqual(expected, signature);
}

async function payOsRequest(env, path, options = {}) {
  const response = await fetch(`${PAYOS_API}${path}`, {
    ...options,
    headers: {
      'x-client-id': required(env, 'PAYOS_CLIENT_ID'),
      'x-api-key': required(env, 'PAYOS_API_KEY'),
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.code !== '00') {
    const error = new Error(safeText(result?.desc || 'PayOS từ chối yêu cầu.', 300));
    error.status = response.status >= 500 ? 502 : 400;
    error.code = 'PAYOS_ERROR';
    throw error;
  }
  if (result.signature) {
    const valid = await verifyPayOsSignature(
      result.data,
      result.signature,
      required(env, 'PAYOS_CHECKSUM_KEY'),
    );
    if (!valid) {
      const error = new Error('Chữ ký phản hồi PayOS không hợp lệ.');
      error.status = 502;
      error.code = 'INVALID_PAYOS_SIGNATURE';
      throw error;
    }
  }
  return result.data;
}

async function createPayOsLink(env, orderCode, plan) {
  const baseUrl = publicBaseUrl(env);
  const expiredAt = Math.floor(Date.now() / 1000) + Math.min(
    Math.max(Number(env.PAYMENT_LINK_TTL_SECONDS) || 900, 300),
    3600,
  );
  const payload = {
    orderCode,
    amount: plan.price,
    description: `SHELFY ${orderCode}`,
    items: [{ name: `Gói Shelfy ${plan.name}`, quantity: 1, price: plan.price }],
    cancelUrl: `${baseUrl}/v1/billing/cancel?orderCode=${orderCode}`,
    returnUrl: `${baseUrl}/v1/billing/return?orderCode=${orderCode}`,
    expiredAt,
  };
  payload.signature = await hmacSha256Hex(signatureData({
    amount: payload.amount,
    cancelUrl: payload.cancelUrl,
    description: payload.description,
    orderCode: payload.orderCode,
    returnUrl: payload.returnUrl,
  }), required(env, 'PAYOS_CHECKSUM_KEY'));
  const data = await payOsRequest(env, '/v2/payment-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ...data, expiredAt: new Date(expiredAt * 1000).toISOString() };
}

function paymentPath(orderCode) {
  return `_billingPayments/${orderCode}`;
}

function paymentMirrorPath(uid, orderCode) {
  return `users/${uid}/payments/${orderCode}`;
}

function customerPath(uid) {
  return `_billingCustomers/${uid}`;
}

function entitlementPath(uid) {
  return `users/${uid}/entitlements/current`;
}

function paymentSummary(payment) {
  return {
    schemaVersion: 1,
    orderCode: payment.orderCode,
    provider: 'PAYOS',
    planId: payment.planId,
    planName: payment.planName,
    billingPeriod: payment.billingPeriod,
    durationDays: payment.durationDays,
    price: payment.price,
    currency: payment.currency,
    status: payment.status,
    checkoutUrl: payment.status === 'PENDING' ? payment.checkoutUrl || null : null,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt || null,
    cancelledAt: payment.cancelledAt || null,
    updatedAt: payment.updatedAt,
    amountPaid: payment.amountPaid ?? 0,
    failureCode: payment.failureCode || null,
  };
}

function publicPayment(payment) {
  return {
    orderCode: payment.orderCode,
    planId: payment.planId,
    status: payment.status,
    price: payment.price,
    currency: payment.currency,
    checkoutUrl: payment.status === 'PENDING' ? payment.checkoutUrl || null : null,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt || null,
    cancelledAt: payment.cancelledAt || null,
    failureCode: payment.failureCode || null,
  };
}

function effectivePlanFromEntitlement(entitlement, now = Date.now()) {
  const plan = PLANS[entitlement?.planId];
  const active = plan && plan.id !== 'FREE'
    && entitlement?.status === 'ACTIVE'
    && asMillis(entitlement.expiresAt) > now;
  if (!active) {
    return {
      ...PLANS.FREE,
      status: 'ACTIVE',
      startsAt: null,
      expiresAt: null,
      sourcePaymentOrderCode: null,
    };
  }
  return {
    ...plan,
    status: 'ACTIVE',
    startsAt: entitlement.startsAt || entitlement.activatedAt || null,
    expiresAt: entitlement.expiresAt,
    sourcePaymentOrderCode: entitlement.sourcePaymentOrderCode || null,
  };
}

function periodKey(plan, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return plan.quotaPeriod === 'MONTH'
    ? `${parts.year}-${parts.month}`
    : `${parts.year}-${parts.month}-${parts.day}`;
}

export async function getEffectiveEntitlement(env, uid) {
  const snapshot = await getDocument(env, entitlementPath(uid));
  return effectivePlanFromEntitlement(snapshot?.data);
}

export async function getBillingPlans(env) {
  const purchaseEnabled = [
    'PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY',
    'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'PUBLIC_BASE_URL',
  ].every((name) => configured(env, name));
  return {
    provider: 'PAYOS',
    purchaseEnabled,
    plans: Object.values(PLANS).map((plan) => ({ ...plan })),
  };
}

export async function ensurePayOsWebhook(env) {
  const ready = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY', 'PUBLIC_BASE_URL']
    .every((name) => configured(env, name));
  if (!ready || !env.RATE_LIMITS) return { configured: false };
  const webhookUrl = `${publicBaseUrl(env)}/v1/webhooks/payos`;
  const marker = `payos-webhook:${await sha256Hex(webhookUrl)}`;
  if (await env.RATE_LIMITS.get(marker)) return { configured: true, webhookUrl };
  const result = await payOsRequest(env, '/confirm-webhook', {
    method: 'POST',
    body: JSON.stringify({ webhookUrl }),
  });
  await env.RATE_LIMITS.put(marker, nowIso(), { expirationTtl: 30 * 24 * 60 * 60 });
  return { configured: true, webhookUrl: result?.webhookUrl || webhookUrl };
}

export async function getMyPlan(env, user) {
  const plan = await getEffectiveEntitlement(env, user.uid);
  const key = `quota:${user.uid}:${plan.id}:${periodKey(plan)}`;
  const used = env.RATE_LIMITS ? Number(await env.RATE_LIMITS.get(key) || 0) : 0;
  return {
    planId: plan.id,
    planName: plan.name,
    status: plan.status,
    startsAt: plan.startsAt,
    expiresAt: plan.expiresAt,
    wardrobeLimit: plan.wardrobeLimit,
    quota: { used, limit: plan.tryOnLimit, period: plan.quotaPeriod },
    sourcePaymentOrderCode: plan.sourcePaymentOrderCode,
  };
}

async function updatePayment(env, snapshot, patch) {
  const payment = { ...snapshot.data, ...patch, updatedAt: nowIso() };
  const mirror = await getDocument(env, paymentMirrorPath(payment.uid, payment.orderCode));
  const writes = [setWrite(env, paymentPath(payment.orderCode), payment, { updateTime: snapshot.updateTime })];
  if (mirror) {
    writes.push(setWrite(env, paymentMirrorPath(payment.uid, payment.orderCode), paymentSummary(payment), {
      updateTime: mirror.updateTime,
    }));
  }
  await commitWrites(env, writes);
  return payment;
}

async function clearPendingCustomer(env, uid, orderCode) {
  const customer = await getDocument(env, customerPath(uid));
  if (!customer || customer.data.pendingOrderCode !== orderCode) return;
  await commitWrites(env, [setWrite(env, customerPath(uid), {
    ...customer.data,
    pendingOrderCode: null,
    updatedAt: nowIso(),
  }, { updateTime: customer.updateTime })]).catch(() => {});
}

function assertRequestId(value) {
  const requestId = String(value || '');
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) {
    const error = new Error('Mã yêu cầu thanh toán không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_REQUEST_ID';
    throw error;
  }
  return requestId;
}

export async function createCheckout(env, user, body) {
  const plan = PLANS[String(body?.planId || '').toUpperCase()];
  if (!plan || plan.id === 'FREE') {
    const error = new Error('Gói thanh toán không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_PLAN';
    throw error;
  }
  const requestId = assertRequestId(body?.requestId);
  if (!env.RATE_LIMITS) {
    const error = new Error('Worker chưa được gắn KV RATE_LIMITS.');
    error.status = 503;
    error.code = 'RATE_LIMIT_NOT_CONFIGURED';
    throw error;
  }
  await ensurePayOsWebhook(env);
  const idempotencyKey = `billing-request:${user.uid}:${requestId}`;
  const existingOrderCode = await env.RATE_LIMITS.get(idempotencyKey);
  if (existingOrderCode) {
    const existing = await getDocument(env, paymentPath(existingOrderCode));
    if (existing?.data.uid === user.uid) return publicPayment(existing.data);
  }
  const minute = Math.floor(Date.now() / 60000);
  const rateKey = `billing-rate:${user.uid}:${minute}`;
  const attempts = Number(await env.RATE_LIMITS.get(rateKey) || 0);
  if (attempts >= 5) {
    const error = new Error('Bạn đã tạo quá nhiều yêu cầu thanh toán. Vui lòng thử lại sau.');
    error.status = 429;
    error.code = 'CHECKOUT_RATE_LIMIT';
    throw error;
  }
  await env.RATE_LIMITS.put(rateKey, String(attempts + 1), { expirationTtl: 180 });

  const [customer, currentEntitlement] = await Promise.all([
    getDocument(env, customerPath(user.uid)),
    getEffectiveEntitlement(env, user.uid),
  ]);
  if (currentEntitlement.id === 'PREMIUM' && plan.id === 'PRO') {
    const error = new Error('Bạn chỉ có thể mua PRO sau khi gói PREMIUM hết hạn.');
    error.status = 409;
    error.code = 'ACTIVE_PREMIUM';
    throw error;
  }
  if (customer?.data.pendingOrderCode) {
    const pending = await getDocument(env, paymentPath(customer.data.pendingOrderCode));
    if (pending?.data.uid === user.uid
      && pending.data.status === 'PENDING'
      && asMillis(pending.data.expiresAt) > Date.now()) {
      await env.RATE_LIMITS.put(idempotencyKey, String(pending.data.orderCode), { expirationTtl: 1800 });
      return publicPayment(pending.data);
    }
  }

  const createdAt = nowIso();
  const ttlSeconds = Math.min(Math.max(Number(env.PAYMENT_LINK_TTL_SECONDS) || 900, 300), 3600);
  let orderCode;
  let payment;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    orderCode = randomOrderCode();
    payment = {
      schemaVersion: 1,
      orderCode,
      provider: 'PAYOS',
      planId: plan.id,
      planName: plan.name,
      billingPeriod: plan.quotaPeriod,
      durationDays: plan.durationDays,
      price: plan.price,
      currency: 'VND',
      uid: user.uid,
      buyerEmail: safeText(user.email, 320),
      customerRefHash: null,
      status: 'CREATING',
      paymentLinkId: null,
      providerReference: null,
      description: `SHELFY ${orderCode}`,
      checkoutUrl: null,
      createdAt,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      paidAt: null,
      cancelledAt: null,
      updatedAt: createdAt,
      retentionUntil: new Date(Date.now() + (Number(env.BILLING_RETENTION_DAYS) || 3650) * DAY_MILLIS).toISOString(),
      amountPaid: 0,
      amountRemaining: plan.price,
      providerFee: null,
      netAmount: null,
      failureCode: null,
    };
    try {
      const customerData = {
        uid: user.uid,
        activePlanId: currentEntitlement.id,
        pendingOrderCode: orderCode,
        createdAt: customer?.data.createdAt || createdAt,
        updatedAt: createdAt,
      };
      await commitWrites(env, [
        setWrite(env, paymentPath(orderCode), payment, { exists: false }),
        setWrite(env, paymentMirrorPath(user.uid, orderCode), paymentSummary(payment), { exists: false }),
        setWrite(env, customerPath(user.uid), customerData,
          customer ? { updateTime: customer.updateTime } : { exists: false }),
      ]);
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }

  try {
    const link = await createPayOsLink(env, orderCode, plan);
    const snapshot = await getDocument(env, paymentPath(orderCode));
    payment = await updatePayment(env, snapshot, {
      status: 'PENDING',
      paymentLinkId: safeText(link.paymentLinkId, 128),
      checkoutUrl: safeText(link.checkoutUrl, 2000),
      expiresAt: link.expiredAt,
      amountRemaining: plan.price,
    });
    await env.RATE_LIMITS.put(idempotencyKey, String(orderCode), { expirationTtl: 1800 });
    return publicPayment(payment);
  } catch (error) {
    const snapshot = await getDocument(env, paymentPath(orderCode));
    if (snapshot) await updatePayment(env, snapshot, { status: 'FAILED', failureCode: error.code || 'PAYOS_CREATE_FAILED' });
    await clearPendingCustomer(env, user.uid, orderCode);
    throw error;
  }
}

async function withTransaction(env, work) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const transaction = await beginTransaction(env);
    try {
      return await work(transaction);
    } catch (error) {
      lastError = error;
      await rollbackTransaction(env, transaction);
      if (![409, 412].includes(error.status) && error.firestoreCode !== 'ABORTED') throw error;
    }
  }
  throw lastError;
}

async function finalizePaid(env, orderCode, providerData) {
  return withTransaction(env, async (transaction) => {
    const paymentPathValue = paymentPath(orderCode);
    const initialPayment = await getDocument(env, paymentPathValue);
    if (!initialPayment) return null;
    const uid = initialPayment.data.uid;
    if (!uid) return initialPayment.data;
    const paths = [
      paymentPathValue,
      paymentMirrorPath(uid, orderCode),
      entitlementPath(uid),
      customerPath(uid),
      `users/${uid}`,
    ];
    const [paymentDoc, mirrorDoc, entitlementDoc, customerDoc, profileDoc] = await batchGetDocuments(
      env,
      paths,
      transaction,
    );
    if (!paymentDoc || paymentDoc.data.status === 'PAID') return paymentDoc?.data || null;
    if (!['PENDING', 'CREATING'].includes(paymentDoc.data.status)) return paymentDoc.data;

    const paidAmount = Number(providerData.amountPaid ?? providerData.amount ?? 0);
    const linkMatches = !paymentDoc.data.paymentLinkId
      || !providerData.paymentLinkId
      || paymentDoc.data.paymentLinkId === providerData.paymentLinkId;
    const validPayment = paidAmount === paymentDoc.data.price
      && linkMatches
      && (!providerData.currency || providerData.currency === 'VND');
    const paidAt = nowIso();
    if (!validPayment || !profileDoc) {
      const reviewed = {
        ...paymentDoc.data,
        status: 'REVIEW',
        failureCode: !profileDoc ? 'ACCOUNT_DELETED' : 'PAYMENT_MISMATCH',
        providerReference: safeText(providerData.reference, 128),
        amountPaid: paidAmount,
        paidAt,
        updatedAt: paidAt,
      };
      const writes = [setWrite(env, paymentPathValue, reviewed, { updateTime: paymentDoc.updateTime })];
      if (mirrorDoc) {
        writes.push(setWrite(env, paymentMirrorPath(uid, orderCode), paymentSummary(reviewed), {
          updateTime: mirrorDoc.updateTime,
        }));
      }
      if (customerDoc) {
        writes.push(setWrite(env, customerPath(uid), {
          ...customerDoc.data,
          pendingOrderCode: null,
          updatedAt: paidAt,
        }, { updateTime: customerDoc.updateTime }));
      }
      await commitWrites(env, writes, transaction);
      return reviewed;
    }

    const targetPlan = PLANS[paymentDoc.data.planId];
    const current = effectivePlanFromEntitlement(entitlementDoc?.data);
    if (current.id === 'PREMIUM' && targetPlan.id === 'PRO') {
      const reviewed = {
        ...paymentDoc.data,
        status: 'REVIEW',
        failureCode: 'DOWNGRADE_REVIEW_REQUIRED',
        providerReference: safeText(providerData.reference, 128),
        amountPaid: paidAmount,
        paidAt,
        updatedAt: paidAt,
      };
      const writes = [setWrite(env, paymentPathValue, reviewed, { updateTime: paymentDoc.updateTime })];
      if (mirrorDoc) {
        writes.push(setWrite(env, paymentMirrorPath(uid, orderCode), paymentSummary(reviewed), {
          updateTime: mirrorDoc.updateTime,
        }));
      }
      if (customerDoc) {
        writes.push(setWrite(env, customerPath(uid), {
          ...customerDoc.data,
          pendingOrderCode: null,
          updatedAt: paidAt,
        }, { updateTime: customerDoc.updateTime }));
      }
      await commitWrites(env, writes, transaction);
      return reviewed;
    }

    const startMillis = current.id === targetPlan.id && asMillis(current.expiresAt) > Date.now()
      ? asMillis(current.expiresAt)
      : Date.now();
    const entitlement = {
      schemaVersion: 1,
      planId: targetPlan.id,
      status: 'ACTIVE',
      activatedAt: paidAt,
      startsAt: new Date(startMillis).toISOString(),
      expiresAt: new Date(startMillis + targetPlan.durationDays * DAY_MILLIS).toISOString(),
      wardrobeLimit: targetPlan.wardrobeLimit,
      tryOnLimit: targetPlan.tryOnLimit,
      quotaPeriod: targetPlan.quotaPeriod,
      sourcePaymentOrderCode: orderCode,
      updatedAt: paidAt,
    };
    const payment = {
      ...paymentDoc.data,
      status: 'PAID',
      checkoutUrl: null,
      providerReference: safeText(providerData.reference, 128),
      amountPaid: paidAmount,
      amountRemaining: 0,
      paidAt,
      failureCode: null,
      updatedAt: paidAt,
    };
    const customer = {
      ...(customerDoc?.data || { uid, createdAt: paidAt }),
      activePlanId: targetPlan.id,
      pendingOrderCode: null,
      updatedAt: paidAt,
    };
    const writes = [
      setWrite(env, paymentPathValue, payment, { updateTime: paymentDoc.updateTime }),
      mirrorDoc
        ? setWrite(env, paymentMirrorPath(uid, orderCode), paymentSummary(payment), { updateTime: mirrorDoc.updateTime })
        : setWrite(env, paymentMirrorPath(uid, orderCode), paymentSummary(payment), { exists: false }),
      entitlementDoc
        ? setWrite(env, entitlementPath(uid), entitlement, { updateTime: entitlementDoc.updateTime })
        : setWrite(env, entitlementPath(uid), entitlement, { exists: false }),
      customerDoc
        ? setWrite(env, customerPath(uid), customer, { updateTime: customerDoc.updateTime })
        : setWrite(env, customerPath(uid), customer, { exists: false }),
    ];
    await commitWrites(env, writes, transaction);
    return payment;
  });
}

async function markProviderStatus(env, snapshot, providerData) {
  const providerStatus = String(providerData.status || '').toUpperCase();
  if (providerStatus === 'PAID') return finalizePaid(env, snapshot.data.orderCode, providerData);
  if (!['CANCELLED', 'EXPIRED'].includes(providerStatus)) return snapshot.data;
  const status = providerStatus === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED';
  const payment = await updatePayment(env, snapshot, {
    status,
    checkoutUrl: null,
    cancelledAt: status === 'CANCELLED' ? (providerData.canceledAt || nowIso()) : null,
    failureCode: status === 'EXPIRED' ? 'PAYMENT_LINK_EXPIRED' : null,
    amountPaid: Number(providerData.amountPaid || 0),
    amountRemaining: Number(providerData.amountRemaining ?? snapshot.data.price),
    providerCheckedAt: nowIso(),
  });
  await clearPendingCustomer(env, snapshot.data.uid, snapshot.data.orderCode);
  return payment;
}

async function reconcilePayment(env, snapshot, { force = false } = {}) {
  if (!snapshot || snapshot.data.status !== 'PENDING') return snapshot?.data || null;
  if (!force && Date.now() - asMillis(snapshot.data.providerCheckedAt) < 5000) return snapshot.data;
  const data = await payOsRequest(env, `/v2/payment-requests/${encodeURIComponent(snapshot.data.orderCode)}`);
  if (!data.paymentLinkId) data.paymentLinkId = snapshot.data.paymentLinkId;
  const result = await markProviderStatus(env, snapshot, data);
  if (result?.status === 'PENDING') {
    const latest = await getDocument(env, paymentPath(snapshot.data.orderCode));
    return updatePayment(env, latest, {
      providerCheckedAt: nowIso(),
      amountPaid: Number(data.amountPaid || 0),
      amountRemaining: Number(data.amountRemaining ?? snapshot.data.price),
    });
  }
  return result;
}

export async function getPayment(env, user, orderCodeValue) {
  const orderCode = String(orderCodeValue || '');
  if (!/^\d{10,16}$/.test(orderCode)) {
    const error = new Error('Mã thanh toán không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_ORDER_CODE';
    throw error;
  }
  let snapshot = await getDocument(env, paymentPath(orderCode));
  if (!snapshot || snapshot.data.uid !== user.uid) {
    const error = new Error('Không tìm thấy giao dịch này.');
    error.status = 404;
    error.code = 'PAYMENT_NOT_FOUND';
    throw error;
  }
  if (snapshot.data.status === 'PENDING') {
    await reconcilePayment(env, snapshot).catch(() => null);
    snapshot = await getDocument(env, paymentPath(orderCode));
  }
  return publicPayment(snapshot.data);
}

export async function cancelPayment(env, user, orderCodeValue) {
  const snapshot = await getDocument(env, paymentPath(orderCodeValue));
  if (!snapshot || snapshot.data.uid !== user.uid) {
    const error = new Error('Không tìm thấy giao dịch này.');
    error.status = 404;
    error.code = 'PAYMENT_NOT_FOUND';
    throw error;
  }
  if (snapshot.data.status !== 'PENDING') return publicPayment(snapshot.data);
  const data = await payOsRequest(env, `/v2/payment-requests/${encodeURIComponent(orderCodeValue)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellationReason: 'User requested cancellation' }),
  });
  const payment = await markProviderStatus(env, snapshot, { ...data, status: 'CANCELLED' });
  return publicPayment(payment);
}

export async function handlePayOsWebhook(env, payload) {
  const signature = payload?.signature;
  const data = payload?.data;
  if (!signature || !data || typeof data !== 'object') {
    const error = new Error('Webhook PayOS không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_WEBHOOK';
    throw error;
  }
  if (!await verifyPayOsSignature(data, signature, required(env, 'PAYOS_CHECKSUM_KEY'))) {
    const error = new Error('Chữ ký webhook PayOS không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_PAYOS_SIGNATURE';
    throw error;
  }
  const eventId = await sha256Hex(`${signature}:${data.orderCode || ''}:${data.reference || ''}`);
  const event = {
    schemaVersion: 1,
    eventId,
    provider: 'PAYOS',
    orderCode: Number(data.orderCode || 0),
    amount: Number(data.amount || 0),
    currency: safeText(data.currency || 'VND', 8),
    paymentLinkId: safeText(data.paymentLinkId, 128),
    providerReference: safeText(data.reference, 128),
    providerCode: safeText(data.code || payload.code, 30),
    providerDescription: safeText(data.desc || payload.desc, 300),
    receivedAt: nowIso(),
  };
  await commitWrites(env, [setWrite(env, `_billingWebhookEvents/${eventId}`, event, { exists: false })])
    .catch((error) => {
      if (![409, 412].includes(error.status)) throw error;
    });

  const snapshot = await getDocument(env, paymentPath(data.orderCode));
  // PayOS sends a signed sample while registering the webhook. Acknowledge it without creating a payment.
  if (!snapshot) return { acknowledged: true, sample: true };
  if (snapshot.data.status === 'PAID') return { acknowledged: true, duplicate: true };
  if (payload.success === true && String(data.code || payload.code) === '00') {
    await finalizePaid(env, snapshot.data.orderCode, data);
  }
  return { acknowledged: true };
}

export function paymentRedirect(env, request, status) {
  const url = new URL(request.url);
  const orderCode = url.searchParams.get('orderCode') || '';
  const deepLink = new URL(required(env, 'APP_DEEP_LINK'));
  if (orderCode) deepLink.searchParams.set('orderCode', orderCode);
  deepLink.searchParams.set('returnStatus', status);
  return Response.redirect(deepLink.toString(), 302);
}

export async function anonymizeBilling(env, user) {
  const payments = await runQuery(env, {
    from: [{ collectionId: '_billingPayments' }],
    where: query.fieldFilter('uid', 'EQUAL', user.uid),
    limit: 500,
  });
  const customerHash = await sha256Hex(`${required(env, 'BILLING_PSEUDONYM_SALT')}:${user.uid}`);
  const anonymizedAt = nowIso();
  const writes = [];
  for (const paymentDoc of payments) {
    let payment = paymentDoc.data;
    if (payment.status === 'PENDING') {
      try {
        await payOsRequest(env, `/v2/payment-requests/${encodeURIComponent(payment.orderCode)}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ cancellationReason: 'Account deleted' }),
        });
        payment = { ...payment, status: 'CANCELLED', cancelledAt: anonymizedAt, checkoutUrl: null };
      } catch {
        payment = { ...payment, status: 'REVIEW', failureCode: 'ACCOUNT_DELETED_WHILE_PENDING' };
      }
    }
    writes.push(setWrite(env, paymentPath(payment.orderCode), {
      ...payment,
      uid: null,
      buyerEmail: null,
      customerRefHash: customerHash,
      anonymizedAt,
      updatedAt: anonymizedAt,
    }, { updateTime: paymentDoc.updateTime }));
  }
  const mirrors = await runQuery(env, {
    from: [{ collectionId: 'payments' }],
    limit: 500,
  }, `users/${user.uid}`);
  for (const mirror of mirrors) {
    writes.push(deleteWrite(env, `users/${user.uid}/payments/${mirror.id}`, { updateTime: mirror.updateTime }));
  }
  const [entitlement, customer] = await Promise.all([
    getDocument(env, entitlementPath(user.uid)),
    getDocument(env, customerPath(user.uid)),
  ]);
  if (entitlement) writes.push(deleteWrite(env, entitlementPath(user.uid), { updateTime: entitlement.updateTime }));
  if (customer) writes.push(deleteWrite(env, customerPath(user.uid), { updateTime: customer.updateTime }));
  for (let offset = 0; offset < writes.length; offset += 100) {
    await commitWrites(env, writes.slice(offset, offset + 100));
  }
  return { anonymized: true, paymentCount: payments.length };
}

export async function reconcilePendingPayments(env) {
  const pending = await runQuery(env, {
    from: [{ collectionId: '_billingPayments' }],
    where: query.fieldFilter('status', 'EQUAL', 'PENDING'),
    orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'ASCENDING' }],
    limit: 50,
  });
  let processed = 0;
  for (const payment of pending) {
    await reconcilePayment(env, payment, { force: true }).catch(() => null);
    processed += 1;
  }
  return { processed };
}

export function validatePaymentStatus(status) {
  return PAYMENT_STATUSES.has(status);
}

export function quotaDescriptor(plan, uid) {
  return {
    key: `quota:${uid}:${plan.id}:${periodKey(plan)}`,
    limit: plan.tryOnLimit,
    period: plan.quotaPeriod,
    expirationTtl: plan.quotaPeriod === 'MONTH' ? 370 * 24 * 60 * 60 : 3 * 24 * 60 * 60,
  };
}
