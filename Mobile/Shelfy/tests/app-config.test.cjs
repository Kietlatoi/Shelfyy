const { test } = require('node:test');
const assert = require('node:assert/strict');
const appConfig = require('../app.config');
const { checkBuildEnvironment } = require('../scripts/check-build-env.cjs');

test('release builds reject missing Firebase configuration and emulator targets', () => {
  assert.throws(() => checkBuildEnvironment({}), /Thiếu cấu hình EAS/);
  const valid = { EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'shelfy-stage', EXPO_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
    EXPO_PUBLIC_FIREBASE_API_KEY: 'public-project-key', EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'shelfy-stage.firebaseapp.com',
    EXPO_PUBLIC_EDGE_API_URL: 'https://shelfy-edge.example.workers.dev', EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'false' };
  assert.doesNotThrow(() => checkBuildEnvironment(valid));
  assert.throws(() => checkBuildEnvironment({ ...valid, EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true' }), /project thật/);
  assert.throws(() => checkBuildEnvironment({ ...valid, EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-shelfy' }), /project thật/);
});

test('Expo sets the accepted Android package and verifies Firebase Hosting reset links', () => {
  const previousProject = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const previousDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN;
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'shelfy-stage';
  delete process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN;
  try {
    const resolved = appConfig({ config: require('../app.json').expo });
    assert.equal(resolved.android.package, 'com.shelfy.app');
    assert.deepEqual(resolved.android.intentFilters[0], {
      action: 'VIEW',
      autoVerify: true,
      data: [{ scheme: 'https', host: 'shelfy-stage.firebaseapp.com', pathPrefix: '/__/auth/links' }],
      category: ['BROWSABLE', 'DEFAULT'],
    });
  } finally {
    if (previousProject === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    else process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = previousProject;
    if (previousDomain === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN;
    else process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN = previousDomain;
  }
});

test('Expo can verify a configured custom Firebase Hosting link domain', () => {
  const previousProject = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const previousDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN;
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'shelfy-stage';
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN = 'https://links.shelfy.app/';
  try {
    const resolved = appConfig({ config: require('../app.json').expo });
    assert.equal(resolved.android.intentFilters[0].data[0].host, 'links.shelfy.app');
  } finally {
    if (previousProject === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    else process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = previousProject;
    if (previousDomain === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN;
    else process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN = previousDomain;
  }
});
