const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

const { code } = babel.transformFileSync(
  path.join(__dirname, '..', 'src/utils/ruleBasedStylist.js'),
  {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
);
const moduleExports = {};
Function('exports', code)(moduleExports);

test('stylist creates a weather-based suggestion without calendar context', () => {
  const result = moduleExports.generateStylingSuggestion({
    weather: { temperature: 31, feelsLike: 34, humidity: 80, weatherCode: 1 },
    wardrobeItems: [
      { id: 'top-1', name: 'Áo cotton trắng', category: 'TOP', itemStatus: 'IN_USE' },
      { id: 'bottom-1', name: 'Quần đen', category: 'BOTTOM', itemStatus: 'IN_USE' },
    ],
  });

  assert.equal(result.suggestion.occasion, 'Hôm nay');
  assert.match(result.suggestion.summary, /thời tiết và dữ liệu tủ đồ/);
  assert.doesNotMatch(result.suggestion.summary, /lịch trình|sự kiện/i);
});
