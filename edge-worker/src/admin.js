import { reconcilePaymentByOrderCode } from './billing.js';
import {
  aggregateQuery,
  batchGetDocuments,
  commitWrites,
  countCollection,
  getDocument,
  query,
  runQuery,
  serviceAccountAccessToken,
  setWrite,
} from './firestore-rest.js';

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const PAYMENT_STATUSES = new Set(['CREATING', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW', 'REFUNDED']);
const PAGE_SIZE = 20;
const CSV_LIMIT = 10000;

function apiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value || value.startsWith('your-')) throw apiError(503, 'SERVER_NOT_CONFIGURED', `Worker chưa được cấu hình biến ${name}.`);
  return value;
}

function periodFromUrl(url) {
  const period = url.searchParams.get('period') || '30d';
  if (period !== 'all' && !PERIOD_DAYS[period]) throw apiError(400, 'INVALID_PERIOD', 'Khoảng thời gian không hợp lệ.');
  return period;
}

function cutoffFor(period) {
  if (period === 'all') return null;
  const now = new Date();
  const vietnamNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  vietnamNow.setHours(0, 0, 0, 0);
  vietnamNow.setDate(vietnamNow.getDate() - PERIOD_DAYS[period] + 1);
  return new Date(vietnamNow.getTime() - 7 * 60 * 60 * 1000).toISOString();
}

function paymentFields(document) {
  const value = document.data;
  return {
    orderCode: String(value.orderCode || document.id),
    uid: value.uid || null,
    buyerEmail: value.buyerEmail || null,
    planId: value.planId || '',
    planName: value.planName || value.planId || '',
    price: Number(value.price || 0),
    amountPaid: Number(value.amountPaid || 0),
    currency: value.currency || 'VND',
    status: value.status || 'FAILED',
    paymentLinkId: value.paymentLinkId || null,
    providerReference: value.providerReference || null,
    createdAt: value.createdAt || document.createTime,
    expiresAt: value.expiresAt || null,
    paidAt: value.paidAt || null,
    cancelledAt: value.cancelledAt || null,
    updatedAt: value.updatedAt || document.updateTime,
    failureCode: value.failureCode || null,
  };
}

function paymentWhere({ cutoff, status, timeField = 'createdAt' }) {
  const filters = [];
  if (status) filters.push(query.fieldFilter('status', 'EQUAL', status));
  if (cutoff) filters.push(query.fieldFilter(timeField, 'GREATER_THAN_OR_EQUAL', cutoff));
  if (filters.length === 0) return undefined;
  return filters.length === 1 ? filters[0] : query.and(...filters);
}

function paymentQuery({ cutoff, status, limit = 10000, offset = 0, timeField = 'createdAt', direction = 'DESCENDING' }) {
  const structured = {
    from: [{ collectionId: '_billingPayments' }],
    orderBy: [{ field: { fieldPath: timeField }, direction }],
    limit,
  };
  const where = paymentWhere({ cutoff, status, timeField });
  if (where) structured.where = where;
  if (offset) structured.offset = offset;
  return structured;
}

function dateKey(value, monthly) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    ...(monthly ? {} : { day: '2-digit' }),
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return monthly ? `${parts.year}-${parts.month}` : `${parts.year}-${parts.month}-${parts.day}`;
}

function groupSeries(transactions, paid, monthly) {
  const buckets = new Map();
  const ensure = (key) => {
    if (!buckets.has(key)) buckets.set(key, { label: key, revenue: 0, transactions: 0 });
    return buckets.get(key);
  };
  for (const payment of transactions) {
    const key = dateKey(payment.data.createdAt || payment.createTime, monthly);
    if (key) ensure(key).transactions += 1;
  }
  for (const payment of paid) {
    const key = dateKey(payment.data.paidAt || payment.data.updatedAt, monthly);
    if (key) ensure(key).revenue += Number(payment.data.amountPaid || 0);
  }
  return [...buckets.values()].sort((left, right) => left.label.localeCompare(right.label));
}

async function writeAudit(env, admin, action, target, details = {}) {
  const createdAt = new Date().toISOString();
  const id = `${Date.now()}_${crypto.randomUUID()}`;
  await commitWrites(env, [setWrite(env, `_adminAuditEvents/${id}`, {
    adminUid: admin.uid,
    adminEmail: admin.email || '',
    action,
    target,
    details,
    createdAt,
  }, { exists: false })]);
}

export function assertAdmin(env, user) {
  if (user.uid !== required(env, 'ADMIN_UID')) throw apiError(403, 'ADMIN_REQUIRED', 'Tài khoản không có quyền quản trị.');
  return user;
}

export function getAdminMe(user) {
  return { uid: user.uid, email: user.email, role: 'OWNER' };
}

export async function getAdminSummary(env, url) {
  const period = periodFromUrl(url);
  const cutoff = cutoffFor(period);
  const transactionQuery = paymentQuery({ cutoff, limit: 10000 });
  const paidQuery = paymentQuery({ cutoff, status: 'PAID', timeField: 'paidAt', limit: 10000 });
  const transactionAggregateQuery = paymentQuery({ cutoff });
  const paidAggregateQuery = paymentQuery({ cutoff, status: 'PAID', timeField: 'paidAt' });
  delete transactionAggregateQuery.limit;
  delete transactionAggregateQuery.orderBy;
  delete paidAggregateQuery.limit;
  delete paidAggregateQuery.orderBy;
  const [transactions, paid, transactionTotals, paidTotals, totalUsers, adminProfile] = await Promise.all([
    runQuery(env, transactionQuery),
    runQuery(env, paidQuery),
    aggregateQuery(env, transactionAggregateQuery, [{ type: 'count', alias: 'count' }]),
    aggregateQuery(env, paidAggregateQuery, [
      { type: 'count', alias: 'count' },
      { type: 'sum', alias: 'revenue', fieldPath: 'amountPaid' },
    ]),
    countCollection(env, 'users'),
    getDocument(env, `users/${required(env, 'ADMIN_UID')}`),
  ]);
  return {
    period,
    revenue: paidTotals.revenue,
    users: Math.max(0, totalUsers - (adminProfile ? 1 : 0)),
    transactions: transactionTotals.count,
    successfulTransactions: paidTotals.count,
    series: groupSeries(transactions, paid, period === 'all'),
    recentPayments: transactions.slice(0, 10).map(paymentFields),
  };
}

async function userDetails(env, profile, snapshots) {
  const uid = profile.id;
  const [access, entitlement] = snapshots || await batchGetDocuments(env, [
      `_accountAccess/${uid}`,
      `users/${uid}/entitlements/current`,
    ]);
  const [wardrobeCount, payments] = await Promise.all([
    countCollection(env, 'wardrobe', `users/${uid}`),
    runQuery(env, { from: [{ collectionId: 'payments' }], limit: 500 }, `users/${uid}`),
  ]);
  return {
    uid,
    fullName: profile.data.fullName || '',
    email: profile.data.email || '',
    createdAt: profile.data.createdAt || profile.createTime,
    updatedAt: profile.data.updatedAt || profile.updateTime,
    status: access?.data.status === 'locked' ? 'locked' : 'active',
    planId: entitlement?.data.planId || 'FREE',
    planExpiresAt: entitlement?.data.expiresAt || null,
    wardrobeCount,
    paymentCount: payments.length,
    totalPaid: payments.reduce((sum, payment) => (
      payment.data.status === 'PAID' ? sum + Number(payment.data.amountPaid || 0) : sum
    ), 0),
  };
}

export async function getAdminUsers(env, url) {
  const page = Math.max(0, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const size = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('size') || String(PAGE_SIZE), 10) || PAGE_SIZE));
  const search = String(url.searchParams.get('q') || '').trim();
  const adminUid = required(env, 'ADMIN_UID');
  let profiles;
  if (search) {
    const byUid = /^[A-Za-z0-9_-]{1,128}$/.test(search)
      ? await getDocument(env, `users/${search}`).catch(() => null)
      : null;
    profiles = byUid ? [byUid] : await runQuery(env, {
      from: [{ collectionId: 'users' }],
      where: query.fieldFilter('email', 'EQUAL', search.toLowerCase()),
      limit: 1,
    });
  } else {
    profiles = await runQuery(env, {
      from: [{ collectionId: 'users' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 10000,
    });
  }
  profiles = profiles.filter((profile) => profile.id !== adminUid);
  const total = profiles.length;
  if (!search) profiles = profiles.slice(page * size, (page + 1) * size);
  const snapshots = profiles.length
    ? await batchGetDocuments(env, profiles.flatMap((profile) => [
      `_accountAccess/${profile.id}`,
      `users/${profile.id}/entitlements/current`,
    ]))
    : [];
  const content = await Promise.all(profiles.map((profile, index) => userDetails(env, profile, [
      snapshots[index * 2],
      snapshots[index * 2 + 1],
    ])));
  const effectiveTotal = search ? content.length : total;
  return {
    content,
    page,
    size,
    totalElements: effectiveTotal,
    totalPages: search ? (content.length ? 1 : 0) : Math.ceil(effectiveTotal / size),
  };
}

export async function getAdminUser(env, uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || uid === required(env, 'ADMIN_UID')) {
    throw apiError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  }
  const profile = await getDocument(env, `users/${uid}`);
  if (!profile) throw apiError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  return userDetails(env, profile);
}

async function updateFirebaseDisabled(env, uid, disabled) {
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const apiKey = required(env, 'FIREBASE_API_KEY');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await serviceAccountAccessToken(env)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      localId: uid,
      disableUser: disabled,
      validSince: String(Math.floor(Date.now() / 1000)),
      targetProjectId: projectId,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.localId !== uid) throw apiError(502, 'FIREBASE_ACCESS_UPDATE_FAILED', 'Không thể cập nhật trạng thái Firebase Authentication.');
}

export async function updateAdminUserAccess(env, admin, uid, body) {
  if (uid === required(env, 'ADMIN_UID')) throw apiError(400, 'OWNER_PROTECTED', 'Không thể khóa tài khoản chủ sở hữu.');
  const status = String(body?.status || '');
  if (!['active', 'locked'].includes(status)) throw apiError(400, 'INVALID_STATUS', 'Trạng thái tài khoản không hợp lệ.');
  const profile = await getDocument(env, `users/${uid}`);
  if (!profile) throw apiError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  const now = new Date().toISOString();
  const accessPath = `_accountAccess/${uid}`;
  const existing = await getDocument(env, accessPath);
  const access = { status, updatedAt: now, updatedBy: admin.uid };
  if (status === 'locked') {
    await commitWrites(env, [setWrite(env, accessPath, access, existing ? { updateTime: existing.updateTime } : { exists: false })]);
    await updateFirebaseDisabled(env, uid, true);
  } else {
    await updateFirebaseDisabled(env, uid, false);
    await commitWrites(env, [setWrite(env, accessPath, access, existing ? { updateTime: existing.updateTime } : { exists: false })]);
  }
  await writeAudit(env, admin, status === 'locked' ? 'USER_LOCKED' : 'USER_UNLOCKED', uid);
  return { uid, status };
}

function paymentFilters(url) {
  const period = periodFromUrl(url);
  const status = String(url.searchParams.get('status') || '').toUpperCase();
  if (status && !PAYMENT_STATUSES.has(status)) throw apiError(400, 'INVALID_STATUS', 'Trạng thái giao dịch không hợp lệ.');
  return { period, status: status || null, cutoff: cutoffFor(period) };
}

export async function getAdminPayments(env, url) {
  const { period, status, cutoff } = paymentFilters(url);
  const page = Math.max(0, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const size = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('size') || String(PAGE_SIZE), 10) || PAGE_SIZE));
  const structuredQuery = paymentQuery({ cutoff, status, limit: size, offset: page * size });
  const aggregateBase = paymentQuery({ cutoff, status });
  delete aggregateBase.limit;
  delete aggregateBase.orderBy;
  const [documents, aggregate] = await Promise.all([
    runQuery(env, structuredQuery),
    aggregateQuery(env, aggregateBase, [{ type: 'count', alias: 'total' }]),
  ]);
  return {
    content: documents.map(paymentFields),
    page,
    size,
    period,
    status,
    totalElements: aggregate.total,
    totalPages: Math.ceil(aggregate.total / size),
  };
}

export async function getAdminPayment(env, orderCode) {
  if (!/^\d{10,16}$/.test(orderCode)) throw apiError(400, 'INVALID_ORDER_CODE', 'Mã đơn hàng không hợp lệ.');
  const payment = await getDocument(env, `_billingPayments/${orderCode}`);
  if (!payment) throw apiError(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch.');
  return paymentFields(payment);
}

export async function reconcileAdminPayment(env, admin, orderCode) {
  const payment = await reconcilePaymentByOrderCode(env, orderCode);
  await writeAudit(env, admin, 'PAYMENT_RECONCILED', orderCode, { status: payment.status });
  return paymentFields({ id: orderCode, data: payment });
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportAdminPayments(env, admin, url) {
  const { period, status, cutoff } = paymentFilters(url);
  const documents = await runQuery(env, paymentQuery({ cutoff, status, limit: CSV_LIMIT + 1 }));
  if (documents.length > CSV_LIMIT) throw apiError(413, 'EXPORT_TOO_LARGE', 'Báo cáo vượt quá 10.000 giao dịch. Vui lòng chọn khoảng thời gian ngắn hơn.');
  const header = ['Mã đơn', 'UID', 'Email', 'Gói', 'Giá', 'Đã thanh toán', 'Tiền tệ', 'Trạng thái', 'PayOS payment link ID', 'Mã tham chiếu', 'Ngày tạo', 'Ngày thanh toán', 'Ngày cập nhật'];
  const rows = documents.map((document) => {
    const payment = paymentFields(document);
    return [payment.orderCode, payment.uid, payment.buyerEmail, payment.planId, payment.price, payment.amountPaid,
      payment.currency, payment.status, payment.paymentLinkId, payment.providerReference, payment.createdAt,
      payment.paidAt, payment.updatedAt].map(csvCell).join(',');
  });
  await writeAudit(env, admin, 'PAYMENTS_EXPORTED', `${period}:${status || 'ALL'}`, { count: documents.length });
  return new Response(`\uFEFF${[header.map(csvCell).join(','), ...rows].join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="shelfy-payments-${period}.csv"`,
    },
  });
}
