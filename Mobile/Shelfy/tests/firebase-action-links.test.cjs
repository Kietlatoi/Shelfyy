const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const { code: source } = babel.transformFileSync(path.join(__dirname, '..', 'src/firebase/actionLinks.js'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const moduleExports = {};
vm.runInNewContext(source, {
  exports: moduleExports,
  require: (name) => {
    assert.equal(name, 'firebase/auth');
    return require('firebase/auth');
  },
});

test('Firebase Hosting reset links provide their nested action code to the app', () => {
  const nested = 'https://shelfy-stage.firebaseapp.com/__/auth/action?apiKey=key&mode=resetPassword&oobCode=reset-code';
  const hostingLink = `https://shelfy-stage.firebaseapp.com/__/auth/links?link=${encodeURIComponent(nested)}`;
  assert.equal(moduleExports.getPasswordResetCode({ link: hostingLink }), 'reset-code');
});

test('password reset link resolver accepts a direct action URL and rejects other actions', () => {
  assert.equal(moduleExports.getPasswordResetCode({ oobCode: 'direct-code', mode: 'resetPassword' }), 'direct-code');
  const emailVerification = 'https://shelfy-stage.firebaseapp.com/__/auth/action?apiKey=key&mode=verifyEmail&oobCode=verify-code';
  assert.equal(moduleExports.getPasswordResetCode({ link: emailVerification }), null);
  assert.equal(moduleExports.getPasswordResetCode({}), null);
});
