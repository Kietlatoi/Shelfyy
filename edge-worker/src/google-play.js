import { PLANS, effectivePlanFromEntitlement, withTransaction } from './billing.js';
import { serviceAccountAccessToken, getDocument, batchGetDocuments, commitWrites, setWrite, runQuery, query } from './firestore-rest.js';

const PACKAGE = 'com.duongminhkiet.shelfy';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const DAY = 86400000;

function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}

export async function playAccountId(uid) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`shelfy:${uid}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function products(env) {
  return { PRO: env.GOOGLE_PLAY_PRO_PRODUCT_ID, PREMIUM: env.GOOGLE_PLAY_PREMIUM_PRODUCT_ID };
}

export async function getPlayContext(env, user) {
  const ids = products(env);
  return {
    provider: 'GOOGLE_PLAY', packageName: PACKAGE,
    purchaseEnabled: env.GOOGLE_PLAY_BILLING_ENABLED === 'true'
      && Boolean(ids.PRO && ids.PREMIUM && ids.PRO !== ids.PREMIUM && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY),
    accountId: await playAccountId(user.uid),
    plans: Object.values(PLANS).map((plan) => ({ ...plan, productId: ids[plan.id] || null })),
  };
}

async function playRequest(env, suffix, method = 'GET') {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/${suffix}`, {
    method,
    headers: { authorization: `Bearer ${await serviceAccountAccessToken(env, SCOPE)}` },
  });
  if (!response.ok) fail(response.status === 404 ? 400 : 502, 'GOOGLE_PLAY_API_ERROR', 'Không thể xác minh giao dịch Google Play. Vui lòng thử lại.');
  return response.status === 204 ? null : response.json().catch(() => null);
}

export function validatePlayPurchase(purchase, productId, accountId) {
  if (purchase.obfuscatedExternalAccountId !== accountId) fail(403, 'PURCHASE_OWNER_MISMATCH', 'Giao dịch không thuộc tài khoản Shelfy này.');
  const lines = purchase.productLineItem || [];
  if (lines.length !== 1 || lines[0].productId !== productId
    || Number(lines[0].productOfferDetails?.quantity || 1) !== 1
    || lines[0].productOfferDetails?.rentOfferDetails || lines[0].productOfferDetails?.preorderOfferDetails) {
    fail(400, 'INVALID_PLAY_PRODUCT', 'Sản phẩm Google Play không hợp lệ.');
  }
  const state = purchase.purchaseStateContext?.purchaseState;
  if (!['PURCHASED', 'PENDING', 'CANCELLED'].includes(state)) fail(400, 'INVALID_PLAY_STATE', 'Trạng thái thanh toán chưa hợp lệ.');
  return state;
}

export function playMoney(order, productId) {
  if (order.lineItems?.length !== 1 || order.lineItems[0].productId !== productId) fail(400, 'INVALID_PLAY_ORDER', 'Đơn Google Play không khớp sản phẩm.');
  const money = order.total;
  const amount = Number(money?.units || 0) + Number(money?.nanos || 0) / 1e9;
  // The existing finance dashboard totals VND; add FX accounting before opening other markets.
  if (money?.currencyCode !== 'VND' || !Number.isFinite(amount) || amount < 0) fail(400, 'PLAY_CURRENCY_UNSUPPORTED', 'Hiện Shelfy chỉ hỗ trợ giao dịch Google Play bằng VND.');
  return amount;
}

function summary(payment) {
  const { purchaseTokenHash, buyerEmail, uid, priorEntitlement, ...publicFields } = payment;
  void purchaseTokenHash; void buyerEmail; void uid; void priorEntitlement;
  return publicFields;
}

// Grant and ledger commit together; consuming only happens afterwards and is retryable.
export async function applyPlayPurchase(env, user, purchase, token, productId, amount, dependencies = {}) {
  const get = dependencies.getDocument || getDocument;
  const batch = dependencies.batchGetDocuments || batchGetDocuments;
  const commit = dependencies.commitWrites || commitWrites;
  const transaction = dependencies.withTransaction || withTransaction;
  const tokenHash = await playAccountId(token);
  const orderCode = `gp_${tokenHash}`;
  const privatePath = `_googlePlayPurchases/${tokenHash}`;
  const paymentPath = `_billingPayments/${orderCode}`;
  const mirrorPath = `users/${user.uid}/payments/${orderCode}`;
  const entitlementPath = `users/${user.uid}/entitlements/current`;
  const state = validatePlayPurchase(purchase, productId, await playAccountId(user.uid));
  const planId = Object.keys(products(env)).find((id) => products(env)[id] === productId);
  const plan = PLANS[planId];
  if (!plan || plan.id === 'FREE') fail(400, 'INVALID_PLAN', 'Gói thanh toán không hợp lệ.');

  return transaction(env, async (tx) => {
    const [old, entitlement, profile, privateDoc] = await batch(env, [paymentPath, entitlementPath, `users/${user.uid}`, privatePath], tx);
    if (old && old.data.uid !== user.uid) fail(403, 'PURCHASE_ALREADY_CLAIMED', 'Giao dịch đã được xử lý cho tài khoản khác hoặc đã xóa.');
    if (old?.data.status === 'REFUNDED'
      || (old && ['PAID', 'REVIEW'].includes(old.data.status) && state !== 'CANCELLED')) return summary(old.data);
    if (!old && purchase.productLineItem[0].productOfferDetails?.consumptionState === 'CONSUMPTION_STATE_CONSUMED') {
      fail(409, 'PLAY_PURCHASE_CONSUMED', 'Giao dịch đã được sử dụng. Vui lòng liên hệ hỗ trợ.');
    }
    const now = new Date().toISOString();
    const current = effectivePlanFromEntitlement(entitlement?.data);
    let status = state === 'PURCHASED' ? 'PAID' : state === 'PENDING' ? 'PENDING' : 'CANCELLED';
    if (state === 'PURCHASED' && (!profile || (current.id === 'PREMIUM' && plan.id === 'PRO'))) status = 'REVIEW';
    if (old?.data.status === 'PAID' && state === 'CANCELLED') status = 'REFUNDED';
    const isTest = Boolean(purchase.testPurchaseContext) || Boolean(old?.data.isTest);
    const payment = {
      ...(old?.data || {}), schemaVersion: 1, orderCode, provider: 'GOOGLE_PLAY',
      providerReference: purchase.orderId || null, paymentLinkId: null,
      productId, packageName: PACKAGE, purchaseTokenHash: tokenHash,
      planId, planName: plan.name, billingPeriod: plan.quotaPeriod, durationDays: plan.durationDays,
      uid: user.uid, buyerEmail: old?.data.buyerEmail ?? user.email ?? null, status,
      price: amount ?? old?.data.price ?? null, currency: 'VND',
      amountPaid: isTest ? 0 : amount ?? old?.data.amountPaid ?? 0,
      isTest, providerAmount: amount ?? null, providerFee: null, netAmount: null,
      createdAt: old?.data.createdAt || now, updatedAt: now,
      paidAt: purchase.purchaseCompletionTime || null, expiresAt: null, checkoutUrl: null,
      retentionUntil: old?.data.retentionUntil || new Date(Date.now() + 3650 * DAY).toISOString(),
      failureCode: status === 'REVIEW' ? 'PLAY_MANUAL_REVIEW_REQUIRED' : null,
    };
    const writes = [];
    if (status === 'PAID') {
      const start = current.id === planId ? Date.parse(current.expiresAt) : Date.now();
      payment.priorEntitlement = entitlement?.data || null;
      payment.entitlementExpiresAt = new Date(start + plan.durationDays * DAY).toISOString();
      writes.push(setWrite(env, entitlementPath, {
        schemaVersion: 1, planId, status: 'ACTIVE', startsAt: new Date(start).toISOString(),
        activatedAt: now, expiresAt: payment.entitlementExpiresAt, updatedAt: now,
        wardrobeLimit: plan.wardrobeLimit, tryOnLimit: plan.tryOnLimit, quotaPeriod: plan.quotaPeriod,
        sourcePaymentOrderCode: orderCode,
      }, entitlement ? { updateTime: entitlement.updateTime } : { exists: false }));
    }
    if (status === 'REFUNDED' && old?.data.status !== 'REFUNDED') {
      payment.refundedAt = now;
      if (entitlement?.data.sourcePaymentOrderCode === orderCode) {
        const prior = old.data.priorEntitlement;
        const previousPayment = prior?.sourcePaymentOrderCode
          ? await get(env, `_billingPayments/${prior.sourcePaymentOrderCode}`, { transaction: tx }) : null;
        const restorePrior = prior && (!prior.sourcePaymentOrderCode || previousPayment?.data.status === 'PAID');
        writes.push(setWrite(env, entitlementPath, restorePrior
          ? { ...prior, updatedAt: now }
          : { planId: 'FREE', status: 'ACTIVE', expiresAt: null, updatedAt: now }, { updateTime: entitlement.updateTime }));
      } else {
        // shortcut: refunds of earlier stacked grants need manual allocation before changing later paid rights.
        payment.entitlementReviewRequired = true;
      }
    }
    writes.push(setWrite(env, paymentPath, payment, old ? { updateTime: old.updateTime } : { exists: false }));
    if (profile) writes.push(setWrite(env, mirrorPath, summary(payment)));
    writes.push(setWrite(env, privatePath, {
      purchaseToken: token, productId, orderCode,
      consumePending: state === 'PURCHASED' && purchase.productLineItem[0].productOfferDetails?.consumptionState !== 'CONSUMPTION_STATE_CONSUMED',
      nextCheckAt: new Date(Date.now() + (state === 'PENDING' ? 15 * 60000 : DAY)).toISOString(),
    }, privateDoc ? { updateTime: privateDoc.updateTime } : { exists: false }));
    await commit(env, writes, tx);
    return summary(payment);
  });
}

export async function verifyPlayPurchase(env, user, body, { allowDisabled = false } = {}) {
  if (!allowDisabled && !(await getPlayContext(env, user)).purchaseEnabled) fail(503, 'PLAY_NOT_CONFIGURED', 'Google Play Billing chưa được cấu hình trên máy chủ.');
  const token = body?.purchaseToken;
  const productId = body?.productId;
  if (typeof token !== 'string' || token.length < 10 || token.length > 4096
    || typeof productId !== 'string' || !Object.values(products(env)).includes(productId)) fail(400, 'INVALID_PLAY_REQUEST', 'Yêu cầu thanh toán không hợp lệ.');
  const purchase = await playRequest(env, `purchases/productsv2/tokens/${encodeURIComponent(token)}`);
  const state = validatePlayPurchase(purchase, productId, await playAccountId(user.uid));
  let amount = null;
  if (state === 'PURCHASED') {
    if (!purchase.orderId) fail(400, 'INVALID_PLAY_ORDER', 'Google chưa cung cấp mã đơn. Vui lòng thử lại.');
    const order = await playRequest(env, `orders/${encodeURIComponent(purchase.orderId)}`);
    if (order.purchaseToken !== token || order.orderId !== purchase.orderId) fail(400, 'INVALID_PLAY_ORDER', 'Đơn thanh toán không khớp.');
    amount = playMoney(order, productId);
  }
  const result = await applyPlayPurchase(env, user, purchase, token, productId, amount);
  if (state === 'PURCHASED' && ['PAID', 'REVIEW'].includes(result.status)) {
    const hash = await playAccountId(token);
    const path = `_googlePlayPurchases/${hash}`;
    const record = await getDocument(env, path);
    if (record?.data.consumePending) {
      // A failed consume leaves the server record pending; callbacks/cron retry without re-granting.
      if (purchase.productLineItem[0].productOfferDetails?.consumptionState !== 'CONSUMPTION_STATE_CONSUMED') {
        try {
          await playRequest(env, `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:consume`, 'POST');
        } catch (error) {
          const latest = await playRequest(env, `purchases/productsv2/tokens/${encodeURIComponent(token)}`);
          if (latest.productLineItem?.[0]?.productOfferDetails?.consumptionState !== 'CONSUMPTION_STATE_CONSUMED') throw error;
        }
      }
      await commitWrites(env, [setWrite(env, path, { ...record.data, consumePending: false }, { updateTime: record.updateTime })]);
    }
  }
  return result;
}

export async function reconcilePlayPayment(env, orderCode) {
  const ledger = await getDocument(env, `_billingPayments/${orderCode}`);
  if (!ledger || ledger.data.provider !== 'GOOGLE_PLAY') fail(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch Google.');
  const record = await getDocument(env, `_googlePlayPurchases/${ledger.data.purchaseTokenHash}`);
  if (!record || !ledger.data.uid) return summary(ledger.data);
  return verifyPlayPurchase(env, { uid: ledger.data.uid, email: ledger.data.buyerEmail }, record.data, { allowDisabled: true });
}

export async function reconcilePlayPayments(env) {
  if (env.GOOGLE_PLAY_BILLING_ENABLED !== 'true') return;
  const records = await runQuery(env, {
    from: [{ collectionId: '_googlePlayPurchases' }],
    where: query.fieldFilter('nextCheckAt', 'LESS_THAN_OR_EQUAL', new Date().toISOString()),
    orderBy: [{ field: { fieldPath: 'nextCheckAt' }, direction: 'ASCENDING' }], limit: 30,
  });
  for (const record of records) {
    await reconcilePlayPayment(env, record.data.orderCode).catch(() => null);
    const latest = await getDocument(env, `_googlePlayPurchases/${record.id}`);
    if (latest) await commitWrites(env, [setWrite(env, `_googlePlayPurchases/${record.id}`, {
      ...latest.data, nextCheckAt: new Date(Date.now() + (latest.data.consumePending ? 15 * 60000 : DAY)).toISOString(),
    }, { updateTime: latest.updateTime })]).catch(() => null);
  }
}
