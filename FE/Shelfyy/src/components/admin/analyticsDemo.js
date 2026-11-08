// Fictional visitors; never sent to Firebase or GA4.
const visitors = [
  { id: 'KH-001', source: 'facebook / social', daysAgo: 0, sessions: 6, views: 7, engagedSessions: 5, downloadClicks: 1 },
  { id: 'KH-002', source: 'facebook / social', daysAgo: 1, sessions: 2, views: 6, engagedSessions: 1, downloadClicks: 1 },
  { id: 'KH-003', source: 'facebook / social', daysAgo: 2, sessions: 2, views: 8, engagedSessions: 1, downloadClicks: 1 },
  { id: 'KH-004', source: 'facebook / social', daysAgo: 4, sessions: 1, views: 3, engagedSessions: 1, downloadClicks: 0 },
  { id: 'KH-005', source: 'facebook / social', daysAgo: 6, sessions: 4, views: 5, engagedSessions: 3, downloadClicks: 1 },
  { id: 'KH-006', source: 'facebook / social', daysAgo: 10, sessions: 1, views: 7, engagedSessions: 1, downloadClicks: 1 },
  { id: 'KH-007', source: 'facebook / social', daysAgo: 15, sessions: 1, views: 4, engagedSessions: 1, downloadClicks: 1 },
  { id: 'KH-008', source: 'facebook / social', daysAgo: 21, sessions: 4, views: 5, engagedSessions: 3, downloadClicks: 1 },
  { id: 'KH-009', source: 'facebook / social', daysAgo: 28, sessions: 1, views: 3, engagedSessions: 0, downloadClicks: 0 },
];

export function analyticsDemo(period = '30d') {
  const days = { '7d': 7, '30d': 30, '90d': 90, all: Infinity }[period] ?? 30;
  const content = visitors.filter((row) => row.daysAgo < days);
  const sources = ['facebook / social', 'tiktok / social', 'google / organic', '(direct) / (none)']
    .map((source) => ({ source, sessions: 0, engagedSessions: 0 }));
  const result = { configured: true, demo: true, period, users: content.length, sessions: 0, views: 0, downloadClicks: 0, sources, visitors: content };
  for (const visitor of content) {
    for (const key of ['sessions', 'views', 'downloadClicks']) result[key] += visitor[key];
    let source = sources.find((row) => row.source === visitor.source);
    if (!source) {
      source = { source: visitor.source, sessions: 0, engagedSessions: 0 };
      sources.push(source);
    }
    source.sessions += visitor.sessions;
    source.engagedSessions += visitor.engagedSessions;
  }
  sources.sort((a, b) => b.sessions - a.sessions);
  return result;
}
