const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} = require('firebase/firestore');

setLogLevel('silent');

const PROJECT_ID = 'demo-shelfy';
let testEnvironment;

before(async () => {
  const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment?.cleanup();
});

function profile(email) {
  return {
    fullName: 'Mai Anh',
    email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function wardrobeItem() {
  return {
    name: 'Áo sơ mi trắng',
    category: 'TOP',
    favorite: false,
    status: 'IN_USE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

test('signed-in owner creates their profile; another user cannot read it', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });
  const bob = testEnvironment.authenticatedContext('bob', { email: 'bob@example.test' });
  const aliceProfile = doc(alice.firestore(), 'users/alice');

  await assertSucceeds(setDoc(aliceProfile, profile('alice@example.test')));
  await assertSucceeds(getDoc(aliceProfile));
  await assertFails(getDoc(doc(bob.firestore(), 'users/alice')));
  await assertFails(setDoc(doc(alice.firestore(), 'users/bob'), profile('bob@example.test')));
});

test('profile creation rejects spoofed email and privileged account fields', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });

  await assertFails(setDoc(doc(alice.firestore(), 'users/alice'), profile('someone@example.test')));
  await assertFails(setDoc(doc(alice.firestore(), 'users/alice'), {
    ...profile('alice@example.test'),
    plan: 'PREMIUM',
    role: 'admin',
  }));
});

test('profile updates allow owner display changes but keep email immutable', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });
  const aliceProfile = doc(alice.firestore(), 'users/alice');

  await assertSucceeds(setDoc(aliceProfile, profile('alice@example.test')));
  await assertSucceeds(updateDoc(aliceProfile, {
    fullName: 'Mai Anh Nguyen',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(aliceProfile, {
    email: 'new@example.test',
    updatedAt: serverTimestamp(),
  }));
});

test('wardrobe create and delete require Functions; owner can update allowed fields only', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });
  const bob = testEnvironment.authenticatedContext('bob', { email: 'bob@example.test' });
  const aliceItem = doc(alice.firestore(), 'users/alice/wardrobe/item-1');

  await assertFails(setDoc(aliceItem, wardrobeItem()));
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice/wardrobe/item-1'), wardrobeItem());
  });
  await assertSucceeds(updateDoc(aliceItem, {
    favorite: true,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(aliceItem, {
    wearCount: 1000,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(getDoc(doc(bob.firestore(), 'users/alice/wardrobe/item-1')));
  await assertFails(deleteDoc(aliceItem));
});

test('clients cannot bypass server wardrobe validation by creating documents directly', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });
  const item = doc(alice.firestore(), 'users/alice/wardrobe/item-1');

  await assertFails(setDoc(item, { ...wardrobeItem(), tags: Array(26).fill('tag') }));
  await assertFails(setDoc(item, { ...wardrobeItem(), purchasePrice: -1 }));
  await assertFails(setDoc(item, {
    ...wardrobeItem(),
    image: {
      secureUrl: 'https://res.cloudinary.com/shelfy/image/upload/bob/wardrobe/item.jpg',
      publicId: 'bob/wardrobe/item',
    },
  }));
  await assertFails(setDoc(item, wardrobeItem()));
});

test('client cannot write entitlements, payments, suggestions or server records', async () => {
  const alice = testEnvironment.authenticatedContext('alice', { email: 'alice@example.test' });
  const firestore = alice.firestore();

  await assertFails(setDoc(doc(firestore, 'users/alice/entitlements/current'), { planId: 'PREMIUM' }));
  await assertFails(setDoc(doc(firestore, 'users/alice/payments/payment-1'), { status: 'PAID' }));
  await assertFails(setDoc(doc(firestore, 'users/alice/suggestions/suggestion-1'), { title: 'test' }));
  await assertFails(setDoc(doc(firestore, '_oauthCredentials/alice'), { refreshToken: 'secret' }));
  await assertFails(getDoc(doc(firestore, '_paymentTransactions/order-1')));
  await assertFails(setDoc(doc(firestore, '_paymentTransactions/order-1'), { uid: 'alice' }));
  await assertFails(getDoc(doc(firestore, '_pendingPaymentByUser/alice')));
});

test('try-on history is owner-readable while provider jobs, receipts and quota stay private', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'users/alice/tryOns/job-1'), { status: 'PROCESSING', isDeleted: false });
    await setDoc(doc(firestore, '_tryOnJobs/job-1'), { predictionId: 'provider-private-id' });
    await setDoc(doc(firestore, '_tryOnUsage/alice'), { count: 1 });
    await setDoc(doc(firestore, '_tryOnReceipts/request-1'), { jobId: 'job-1' });
  });

  const alice = testEnvironment.authenticatedContext('alice').firestore();
  const bob = testEnvironment.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(alice, 'users/alice/tryOns/job-1')));
  await assertFails(getDoc(doc(bob, 'users/alice/tryOns/job-1')));
  await assertFails(setDoc(doc(alice, 'users/alice/tryOns/job-2'), { status: 'DONE' }));
  await assertFails(getDoc(doc(alice, '_tryOnJobs/job-1')));
  await assertFails(getDoc(doc(alice, '_tryOnUsage/alice')));
  await assertFails(getDoc(doc(alice, '_tryOnReceipts/request-1')));
});

test('weather snapshots are owner-readable and server-write-only', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice/weatherSnapshots/current'), { temperature: 28 });
  });

  const alice = testEnvironment.authenticatedContext('alice').firestore();
  const bob = testEnvironment.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(alice, 'users/alice/weatherSnapshots/current')));
  await assertFails(getDoc(doc(bob, 'users/alice/weatherSnapshots/current')));
  await assertFails(setDoc(doc(alice, 'users/alice/weatherSnapshots/current'), { temperature: 99 }));
});

test('only active plans are readable and clients cannot change the catalog', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'plans/FREE'), { name: 'Free', isActive: true });
    await setDoc(doc(firestore, 'plans/OLD'), { name: 'Old', isActive: false });
  });

  const alice = testEnvironment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(alice, 'plans/FREE')));
  await assertFails(getDoc(doc(alice, 'plans/OLD')));
  await assertFails(setDoc(doc(alice, 'plans/PAID'), { isActive: true }));
});
