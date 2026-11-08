import { serviceAccountAccessToken } from './firestore-rest.js';
import { reviewWindow } from './reviews.js';

export async function getAdminAnalytics(env, url, dependencies = {}) {
  const period = url.searchParams.get('period') || '30d';
  const window = reviewWindow(period);
  const propertyId = String(env.GA4_PROPERTY_ID || '').trim();
  if (!/^\d+$/.test(propertyId)) return { configured: false, reason: 'Chưa kết nối Google Analytics 4. Cần tạo GA4 và cấp quyền đọc báo cáo cho Worker.' };
  const cacheKey = `admin:ga4:${propertyId}:${period}`;
  const cached = await env.RATE_LIMITS?.get(cacheKey, 'json');
  if (cached) return cached;
  const token = await (dependencies.getAccessToken || serviceAccountAccessToken)(env, 'https://www.googleapis.com/auth/analytics.readonly');
  const post = async (dimensions, metrics, extra = {}) => {
    const response = await (dependencies.fetchImpl || fetch)(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: window.start ? new Date(Date.parse(window.start) + 7 * 3600000).toISOString().slice(0, 10) : '2015-08-14', endDate: 'today' }],
        dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })),
        limit: '100', ...extra,
      }),
    });
    if (!response.ok) throw Object.assign(new Error('Không đọc được báo cáo GA4. Hãy kiểm tra Property ID, Analytics Data API và quyền Viewer của service account.'), { status: 503, code: 'GA4_UNAVAILABLE' });
    return response.json();
  };
  const [totals, sources, events] = await Promise.all([
    post([], ['totalUsers', 'sessions', 'screenPageViews']),
    post(['sessionSourceMedium'], ['sessions', 'engagedSessions'], { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
    post(['eventName'], ['eventCount'], { dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['download_click', 'download_unavailable'] } } } }),
  ]);
  const values = totals.rows?.[0]?.metricValues || [];
  const result = {
    configured: true, generatedAt: new Date().toISOString(), period, propertyId,
    users: Number(values[0]?.value || 0), sessions: Number(values[1]?.value || 0), views: Number(values[2]?.value || 0),
    sources: (sources.rows || []).map((row) => ({ source: row.dimensionValues[0].value, sessions: Number(row.metricValues[0].value), engagedSessions: Number(row.metricValues[1].value) })),
    sourcesLimited: Number(sources.rowCount || 0) > 100,
    downloadClicks: (events.rows || []).filter((row) => row.dimensionValues[0].value === 'download_click').reduce((sum, row) => sum + Number(row.metricValues[0].value), 0),
  };
  await env.RATE_LIMITS?.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });
  return result;
}
