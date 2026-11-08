const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const file = path.join(__dirname, '../app/_layout.jsx');
const { code } = babel.transformFileSync(file, {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});

function layout(fontState) {
  const mocks = {
    react: { createElement: (type, props, ...children) => ({ type, props, children }) },
    'expo-router': { Slot: 'Slot' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
    'react-native': { StyleSheet: { create: value => value } },
    'expo-font': { useFonts: fonts => { assert.equal(Object.keys(fonts).length, 4); return fontState; } },
    '../src/constants/colors': { colors: {} },
    '../src/contexts/AuthContext': { AuthProvider: 'AuthProvider' },
    '../src/contexts/GooglePlayBillingContext': { GooglePlayBillingProvider: 'BillingProvider' },
  };
  const result = {};
  vm.runInNewContext(code, { exports: result, require(name) {
    if (name.endsWith('.ttf')) {
      const font = fs.readFileSync(path.resolve(path.dirname(file), name));
      assert.equal(font.readUInt32BE(0), 0x00010000, 'local font must be a valid TrueType asset');
      return name;
    }
    assert.ok(Object.hasOwn(mocks, name), name);
    return mocks[name];
  } });
  return result.default();
}

test('app waits for bundled fonts before mounting its authenticated routes', () => {
  assert.equal(layout([false, null]), null);
  assert.equal(layout([true, null]).children[0].children[0].type, 'AuthProvider');
});

test('a font loading error does not block access to the app', () => {
  assert.equal(layout([false, new Error('font unavailable')]).type, 'GestureHandlerRootView');
});
