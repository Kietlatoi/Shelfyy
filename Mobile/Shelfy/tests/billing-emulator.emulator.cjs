const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { connectFunctionsEmulator, getFunctions, httpsCallable } = require('firebase/functions');
const { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-shelfy';
let app;
let auth;
let firestore;
let functions;

before(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    appId: `1:1234567890:android:billing-${Date.now()}`,
  }, `shelfy-billing-test-${Date.now()}`);
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  functions = getFunctions(app, 'asia-southeast1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await createUserWithEmailAndPassword(auth, `billing-${Date.now()}@example.test`, 'SafeTestPassword-123!');
});

after(async () => {
  await signOut(auth);
  await deleteApp(app);
});

test('subscription callables return the server catalog and create an owner-readable Free entitlement', async () => {
  const catalog = await httpsCallable(functions, 'getSubscriptionPlans')({});
  const current = await httpsCallable(functions, 'getMyEntitlement')({});
  assert.equal(catalog.data.purchaseEnabled, false);
  assert.equal(catalog.data.plans.find((plan) => plan.id === 'PRO').price, 99000);
  assert.equal(current.data.planId, 'FREE');
  assert.equal(current.data.quota.limit, 5);

  const entitlement = await getDoc(doc(firestore, 'users', auth.currentUser.uid, 'entitlements', 'current'));
  assert.equal(entitlement.data().planId, 'FREE');
  await assert.rejects(
    setDoc(doc(firestore, 'users', auth.currentUser.uid, 'entitlements', 'current'), { planId: 'PREMIUM' }),
    (error) => error.code === 'permission-denied'
  );
});

test('subscription callables reject an unauthenticated purchase-status request', async () => {
  const originalUser = auth.currentUser;
  await signOut(auth);
  await assert.rejects(
    httpsCallable(functions, 'getMyEntitlement')({}),
    (error) => error.code === 'functions/unauthenticated'
  );
  await signInWithEmailAndPassword(auth, originalUser.email, 'SafeTestPassword-123!');
});
