const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } = require('firebase/auth');
const { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, setDoc } = require('firebase/firestore');
const { connectFunctionsEmulator, getFunctions, httpsCallable } = require('firebase/functions');

const PROJECT_ID = 'demo-shelfy';
let app;
let auth;
let db;
let functions;

before(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    appId: `1:1234567890:android:outfit-${Date.now()}`,
  }, `shelfy-outfit-test-${Date.now()}`);
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  functions = getFunctions(app, 'asia-southeast1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await createUserWithEmailAndPassword(auth, `outfit-${Date.now()}@example.test`, 'SafeTestPassword-123!');
});

after(async () => {
  await signOut(auth);
  await deleteApp(app);
});

test('Firebase callable generates, loads and confirms a UID-owned outfit exactly once', async () => {
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'users', uid), {
    fullName: 'Shelfy test',
    email: auth.currentUser.email,
    timeZone: 'Asia/Ho_Chi_Minh',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const itemData = [
    { name: 'Áo cotton', category: 'TOP' },
    { name: 'Quần linen', category: 'BOTTOM' },
    { name: 'Giày', category: 'SHOES' },
  ];
  const itemIds = (await Promise.all(itemData.map((item) =>
    httpsCallable(functions, 'createWardrobeItem')({ ...item, favorite: false, status: 'IN_USE' })
  ))).map((result) => result.data.id);

  const generate = httpsCallable(functions, 'generateTodaySuggestion');
  const latest = httpsCallable(functions, 'getLatestTodaySuggestion');
  const confirm = httpsCallable(functions, 'confirmTodayDailyOutfit');
  const getToday = httpsCallable(functions, 'getTodayDailyOutfit');
  const requestId = `emulator-${Date.now()}-request`;
  const [firstResult, retryResult] = await Promise.all([
    generate({ requestId }),
    generate({ requestId }),
  ]);
  const suggestion = firstResult.data;
  assert.equal(retryResult.data.id, suggestion.id);
  assert.ok(suggestion.id);
  assert.ok(suggestion.items.length >= 2);
  assert.equal((await latest()).data.suggestion.id, suggestion.id);

  const selectedIds = suggestion.items.map((item) => item.id);
  const confirmed = (await confirm({
    itemIds: selectedIds,
    suggestionId: suggestion.id,
    name: suggestion.title,
    occasion: suggestion.occasion,
  })).data;
  assert.equal(confirmed.confirmed, true);
  assert.deepEqual(confirmed.itemIds, selectedIds);
  assert.deepEqual((await getToday()).data.itemIds, selectedIds);

  await confirm({ itemIds: selectedIds, suggestionId: suggestion.id });
  const itemSnapshots = await Promise.all(selectedIds.map((id) => getDoc(doc(db, 'users', uid, 'wardrobe', id))));
  assert.ok(itemSnapshots.every((snapshot) => snapshot.data().wearCount === 1));
  assert.equal((await getDoc(doc(db, 'users', uid, 'suggestions', suggestion.id))).data().status, 'CONFIRMED');

  await httpsCallable(functions, 'deleteWardrobeItem')({ itemId: selectedIds[0] });
  const historySnapshot = (await getToday()).data;
  assert.equal(historySnapshot.outfit.items.length, selectedIds.length);
  assert.equal(historySnapshot.outfit.items[0].id, selectedIds[0]);
});
