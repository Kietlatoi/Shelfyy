const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const { initializeApp, deleteApp } = require('firebase/app');
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} = require('firebase/auth');
const { connectFirestoreEmulator, getFirestore } = require('firebase/firestore');

const PROJECT_ID = 'demo-shelfy';
let firebaseApp;
let auth;
let db;
let authApi;
let nextEmail = 1;

function loadAuthApi() {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', 'src/api/authApi.js'), {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const filename = path.join(__dirname, '..', 'src/api/authApi.js');
  const clientFilename = path.join(__dirname, '..', 'src/firebase/client.js');
  const priorClient = require.cache[clientFilename];
  require.cache[clientFilename] = {
    id: clientFilename,
    filename: clientFilename,
    loaded: true,
    exports: { auth, db },
  };
  try {
    const testModule = new Module(filename, module);
    testModule.filename = filename;
    testModule.paths = Module._nodeModulePaths(path.dirname(filename));
    testModule._compile(code, filename);
    return testModule.exports;
  } finally {
    if (priorClient) require.cache[clientFilename] = priorClient;
    else delete require.cache[clientFilename];
  }
}

function newEmail() {
  nextEmail += 1;
  return `shelfy-${Date.now()}-${nextEmail}@example.test`;
}

before(async () => {
  firebaseApp = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    appId: '1:1234567890:android:auth-test',
  }, `shelfy-auth-test-${Date.now()}`);
  auth = getAuth(firebaseApp);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  db = getFirestore(firebaseApp);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const authModule = loadAuthApi();
  authApi = authModule.createFirebaseAuthApi(auth, db, require('firebase/auth'), require('firebase/firestore'));
});

beforeEach(async () => {
  await signOut(auth);
});

after(async () => {
  await signOut(auth);
  await deleteApp(firebaseApp);
});

test('registration creates a Firebase account and a UID-owned profile', async () => {
  const email = newEmail();
  const result = await authApi.register({
    email,
    password: 'SafeTestPassword-123!',
    fullName: 'Mai Anh',
  });

  assert.equal(result.user.email, email);
  assert.equal(result.user.fullName, 'Mai Anh');
  assert.ok(result.user.uid);
  assert.equal(auth.currentUser.uid, result.user.uid);
});

test('login creates a missing profile for a newly authenticated account', async () => {
  const email = newEmail();
  await createUserWithEmailAndPassword(auth, email, 'SafeTestPassword-123!');
  await signOut(auth);

  const result = await authApi.login({ email, password: 'SafeTestPassword-123!' });

  assert.equal(result.user.email, email);
  assert.equal(result.user.fullName, email.split('@')[0]);
  assert.equal(auth.currentUser.uid, result.user.uid);
});

test('logout clears the active Firebase session', async () => {
  await authApi.register({
    email: newEmail(),
    password: 'SafeTestPassword-123!',
    fullName: 'Mai Anh',
  });

  await authApi.logout();

  assert.equal(auth.currentUser, null);
});
