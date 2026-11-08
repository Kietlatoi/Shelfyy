const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const { code } = babel.transformFileSync(path.join(__dirname, '../src/constants/colors.js'), {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject });

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('brand text and action colors remain readable in both palettes', () => {
  for (const palette of [exportsObject.colors, exportsObject.darkColors]) {
    const pairs = [
      ['onSurface', 'background'], ['onSurfaceMedium', 'surface'],
      ['onSurfaceVariant', 'background'], ['onSurfaceVariant', 'surface'],
      ['onPrimaryContainer', 'primaryContainer'], ['onPrimary', 'primary'],
      ['onSecondary', 'secondary'], ['onAccent', 'accent'],
    ];
    for (const [text, background] of pairs) {
      const a = luminance(palette[text]);
      const b = luminance(palette[background]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= 4.5, `${text} on ${background}: ${ratio.toFixed(2)}:1`);
    }
  }
});
