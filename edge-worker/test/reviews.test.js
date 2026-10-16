import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminReviews, reviewQuery, reviewStats, reviewWindow, submitReview } from '../src/reviews.js';
import worker from '../src/index.js';

const env = { FIREBASE_PROJECT_ID: 'test-project', ADMIN_UID: 'owner' };
const user = { uid: 'user-1', email: 'user@example.com' };
const filters = (where) => where.compositeFilter ? where.compositeFilter.filters.flatMap(filters) : [where.fieldFilter];

test('review windows follow Vietnamese calendar days across UTC midnight', () => {
  const window = reviewWindow('7d', new Date('2026-10-14T18:00:00Z'));
  assert.equal(window.start, '2026-10-08T17:00:00.000Z');
  assert.equal(window.previousStart, '2026-10-01T17:00:00.000Z');
  assert.equal(reviewWindow('all').start, null);
  assert.throws(() => reviewWindow('365d'), { status: 400 });
  for (const rating of ['0', '6', '2.5', 'foo']) assert.throws(() => reviewQuery(new URL(`https://test/?rating=${rating}`)), { status: 400 });
});

test('reviews reject forged authors, invalid ratings and oversized comments before accessing storage', async () => {
  const dependencies = { getDocument: () => assert.fail('invalid input must not read data') };
  for (const body of [null, [], { rating: 0, comment: '' }, { rating: 6, comment: '' }, { rating: 3.5, comment: '' }, { rating: '5', comment: '' }, { rating: 5, comment: 'x'.repeat(1001) }, { rating: 5, comment: '', uid: 'other' }]) {
    await assert.rejects(submitReview(env, user, body, dependencies), { status: 400 });
  }
  await assert.rejects(submitReview(env, { uid: 'owner' }, { rating: 5, comment: '' }, dependencies), { status: 403 });
});

test('review creation uses authenticated identity and an atomic create-only write', async () => {
  let writes;
  const result = await submitReview(env, user, { rating: 4, comment: '  Rất hữu ích  ' }, {
    getDocument: async (_, path) => path.startsWith('users/') ? { data: { fullName: 'Người dùng' } } : null,
    commitWrites: async (_, value) => { writes = value; },
  });
  assert.equal(result.comment, 'Rất hữu ích');
  assert.equal(writes[0].update.name, 'projects/test-project/databases/(default)/documents/_appReviews/user-1');
  assert.deepEqual(writes[0].currentDocument, { exists: false });
  assert.equal(writes[0].update.fields.email.stringValue, user.email);
  assert.equal(writes[0].update.fields.uid.stringValue, user.uid);
  assert.equal(result.email, undefined);
});

test('duplicate, concurrent and missing-profile submissions do not overwrite another review', async () => {
  await assert.rejects(submitReview(env, user, { rating: 5, comment: '' }, { getDocument: async () => ({ data: {} }) }), { code: 'REVIEW_EXISTS' });
  await assert.rejects(submitReview(env, user, { rating: 5, comment: '' }, { getDocument: async () => null }), { code: 'PROFILE_REQUIRED' });
  await assert.rejects(submitReview(env, user, { rating: 5, comment: '' }, {
    getDocument: async (_, path) => path.startsWith('users/') ? { data: {} } : null,
    commitWrites: async () => { throw Object.assign(new Error('ALREADY_EXISTS'), { status: 409 }); },
  }), { code: 'REVIEW_EXISTS' });
});

test('a malformed profile name cannot put an object into the admin review table', async () => {
  let author;
  await submitReview(env, user, { rating: 3, comment: '' }, {
    getDocument: async (_, path) => path.startsWith('users/') ? { data: { fullName: { unsafe: true } } } : null,
    commitWrites: async (_, writes) => { author = writes[0].update.fields.fullName; },
  });
  assert.deepEqual(author, { stringValue: '' });
});

test('rating distribution uses all reviews in the period; history filter and pagination stay separate', async () => {
  const aggregateQuery = async (_, structured) => {
    const ratings = filters(structured.where).filter((v) => v.field.fieldPath === 'rating');
    assert.equal(ratings.length, 1);
    return { total: ratings[0].value.integerValue === '5' ? 21 : 1 };
  };
  const url = new URL('https://test/?period=30d&rating=5&page=1');
  let received;
  const result = await getAdminReviews(env, url, { aggregateQuery, runQuery: async (_, q) => { received = q; return [{ id: 'a', data: { rating: 5 } }]; } });
  assert.equal(result.total, 25);
  assert.equal(result.matchedTotal, 21);
  assert.equal(result.average, 4.6);
  assert.equal(result.totalPages, 2);
  assert.equal(received.offset, 20);
  assert.equal(received.limit, 20);
  assert.equal(filters(received.where).find((v) => v.field.fieldPath === 'rating').value.integerValue, '5');
  assert.equal((await reviewStats(env, url, async () => ({ total: 0 }))).average, null);
  await assert.rejects(getAdminReviews(env, new URL('https://test/?page=501')), { status: 400 });
});

test('reviews and analytics routes require authentication', async () => {
  for (const path of ['/v1/reviews/me', '/v1/admin/reviews', '/v1/admin/analytics']) {
    const response = await worker.fetch(new Request(`https://test${path}`), {});
    assert.equal(response.status, 401);
  }
});
