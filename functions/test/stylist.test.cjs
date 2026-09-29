const { test } = require('node:test');
const assert = require('node:assert/strict');
const stylist = require('../ruleBasedStylist');

function context(overrides = {}) {
  return {
    date: '2026-09-26',
    timeZone: 'Asia/Ho_Chi_Minh',
    weather: { temperature: 33, feelsLike: 35, humidity: 80, condition: 'Trời quang', location: 'Hồ Chí Minh' },
    events: [{ title: 'Họp khách hàng', startTime: '09:00', location: 'Văn phòng' }],
    wardrobeItems: [
      { id: 'top-linen', name: 'Áo sơ mi linen trắng', category: 'TOP', material: 'linen', color: 'trắng', itemStatus: 'IN_USE', wearCount: 1 },
      { id: 'bottom-black', name: 'Quần tây đen', category: 'BOTTOM', material: 'cotton', color: 'đen', itemStatus: 'IN_USE', wearCount: 2 },
      { id: 'shoe-loafer', name: 'Giày loafer da', category: 'SHOES', material: 'da', itemStatus: 'IN_USE', wearCount: 1 },
      { id: 'top-cotton', name: 'Áo polo cotton', category: 'TOP', material: 'cotton', color: 'navy', itemStatus: 'IN_USE', wearCount: 2 },
    ],
    recentItemIds: [],
    previousSuggestionItemIds: [],
    ...overrides,
  };
}

test('rule-based stylist keeps Firestore string IDs and creates a unique outfit', () => {
  const generated = stylist.generateStylingSuggestion(context());
  const itemIds = generated.suggestion.items.map((item) => item.itemId);

  assert.equal(generated.modelName, 'rule-based-v1');
  assert.ok(generated.suggestion.items.length >= 2);
  assert.ok(itemIds.every((id) => typeof id === 'string' && id.length > 0));
  assert.equal(new Set(itemIds).size, itemIds.length);
  assert.ok(generated.suggestion.reason.includes('thời tiết'));
});

test('recent Firestore string IDs receive the existing rotation penalty', () => {
  const baseline = stylist.generateStylingSuggestion(context());
  const recent = stylist.generateStylingSuggestion(context({ recentItemIds: ['top-linen'] }));

  assert.ok(baseline.suggestion.items.some((item) => item.itemId === 'top-linen'));
  assert.ok(recent.suggestion.items.some((item) => item.itemId === 'top-cotton'));
});

test('empty closets fail with the existing wardrobe error code', () => {
  assert.throws(() => stylist.generateStylingSuggestion(context({ wardrobeItems: [] })), { code: 'WARDROBE_CONTEXT_EMPTY' });
});
