const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } = require('firebase/auth');
const { connectFunctionsEmulator, getFunctions, httpsCallable } = require('firebase/functions');

const PROJECT_ID = 'demo-shelfy';
let app;
let auth;
let functions;

before(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    appId: `1:1234567890:android:tryon-${Date.now()}`,
  }, `shelfy-tryon-test-${Date.now()}`);
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  functions = getFunctions(app, 'asia-southeast1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await createUserWithEmailAndPassword(auth, `tryon-${Date.now()}@example.test`, 'SafeTestPassword-123!');
});

after(async () => {
  await signOut(auth);
  await deleteApp(app);
});

test('try-on callable endpoints enforce authenticated ownership before provider access', async () => {
  const getStatus = httpsCallable(functions, 'getTryOnJobStatus');
  const setSaved = httpsCallable(functions, 'setTryOnJobSaved');
  const deleteJob = httpsCallable(functions, 'deleteTryOnJob');
  for (const operation of [
    () => getStatus({ jobId: 'missing-job' }),
    () => setSaved({ jobId: 'missing-job', saved: true }),
  ]) {
    await assert.rejects(operation(), (error) => error.code === 'functions/not-found');
  }
  assert.equal((await deleteJob({ jobId: 'missing-job' })).data.deleted, true);
});
