const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(file, mocks, environment = {}) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env: environment },
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

test('password reset requests an Android App Link for the configured Firebase Hosting domain', async () => {
  let sent;
  const authModule = loadModule('src/api/authApi.js', {
    'firebase/auth': {
      EmailAuthProvider: {}, createUserWithEmailAndPassword() {}, onAuthStateChanged() {},
      reauthenticateWithCredential() {}, sendPasswordResetEmail() {}, signInWithEmailAndPassword() {},
      signOut() {}, updatePassword() {}, updateProfile() {}, verifyPasswordResetCode() {}, confirmPasswordReset() {},
    },
    'firebase/firestore': { doc() {}, getDoc() {}, serverTimestamp() {}, setDoc() {}, updateDoc() {} },
    'firebase/functions': { httpsCallable() {} },
    '../firebase/client': { auth: {}, db: {} },
  }, {
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'shelfy-stage',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'shelfy-stage.firebaseapp.com',
  });
  const authApi = authModule.createFirebaseAuthApi({}, {}, {
    sendPasswordResetEmail: async (...args) => { sent = args; },
  }, {});

  await authApi.forgotPassword(' owner@example.com ');

  assert.equal(sent[1], 'owner@example.com');
  assert.deepEqual(JSON.parse(JSON.stringify(sent[2])), {
    url: 'https://shelfy-stage.firebaseapp.com',
    android: { packageName: 'com.shelfy.app', installApp: false },
    handleCodeInApp: true,
  });
});

test('password reset can select a custom Firebase Hosting link domain', async () => {
  let settings;
  const authModule = loadModule('src/api/authApi.js', {
    'firebase/auth': {
      EmailAuthProvider: {}, createUserWithEmailAndPassword() {}, onAuthStateChanged() {},
      reauthenticateWithCredential() {}, sendPasswordResetEmail() {}, signInWithEmailAndPassword() {},
      signOut() {}, updatePassword() {}, updateProfile() {}, verifyPasswordResetCode() {}, confirmPasswordReset() {},
    },
    'firebase/firestore': { doc() {}, getDoc() {}, serverTimestamp() {}, setDoc() {}, updateDoc() {} },
    'firebase/functions': { httpsCallable() {} },
    '../firebase/client': { auth: {}, db: {} },
  }, {
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'shelfy-stage',
    EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN: 'links.shelfy.app',
  });
  const authApi = authModule.createFirebaseAuthApi({}, {}, {
    sendPasswordResetEmail: async (_auth, _email, actionCodeSettings) => { settings = actionCodeSettings; },
  }, {});

  await authApi.forgotPassword('owner@example.com');
  assert.equal(settings.linkDomain, 'links.shelfy.app');
  assert.equal(settings.url, 'https://shelfy-stage.firebaseapp.com');
});
