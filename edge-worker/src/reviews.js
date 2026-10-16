import { aggregateQuery, commitWrites, deleteWrite, getDocument, query, runQuery, setWrite } from './firestore-rest.js';

function invalid(message, status = 400, code = 'INVALID_REVIEW') {
  return Object.assign(new Error(message), { status, code });
}

export function reviewWindow(period = '30d', now = new Date()) {
  if (period === 'all') return { start: null, end: now.toISOString(), previousStart: null };
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
  if (!days) throw invalid('Khoảng thời gian không hợp lệ.');
  const vn = new Date(now.getTime() + 7 * 3600000);
  const midnight = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600000;
  const start = midnight - (days - 1) * 86400000;
  return { start: new Date(start).toISOString(), end: now.toISOString(), previousStart: new Date(start - days * 86400000).toISOString() };
}

export function reviewQuery(url) {
  const period = url.searchParams.get('period') || '30d';
  const window = reviewWindow(period);
  const rating = url.searchParams.get('rating');
  if (rating && !/^[1-5]$/.test(rating)) throw invalid('Số sao phải từ 1 đến 5.');
  const filters = [];
  if (window.start) filters.push(query.fieldFilter('createdAt', 'GREATER_THAN_OR_EQUAL', window.start));
  filters.push(query.fieldFilter('createdAt', 'LESS_THAN_OR_EQUAL', window.end));
  if (rating) filters.push(query.fieldFilter('rating', 'EQUAL', Number(rating)));
  return { from: [{ collectionId: '_appReviews' }], where: query.and(...filters), orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }] };
}

export async function reviewStats(env, url, aggregate = aggregateQuery) {
  const unfiltered = new URL(url);
  unfiltered.searchParams.delete('rating');
  const structured = reviewQuery(unfiltered);
  const distribution = await Promise.all([1, 2, 3, 4, 5].map(async (rating) => {
    const { total } = await aggregate(env, { ...structured, where: query.and(structured.where, query.fieldFilter('rating', 'EQUAL', rating)) }, [{ alias: 'total', type: 'count' }]);
    return { rating, count: total };
  }));
  const total = distribution.reduce((sum, row) => sum + row.count, 0);
  return { total, average: total ? distribution.reduce((sum, row) => sum + row.rating * row.count, 0) / total : null, distribution };
}

export async function getAdminReviews(env, url, dependencies = {}) {
  const aggregate = dependencies.aggregateQuery || aggregateQuery;
  const run = dependencies.runQuery || runQuery;
  const pageValue = url.searchParams.get('page') || '0';
  if (!/^\d{1,5}$/.test(pageValue)) throw invalid('Trang không hợp lệ.');
  const page = Number(pageValue);
  if (page > 500) throw invalid('Vui lòng thu hẹp khoảng thời gian để xem lịch sử.');
  const structured = reviewQuery(url);
  const [stats, rows] = await Promise.all([
    reviewStats(env, url, aggregate),
    run(env, { ...structured, orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 20, offset: page * 20 }),
  ]);
  const rating = url.searchParams.get('rating');
  const matchedTotal = rating ? stats.distribution.find((row) => row.rating === Number(rating)).count : stats.total;
  return { ...stats, matchedTotal, page, size: 20, totalPages: Math.min(501, Math.ceil(matchedTotal / 20)), content: rows.map((row) => ({ id: row.id, ...row.data })) };
}

export async function getOwnReview(env, user) {
  const document = await getDocument(env, `_appReviews/${user.uid}`);
  return document ? { rating: document.data.rating, comment: document.data.comment, createdAt: document.data.createdAt } : null;
}

export async function submitReview(env, user, body, dependencies = {}) {
  if (user.uid === env.ADMIN_UID) throw invalid('Tài khoản quản trị không tham gia đánh giá.', 403, 'ADMIN_REVIEW_FORBIDDEN');
  if (!body || Object.keys(body).some((key) => !['rating', 'comment'].includes(key))
    || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5
    || typeof body.comment !== 'string' || body.comment.trim().length > 1000) throw invalid('Vui lòng chọn 1–5 sao và góp ý tối đa 1.000 ký tự.');
  const get = dependencies.getDocument || getDocument;
  const commit = dependencies.commitWrites || commitWrites;
  const path = `_appReviews/${user.uid}`;
  const [existing, profile] = await Promise.all([get(env, path), get(env, `users/${user.uid}`)]);
  if (existing) throw invalid('Bạn đã gửi đánh giá. Cảm ơn góp ý của bạn.', 409, 'REVIEW_EXISTS');
  if (!profile) throw invalid('Vui lòng hoàn tất hồ sơ trước khi đánh giá.', 403, 'PROFILE_REQUIRED');
  const fullName = typeof profile.data.fullName === 'string' ? profile.data.fullName.trim().slice(0, 120) : '';
  const review = { uid: user.uid, fullName, email: user.email || '', rating: body.rating, comment: body.comment.trim(), createdAt: new Date().toISOString(), source: 'SHELFY' };
  try { await commit(env, [setWrite(env, path, review, { exists: false })]); }
  catch (error) {
    if (error.code === 409 || error.status === 409 || /ALREADY_EXISTS/.test(error.message)) throw invalid('Bạn đã gửi đánh giá.', 409, 'REVIEW_EXISTS');
    throw error;
  }
  return { rating: review.rating, comment: review.comment, createdAt: review.createdAt };
}

export async function deleteOwnReview(env, user) {
  await commitWrites(env, [deleteWrite(env, `_appReviews/${user.uid}`)]);
}
