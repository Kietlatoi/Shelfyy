import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminSummary } from '../src/admin.js';
import { getAdminAnalytics } from '../src/admin-analytics.js';

test('summary distinguishes created orders, paid revenue, current users and missing activity', async () => {
  const now = new Date().toISOString();
  const paid = [{ id: 'p', data: { status: 'PAID', amountPaid: 69000, paidAt: now, createdAt: now, provider: 'PAYOS' } }, { id: 't', data: { status: 'PAID', amountPaid: 0, paidAt: now, createdAt: now, provider: 'GOOGLE_PLAY', isTest: true } }];
  const created = [...paid, { id: 'r', data: { status: 'REFUNDED', amountPaid: 599000, createdAt: now } }];
  const queries = [];
  const summary = await getAdminSummary({ ADMIN_UID: 'owner' }, new URL('https://test/?period=7d'), {
    runQuery: async (_, q) => JSON.stringify(q.where).includes('paidAt') ? paid : created,
    getDocument: async () => ({ data: { createdAt: now } }),
    countCollection: async () => 11,
    aggregateQuery: async (_, q, aggregations) => {
      queries.push(q);
      const collection = q.from[0].collectionId;
      if (collection === '_appReviews') return { total: 0 };
      if (collection === 'users') return { count: 4 };
      if (collection === 'tryOns') throw new Error('index unavailable');
      if (collection !== '_billingPayments') return { count: 2 };
      if (aggregations.length === 1) return { count: 3 };
      if (JSON.stringify(q.where).includes('"LESS_THAN"')) return { count: 1, revenue: 100000 };
      return { count: 2, revenue: 69000 };
    },
  });
  assert.equal(summary.revenue, 69000);
  assert.equal(summary.transactions, 3);
  assert.equal(summary.successfulTransactions, 2);
  assert.equal(summary.users, 10);
  assert.equal(summary.newUsers, 3);
  assert.equal(summary.previous.revenue, 100000);
  assert.equal(summary.activity.tryOns, null);
  assert.equal(summary.activity.wardrobe, 2);
  assert.equal(summary.ratings.average, null);
  assert.equal(summary.series.length, 7);
  assert.equal(summary.series.reduce((n, row) => n + row.revenue, 0), 69000);
  assert.equal(summary.series.reduce((n, row) => n + row.transactions, 0), 3);
  assert.equal(summary.revenueByProvider[1].revenue, 0);
  assert(queries.some((q) => q.from[0].allDescendants && JSON.stringify(q).includes('timestampValue')));
});

test('unconfigured GA4 returns an explicit setup state without contacting Google', async () => {
  assert.equal((await getAdminAnalytics({}, new URL('https://test/'), { getAccessToken: () => assert.fail() })).configured, false);
});

test('GA4 reports are fixed on server, use read-only scope and cache without returning tokens', async () => {
  let cached;
  let requests = 0;
  const env = { GA4_PROPERTY_ID: '123456', RATE_LIMITS: { get: async () => cached, put: async (_, value) => { cached = JSON.parse(value); } } };
  const result = await getAdminAnalytics(env, new URL('https://test/?period=7d'), {
    getAccessToken: async (_, scope) => { assert.equal(scope, 'https://www.googleapis.com/auth/analytics.readonly'); return 'private-token'; },
    fetchImpl: async (url, options) => {
      requests++;
      assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/123456:runReport');
      const request = JSON.parse(options.body);
      assert.equal(request.limit, '100');
      const dimension = request.dimensions[0]?.name;
      const rows = dimension === 'sessionSourceMedium' ? [{ dimensionValues: [{ value: 'facebook / social' }], metricValues: [{ value: '10' }, { value: '7' }] }] : dimension === 'eventName' ? [{ dimensionValues: [{ value: 'download_click' }], metricValues: [{ value: '4' }] }] : [{ metricValues: [{ value: '8' }, { value: '10' }, { value: '12' }] }];
      return new Response(JSON.stringify({ rows }));
    },
  });
  assert.equal(result.users, 8);
  assert.equal(result.sources[0].sessions, 10);
  assert.equal(result.downloadClicks, 4);
  assert(!JSON.stringify(result).includes('private-token'));
  assert.deepEqual(await getAdminAnalytics(env, new URL('https://test/?period=7d')), result);
  assert.equal(requests, 3);
});

test('GA4 authorization failures become a safe setup error', async () => {
  await assert.rejects(getAdminAnalytics({ GA4_PROPERTY_ID: '123' }, new URL('https://test'), {
    getAccessToken: async () => 'token', fetchImpl: async () => new Response('{}', { status: 403 }),
  }), { status: 503, code: 'GA4_UNAVAILABLE' });
});
