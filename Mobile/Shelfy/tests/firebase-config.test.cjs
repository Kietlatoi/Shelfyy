const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(file) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports });
  return exports;
}

const { resolveFirebaseConfig, resolveEmulatorHost } = loadModule('src/firebase/config.js');

test('Firebase config resolves public app identifiers and derives auth domain', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(resolveFirebaseConfig({
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'shelfy-demo',
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:123:android:abc',
      EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key',
    }))),
    {
      apiKey: 'demo-key',
      authDomain: 'shelfy-demo.firebaseapp.com',
      projectId: 'shelfy-demo',
      appId: '1:123:android:abc',
    }
  );
});

test('Firebase config rejects missing project identifiers with actionable names', () => {
  assert.throws(
    () => resolveFirebaseConfig({}),
    /EXPO_PUBLIC_FIREBASE_PROJECT_ID.*EXPO_PUBLIC_FIREBASE_APP_ID/
  );
});

test('emulator host uses Android emulator alias and supports a device override', () => {
  assert.equal(resolveEmulatorHost({}, 'android'), '10.0.2.2');
  assert.equal(resolveEmulatorHost({}, 'ios'), '127.0.0.1');
  assert.equal(resolveEmulatorHost({ EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '192.168.1.5' }, 'android'), '192.168.1.5');
});
