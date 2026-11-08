import assert from 'node:assert/strict';
import test from 'node:test';
import { sourcePie } from '../src/components/admin/sourcePie.js';

test('pie represents session proportions and omits zero-sized slices', () => {
  const pie = sourcePie([{ source: 'facebook', sessions: 3 }, { source: 'tiktok', sessions: 1 }, { source: 'direct', sessions: 0 }]);
  assert.equal(pie.total, 4);
  assert.deepEqual(pie.slices.map((row) => row.share), [75, 25, 0]);
  assert.equal(pie.background, 'conic-gradient(#8b5cf6 0% 75%, #06b6d4 75% 100%)');
  assert.equal(sourcePie([{ source: 'facebook', sessions: 22 }]).slices[0].share, 100);
});

test('pie handles empty reports without invalid percentages', () => {
  assert.equal(sourcePie([]).background, '#e2e8f0');
  assert.equal(sourcePie([{ source: 'facebook', sessions: 0 }]).slices[0].share, 0);
});
