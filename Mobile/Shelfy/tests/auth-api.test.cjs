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

test('password reset requests and completes a five-digit code through the Worker', async () => {
  const calls = [];
  const authModule = loadModule('src/api/authApi.js', {
    'firebase/auth': {
      EmailAuthProvider: {}, onAuthStateChanged() {}, reauthenticateWithCredential() {},
      signInWithEmailAndPassword() {}, signOut() {}, updatePassword() {}, updateProfile() {},
    },
    'firebase/firestore': { doc() {}, getDoc() {}, serverTimestamp() {}, setDoc() {}, updateDoc() {} },
    '../firebase/client': { auth: {}, db: {} },
    './edgeApi': { edgePublicRequest() {}, edgeRequest() {} },
  });
  const authApi = authModule.createFirebaseAuthApi({}, {}, {}, {}, {
    publicRequest: async (path, options) => {
      calls.push({ path, body: options.body });
      return path.endsWith('codes')
        ? { challengeId: 'challenge-1', resendAfterSeconds: 60 }
        : { updated: true };
    },
  });

  const challenge = await authApi.forgotPassword(' owner@example.com ');
  await authApi.resetPassword({
    email: 'owner@example.com',
    challengeId: challenge.challengeId,
    code: '12345',
    newPassword: 'NewPassword-123!',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { path: '/v1/auth/password-reset-codes', body: { email: 'owner@example.com' } },
    {
      path: '/v1/auth/password-resets',
      body: {
        email: 'owner@example.com', challengeId: 'challenge-1',
        code: '12345', newPassword: 'NewPassword-123!',
      },
    },
  ]);
});

test('registration asks Worker to verify the code before signing in to Firebase', async () => {
  const calls = [];
  const firebaseUser = { uid: 'uid-1', email: 'mai@example.com', displayName: 'Mai Anh' };
  const authModule = loadModule('src/api/authApi.js', {
    'firebase/auth': {
      EmailAuthProvider: {}, onAuthStateChanged() {}, reauthenticateWithCredential() {},
      sendPasswordResetEmail() {}, signInWithEmailAndPassword() {}, signOut() {},
      updatePassword() {}, updateProfile() {}, verifyPasswordResetCode() {}, confirmPasswordReset() {},
    },
    'firebase/firestore': { doc() {}, getDoc() {}, serverTimestamp() {}, setDoc() {}, updateDoc() {} },
    '../firebase/client': { auth: {}, db: {} },
    './edgeApi': { edgePublicRequest() {}, edgeRequest() {} },
  });
  const api = authModule.createFirebaseAuthApi({}, {}, {
    signInWithEmailAndPassword: async () => {
      calls.push('firebase-sign-in');
      return { user: firebaseUser };
    },
    signOut: async () => {},
    updateProfile: async () => {},
  }, {
    doc: () => 'profile-ref',
    getDoc: async () => ({ exists: () => false }),
    serverTimestamp: () => 'timestamp',
    setDoc: async () => {},
  }, {
    publicRequest: async (path, options) => {
      calls.push(path);
      assert.equal(options.body.code, '12345');
      return { created: true, uid: 'uid-1' };
    },
  });

  await api.register({
    email: 'mai@example.com',
    password: 'SafePassword-123!',
    fullName: 'Mai Anh',
    challengeId: 'challenge-id',
    code: '12345',
  });

  assert.deepEqual(calls, ['/v1/auth/registrations', 'firebase-sign-in']);
});
