const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } = require('firebase-admin/app');
const { getFirestore: getAdminFirestore, FieldValue } = require('firebase-admin/firestore');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');
const { createMediaService } = require('../media');

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const admin = initializeAdmin({ projectId: 'demo-shelfy' }, 'lifecycle-admin');
const db = getAdminFirestore(admin);
const app = initializeApp({ projectId: 'demo-shelfy', apiKey: 'demo-key' }, 'lifecycle-client');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const clientDb = getFirestore(app);
connectFirestoreEmulator(clientDb, '127.0.0.1', 8080);
const functions = getFunctions(app, 'asia-southeast1');
connectFunctionsEmulator(functions, '127.0.0.1', 5001);
after(async () => { await signOut(auth); await deleteApp(app); await deleteAdmin(admin); });

test('verified image lifecycle, protected metadata and account lock work across real Rules and callables', async () => {
  await createUserWithEmailAndPassword(auth, `lifecycle-${Date.now()}@example.test`, 'TestPassword-123!');
  const uid = auth.currentUser.uid;
  const user = doc(clientDb, 'users', uid);
  await setDoc(user, { fullName: 'Lifecycle', email: auth.currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const publicId = `${uid}/wardrobe/verified-shirt`;
  const asset = { publicId, secureUrl: `https://res.cloudinary.com/demo-cloud/image/upload/v1/${publicId}.jpg` };
  const mediaRef = db.doc(`users/${uid}/mediaAssets/verified-shirt`);
  const create = httpsCallable(functions, 'createWardrobeItem');
  await assert.rejects(create({ name: 'Shirt', category: 'TOP', image: asset }), error => error.code === 'functions/failed-precondition');
  await mediaRef.set({ uid, publicId, asset, intent: 'wardrobe', deliveryType: 'upload', state: 'ready', cleanupAfterMillis: 0 });
  const item = (await create({ name: 'Shirt', category: 'TOP', image: asset })).data;
  await assert.rejects(updateDoc(doc(clientDb, 'users', uid, 'wardrobe', item.id), {
    image: { ...asset, secureUrl: 'https://res.cloudinary.com/foreign/image/upload/fake.jpg' }, updatedAt: serverTimestamp(),
  }), error => error.code === 'permission-denied');
  await assert.rejects(updateDoc(user, { avatar: asset, updatedAt: serverTimestamp() }), error => error.code === 'permission-denied');
  await assert.rejects(setDoc(doc(clientDb, 'users', uid, 'mediaAssets', 'forged'), { state: 'ready' }), error => error.code === 'permission-denied');
  await httpsCallable(functions, 'updateWardrobeItem')({ itemId: item.id, payload: { name: 'Updated' } });
  assert.equal((await getDoc(doc(clientDb, 'users', uid, 'wardrobe', item.id))).data().name, 'Updated');
  await httpsCallable(functions, 'confirmTodayDailyOutfit')({ itemIds: [item.id] });
  await httpsCallable(functions, 'deleteWardrobeItem')({ itemId: item.id });
  const deleted = [];
  const media = createMediaService({ database: db, cloudinary: { deleteImage: async id => deleted.push(id) },
    now: () => Date.now() + 40 * 86_400_000, serverTimestamp: () => FieldValue.serverTimestamp() });
  await media.cleanupOne(mediaRef);
  assert.equal(deleted.length, 0, 'history retains the clothing image after item deletion');
  await db.doc(`_accountAccess/${uid}`).set({ status: 'disabled' });
  await assert.rejects(getDoc(user), error => error.code === 'permission-denied');
  await assert.rejects(httpsCallable(functions, 'getMyEntitlement')({}), error => error.code === 'functions/permission-denied');
  await db.doc(`_accountAccess/${uid}`).set({ status: 'active' });
  const deletion = await httpsCallable(functions, 'requestAccountDeletion')({});
  assert.equal(deletion.data.accepted, true);
  assert.equal((await db.doc(`_accountAccess/${uid}`).get()).data().status, 'deleting');
  await assert.rejects(getDoc(user), error => error.code === 'permission-denied');
});
