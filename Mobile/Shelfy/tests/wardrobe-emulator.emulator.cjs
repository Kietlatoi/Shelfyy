const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const babel = require('@babel/core');
const { initializeApp, deleteApp } = require('firebase/app');
const { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } = require('firebase/auth');
const { connectFirestoreEmulator, getFirestore } = require('firebase/firestore');
const { connectFunctionsEmulator, getFunctions, httpsCallable } = require('firebase/functions');

const PROJECT_ID = 'demo-shelfy';
let app;
let auth;
let db;
let functions;
let wardrobeApi;

function loadWardrobeModule() {
  const filename = path.join(__dirname, '..', 'src/api/wardrobeApi.js');
  const clientFilename = path.join(__dirname, '..', 'src/firebase/client.js');
  const { code } = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const priorClient = require.cache[clientFilename];
  require.cache[clientFilename] = {
    id: clientFilename,
    filename: clientFilename,
    loaded: true,
    exports: { auth, db, functions: {} },
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

before(async () => {
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    appId: `1:1234567890:android:wardrobe-${Date.now()}`,
  }, `shelfy-wardrobe-test-${Date.now()}`);
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  functions = getFunctions(app, 'asia-southeast1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await createUserWithEmailAndPassword(auth, `wardrobe-${Date.now()}@example.test`, 'SafeTestPassword-123!');

  const { createFirebaseWardrobeApi } = loadWardrobeModule();
  wardrobeApi = createFirebaseWardrobeApi(
    db,
    auth,
    httpsCallable(functions, 'markWardrobeItemWorn'),
    httpsCallable(functions, 'createWardrobeItem'),
    httpsCallable(functions, 'deleteWardrobeItem'),
    httpsCallable(functions, 'getMyEntitlement'),
    httpsCallable(functions, 'updateWardrobeItem')
  );
});

after(async () => {
  await signOut(auth);
  await deleteApp(app);
});

test('wardrobe CRUD and favorite status use the signed-in UID collection', async () => {
  const created = await wardrobeApi.createItem({
    name: 'Áo len',
    brand: 'Vintage Studio',
    category: 'TOP',
    favorite: false,
    status: 'IN_USE',
    image: null,
    thumbnail: null,
  });
  assert.ok(created.id);

  let item = await wardrobeApi.getItem(created.id);
  assert.equal(item.name, 'Áo len');
  assert.equal(item.imageUrl, null);

  await wardrobeApi.updatePreference(created.id, { favorite: true, status: 'STORED' });
  item = await wardrobeApi.getItem(created.id);
  assert.equal(item.favorite, true);
  assert.equal(item.status, 'STORED');

  await wardrobeApi.markWorn(created.id);
  item = await wardrobeApi.getItem(created.id);
  assert.equal(item.wearCount, 1);
  assert.ok(item.lastWornAt);
  const stats = await wardrobeApi.getStats();
  assert.equal(stats.totalItems, 1);
  assert.equal(stats.wornCount, 1);

  const search = await wardrobeApi.getItems({ q: 'vintage', size: 10 });
  assert.equal(search.content[0].id, created.id);

  await wardrobeApi.updateItem(created.id, { name: 'Áo len mùa đông' });
  assert.equal((await wardrobeApi.getItem(created.id)).name, 'Áo len mùa đông');

  await wardrobeApi.deleteItem(created.id);
  await assert.rejects(() => wardrobeApi.getItem(created.id), /Không tìm thấy/);
});
