const crypto = require('node:crypto');

const PLAN_CATALOG = Object.freeze([
  Object.freeze({
    id: 'FREE', displayName: 'Gói Cơ Bản', price: 0, currency: 'VND', durationDays: 0,
    tryOnLimit: 5, quotaPeriod: 'DAY', wardrobeLimit: 100,
    features: ['Thử đồ AI 5 lượt/ngày', 'Lưu tối đa 100 món đồ', 'Gợi ý phối đồ hằng ngày'],
  }),
  Object.freeze({
    id: 'PRO', displayName: 'Gói PRO', price: 99000, currency: 'VND', durationDays: 30,
    tryOnLimit: 100, quotaPeriod: 'MONTH', wardrobeLimit: -1,
    features: ['Thử đồ AI 100 lượt/tháng', 'Tủ đồ không giới hạn', 'Gợi ý theo Google Calendar'],
  }),
  Object.freeze({
    id: 'PREMIUM', displayName: 'Gói PREMIUM', price: 799000, currency: 'VND', durationDays: 365,
    tryOnLimit: 500, quotaPeriod: 'MONTH', wardrobeLimit: -1,
    features: ['Toàn bộ quyền lợi PRO', 'Thử đồ AI 500 lượt/tháng', 'Ưu tiên xử lý'],
  }),
]);
const PLANS_BY_ID = new Map(PLAN_CATALOG.map((plan) => [plan.id, plan]));
const FREE_PLAN = PLANS_BY_ID.get('FREE');
const DAY_MILLIS = 24 * 60 * 60 * 1000;

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function safeTimeZone(value) {
  if (typeof value !== 'string' || value.length > 64) return 'Asia/Ho_Chi_Minh';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'Asia/Ho_Chi_Minh';
  }
}

function dateParts(milliseconds, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(milliseconds)).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
}

function planRank(planId) {
  return planId === 'PREMIUM' ? 2 : planId === 'PRO' ? 1 : 0;
}

function createBillingService({
  database,
  vnpay,
  paymentsEnabled = () => false,
  serverTimestamp,
  now = Date.now,
  HttpsError,
}) {
  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function requireUid(uid) {
    if (typeof uid !== 'string' || !uid) fail('unauthenticated', 'Vui lòng đăng nhập để xem gói dịch vụ.');
  }

  function normalizePlan(value) {
    const planId = String(value || '').trim().toUpperCase();
    const plan = PLANS_BY_ID.get(planId);
    if (!plan || plan.id === 'FREE') fail('invalid-argument', 'Gói nâng cấp không hợp lệ.');
    return plan;
  }

  function isActivePaid(entitlement, currentTime = now()) {
    const planId = String(entitlement?.planId || 'FREE').toUpperCase();
    const expiresAt = timestampMillis(entitlement?.expiresAt);
    return planRank(planId) > 0
      && expiresAt > currentTime
      && !['CANCELED', 'CANCELLED', 'EXPIRED', 'REVOKED'].includes(String(entitlement?.status || '').toUpperCase());
  }

  function quotaPeriodKey(currentTime, timeZone, isPaid) {
    const parts = dateParts(currentTime, timeZone);
    return isPaid ? `${parts.year}-${parts.month}` : `${parts.year}-${parts.month}-${parts.day}`;
  }

  function freeEntitlement() {
    const currentTime = now();
    return {
      planId: FREE_PLAN.id,
      status: 'ACTIVE',
      startsAt: new Date(currentTime),
      expiresAt: null,
      tryOnLimit: FREE_PLAN.tryOnLimit,
      quotaPeriod: FREE_PLAN.quotaPeriod,
      wardrobeLimit: FREE_PLAN.wardrobeLimit,
      autoRenew: false,
      source: 'DEFAULT',
      updatedAt: serverTimestamp(),
    };
  }

  async function getPlans(uid) {
    requireUid(uid);
    return {
      plans: PLAN_CATALOG.map((plan) => ({ ...plan, features: [...plan.features] })),
      purchaseEnabled: Boolean(paymentsEnabled()),
    };
  }

  async function getMyPlan(uid) {
    requireUid(uid);
    const userRef = database.doc(`users/${uid}`);
    const entitlementRef = database.doc(`users/${uid}/entitlements/current`);
    const snapshot = await entitlementRef.get();
    let entitlement = snapshot.exists ? snapshot.data() : null;
    if (!entitlement) {
      entitlement = freeEntitlement();
      await database.runTransaction(async (transaction) => {
        const latest = await transaction.get(entitlementRef);
        if (!latest.exists) transaction.create(entitlementRef, entitlement);
        else entitlement = latest.data();
      });
    }

    const userSnapshot = await userRef.get();
    const timeZone = safeTimeZone(userSnapshot.data()?.timeZone);
    if (!isActivePaid(entitlement) && String(entitlement.planId || 'FREE').toUpperCase() !== 'FREE') {
      await database.runTransaction(async (transaction) => {
        const latest = await transaction.get(entitlementRef);
        if (!latest.exists) return;
        const latestEntitlement = latest.data();
        if (isActivePaid(latestEntitlement)
          || String(latestEntitlement.planId || 'FREE').toUpperCase() === 'FREE') {
          entitlement = latestEntitlement;
          return;
        }
        entitlement = {
          ...freeEntitlement(),
          expiresAt: latestEntitlement.expiresAt || null,
          expiredPlanId: latestEntitlement.planId,
          source: latestEntitlement.source || 'DEFAULT',
        };
        transaction.set(entitlementRef, entitlement);
      });
    }
    const active = isActivePaid(entitlement);
    const plan = active ? PLANS_BY_ID.get(String(entitlement.planId).toUpperCase()) : FREE_PLAN;

    const currentTime = now();
    const periodKey = quotaPeriodKey(currentTime, timeZone, active);
    const usageId = crypto.createHash('sha256').update(uid).digest('hex');
    const usageSnapshot = await database.doc(`_tryOnUsage/${usageId}`).get();
    const usageData = usageSnapshot.exists ? usageSnapshot.data() : {};
    const limit = active
      ? Math.min(500, Number(entitlement.tryOnLimit) > 0 ? Number(entitlement.tryOnLimit) : plan.tryOnLimit)
      : FREE_PLAN.tryOnLimit;
    const used = usageData.periodKey === periodKey ? Math.max(0, Number(usageData.count) || 0) : 0;

    return {
      planId: plan.id,
      displayName: plan.displayName,
      status: active || plan.id === 'FREE' ? 'ACTIVE' : 'EXPIRED',
      startsAt: entitlement.startsAt || null,
      expiresAt: active ? entitlement.expiresAt : null,
      autoRenew: false,
      source: entitlement.source || 'DEFAULT',
      wardrobeLimit: active ? Number(entitlement.wardrobeLimit ?? plan.wardrobeLimit) : FREE_PLAN.wardrobeLimit,
      quota: { period: active ? 'MONTH' : 'DAY', periodKey, used, limit, remaining: Math.max(0, limit - used) },
    };
  }

  async function createVnpayPayment(uid, input = {}) {
    requireUid(uid);
    const plan = normalizePlan(input.planId || input.planType);
    if (!paymentsEnabled() || !vnpay.isConfigured()) {
      fail('failed-precondition', 'Thanh toán VNPay sandbox chưa được cấu hình.');
    }

    const entitlementRef = database.doc(`users/${uid}/entitlements/current`);
    const entitlementSnapshot = await entitlementRef.get();
    const current = entitlementSnapshot.exists ? entitlementSnapshot.data() : null;
    if (isActivePaid(current) && planRank(current.planId) > planRank(plan.id)) {
      fail('failed-precondition', 'Không thể chuyển xuống gói thấp hơn khi gói hiện tại còn hạn.');
    }

    const txnRef = vnpay.generateTxnRef();
    const paymentUrl = vnpay.buildPaymentUrl({
      amount: plan.price,
      clientIp: input.clientIp,
      orderInfo: `Shelfy ${plan.id} ${txnRef}`,
      txnRef,
    });
    const paymentRef = database.doc(`users/${uid}/payments/${txnRef}`);
    const transactionRef = database.doc(`_paymentTransactions/${txnRef}`);
    const pendingRef = database.doc(`_pendingPaymentByUser/${uid}`);
    const currentTime = now();
    const expiresAtMillis = currentTime + 15 * 60 * 1000;
    const payment = {
      provider: 'VNPAY', planId: plan.id, amount: plan.price, currency: plan.currency,
      status: 'PENDING', transactionCode: txnRef, createdAt: serverTimestamp(),
      expiresAt: new Date(expiresAtMillis), paidAt: null,
    };

    await database.runTransaction(async (transaction) => {
      const [latestEntitlement, pending] = await Promise.all([
        transaction.get(entitlementRef), transaction.get(pendingRef),
      ]);
      const latestPlan = latestEntitlement.exists ? latestEntitlement.data() : null;
      if (isActivePaid(latestPlan) && planRank(latestPlan.planId) > planRank(plan.id)) {
        fail('failed-precondition', 'Không thể chuyển xuống gói thấp hơn khi gói hiện tại còn hạn.');
      }
      if (pending.exists && Number(pending.data().expiresAtMillis) > currentTime) {
        fail('failed-precondition', 'Bạn đã có một giao dịch thanh toán đang chờ xử lý.');
      }
      transaction.create(paymentRef, payment);
      transaction.create(transactionRef, {
        uid, paymentId: txnRef, planId: plan.id, amount: plan.price,
        currency: plan.currency, status: 'PENDING', expiresAtMillis,
        createdAt: serverTimestamp(),
      });
      transaction.set(pendingRef, { paymentId: txnRef, expiresAtMillis, updatedAt: serverTimestamp() });
    });

    return { paymentUrl, transactionCode: txnRef, planId: plan.id, amount: plan.price, expiresAt: new Date(expiresAtMillis) };
  }

  async function processVnpayCallback(params = {}) {
    if (!vnpay.isConfigured() || !vnpay.verifySignature(params)) {
      return { success: false, rspCode: '97', message: 'Invalid signature' };
    }
    const txnRef = typeof params.vnp_TxnRef === 'string' ? params.vnp_TxnRef : '';
    if (!txnRef || txnRef.length > 64 || txnRef.includes('/')) {
      return { success: false, rspCode: '01', message: 'Order not found' };
    }
    const config = vnpay.getConfig();
    if (config.tmnCode && params.vnp_TmnCode !== config.tmnCode) {
      return { success: false, rspCode: '97', message: 'Invalid signature' };
    }

    const transactionRef = database.doc(`_paymentTransactions/${txnRef}`);
    const indexSnapshot = await transactionRef.get();
    if (!indexSnapshot.exists) return { success: false, rspCode: '01', message: 'Order not found' };
    const uid = indexSnapshot.data().uid;
    if (typeof uid !== 'string' || !uid) return { success: false, rspCode: '01', message: 'Order not found' };

    const paymentRef = database.doc(`users/${uid}/payments/${txnRef}`);
    const entitlementRef = database.doc(`users/${uid}/entitlements/current`);
    const pendingRef = database.doc(`_pendingPaymentByUser/${uid}`);
    const expectedAmount = vnpay.amountToVnpAmount(indexSnapshot.data().amount);
    if (!params.vnp_Amount || String(params.vnp_Amount) !== expectedAmount) {
      await database.runTransaction(async (transaction) => {
        const [paymentSnapshot, latestIndex, pending] = await Promise.all([
          transaction.get(paymentRef), transaction.get(transactionRef), transaction.get(pendingRef),
        ]);
        if (!paymentSnapshot.exists || latestIndex.data()?.status !== 'PENDING') return;
        transaction.update(paymentRef, { status: 'FAILED', failureCode: 'AMOUNT_MISMATCH', updatedAt: serverTimestamp() });
        transaction.update(transactionRef, { status: 'FAILED', failureCode: 'AMOUNT_MISMATCH', updatedAt: serverTimestamp() });
        if (pending.data()?.paymentId === txnRef) transaction.delete(pendingRef);
      });
      return { success: false, rspCode: '04', message: 'Invalid amount' };
    }

    let outcome;
    await database.runTransaction(async (transaction) => {
      const [index, paymentSnapshot, entitlementSnapshot, pending] = await Promise.all([
        transaction.get(transactionRef), transaction.get(paymentRef),
        transaction.get(entitlementRef), transaction.get(pendingRef),
      ]);
      const access = await transaction.get(database.doc(`_accountAccess/${uid}`));
      if (access.exists && access.data().status !== 'active') {
        if (index.exists && index.data().status === 'PENDING') transaction.update(transactionRef, {
          status: 'REVIEW', failureCode: 'ACCOUNT_UNAVAILABLE',
          providerTransactionId: String(params.vnp_TransactionNo || '').slice(0, 100),
          providerResponseCode: String(params.vnp_ResponseCode || '').slice(0, 16), updatedAt: serverTimestamp() });
        outcome = { success: false, rspCode: '00', message: 'Payment requires manual review', status: 'REVIEW' };
        return;
      }
      if (!index.exists || !paymentSnapshot.exists) {
        outcome = { success: false, rspCode: '01', message: 'Order not found' };
        return;
      }
      const existing = paymentSnapshot.data();
      if (existing.status !== 'PENDING') {
        const success = existing.status === 'SUCCESS' || existing.status === 'REVIEW';
        outcome = { success, rspCode: '02', message: 'Order already confirmed', status: existing.status, planId: existing.planId };
        return;
      }

      const paid = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
      if (!paid) {
        transaction.update(paymentRef, { status: 'FAILED', failureCode: `VNPAY_${String(params.vnp_ResponseCode || 'UNKNOWN').slice(0, 16)}`, updatedAt: serverTimestamp() });
        transaction.update(transactionRef, { status: 'FAILED', updatedAt: serverTimestamp() });
        if (pending.data()?.paymentId === txnRef) transaction.delete(pendingRef);
        outcome = { success: false, rspCode: '00', message: 'Confirm Success', status: 'FAILED', planId: existing.planId };
        return;
      }

      const plan = PLANS_BY_ID.get(String(existing.planId).toUpperCase());
      if (!plan) {
        outcome = { success: false, rspCode: '99', message: 'Plan configuration error', status: 'REVIEW' };
        transaction.update(paymentRef, { status: 'REVIEW', failureCode: 'PLAN_NOT_FOUND', updatedAt: serverTimestamp() });
        transaction.update(transactionRef, { status: 'REVIEW', updatedAt: serverTimestamp() });
        if (pending.data()?.paymentId === txnRef) transaction.delete(pendingRef);
        return;
      }
      const currentEntitlement = entitlementSnapshot.exists ? entitlementSnapshot.data() : null;
      if (isActivePaid(currentEntitlement) && planRank(currentEntitlement.planId) > planRank(plan.id)) {
        transaction.update(paymentRef, { status: 'REVIEW', providerTransactionId: String(params.vnp_TransactionNo || '').slice(0, 100), failureCode: 'DOWNGRADE_REVIEW_REQUIRED', paidAt: serverTimestamp(), updatedAt: serverTimestamp() });
        transaction.update(transactionRef, { status: 'REVIEW', updatedAt: serverTimestamp() });
        if (pending.data()?.paymentId === txnRef) transaction.delete(pendingRef);
        outcome = { success: false, rspCode: '00', message: 'Payment received; manual review required', status: 'REVIEW', planId: plan.id };
        return;
      }

      const currentTime = now();
      const samePlanRenewal = isActivePaid(currentEntitlement, currentTime)
        && String(currentEntitlement.planId).toUpperCase() === plan.id;
      const expiryBase = samePlanRenewal ? timestampMillis(currentEntitlement.expiresAt) : currentTime;
      const expiresAt = new Date(expiryBase + plan.durationDays * DAY_MILLIS);
      transaction.set(entitlementRef, {
        planId: plan.id,
        status: 'ACTIVE',
        startsAt: samePlanRenewal ? currentEntitlement.startsAt || new Date(currentTime) : new Date(currentTime),
        expiresAt,
        tryOnLimit: plan.tryOnLimit,
        quotaPeriod: plan.quotaPeriod,
        wardrobeLimit: plan.wardrobeLimit,
        autoRenew: false,
        source: 'VNPAY',
        updatedAt: serverTimestamp(),
      });
      transaction.update(paymentRef, {
        status: 'SUCCESS',
        providerTransactionId: String(params.vnp_TransactionNo || '').slice(0, 100),
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.update(transactionRef, { status: 'SUCCESS', providerTransactionId: String(params.vnp_TransactionNo || '').slice(0, 100),
        paidAt: serverTimestamp(), updatedAt: serverTimestamp() });
      if (pending.data()?.paymentId === txnRef) transaction.delete(pendingRef);
      outcome = { success: true, rspCode: '00', message: 'Confirm Success', status: 'SUCCESS', planId: plan.id };
    });
    return outcome;
  }

  return { getPlans, getMyPlan, createVnpayPayment, processVnpayCallback };
}

module.exports = { createBillingService, PLAN_CATALOG };
