import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsDemo } from '../src/components/admin/analyticsDemo.js';

test('demo represents nine fictional visitors with consistent source totals', () => {
  const data = analyticsDemo();
  assert.equal(data.demo, true);
  assert.equal(data.users, 9);
  assert.equal(new Set(data.visitors.map((row) => row.id)).size, 9);
  assert.equal(data.sessions, 22);
  assert.deepEqual(data.sources.map((row) => row.sessions), [22, 0, 0, 0]);
  assert.deepEqual(data.sources.map((row) => row.engagedSessions), [16, 0, 0, 0]);
  assert.ok(data.visitors.every((row) => row.source === 'facebook / social'));
  assert.equal(data.views, 48);
  assert.equal(data.downloadClicks, 7);
  assert.equal(data.sources.reduce((sum, row) => sum + row.sessions, 0), data.sessions);
  assert.ok(data.sources.every((row) => row.engagedSessions <= row.sessions));
});

test('seven-day filter excludes older visitors and does not mutate the full sample', () => {
  assert.equal(analyticsDemo('7d').users, 5);
  assert.equal(analyticsDemo('7d').sessions, 15);
  assert.equal(analyticsDemo('all').users, 9);
  assert.equal(analyticsDemo('90d').sessions, 22);
});
