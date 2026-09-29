const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createReplicateClient } = require('../replicateClient');

test('Replicate client creates the existing virtual try-on prediction with server-held auth', async () => {
  let request;
  const client = createReplicateClient({
    apiToken: 'replicate-test-token',
    modelVersion: 'model-version-test',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: 'prediction-1', status: 'starting' }) };
    },
  });

  const prediction = await client.createPrediction({
    personImageUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/tryon-input/person.jpg',
    garmentImageUrl: 'https://res.cloudinary.com/shelfy/image/upload/alice/wardrobe/top.jpg',
    garmentDescription: 'Áo sơ mi',
    category: 'TOP',
  });

  assert.equal(prediction.id, 'prediction-1');
  assert.equal(request.url, 'https://api.replicate.com/v1/predictions');
  assert.equal(request.options.headers.Authorization, 'Bearer replicate-test-token');
  assert.equal(JSON.parse(request.options.body).version, 'model-version-test');
  assert.equal(JSON.parse(request.options.body).input.human_img, 'https://res.cloudinary.com/shelfy/image/upload/alice/tryon-input/person.jpg');
});

test('Replicate client rejects missing configuration and maps upstream errors to safe messages', async () => {
  const unconfigured = createReplicateClient({ apiToken: '', modelVersion: 'v1' });
  await assert.rejects(unconfigured.createPrediction({ category: 'TOP' }), { code: 'failed-precondition' });

  const unavailable = createReplicateClient({
    apiToken: 'test-token',
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ detail: 'private upstream detail' }) }),
  });
  await assert.rejects(unavailable.getPrediction('prediction-1'), (error) => {
    assert.equal(error.code, 'unavailable');
    assert.equal(error.message.includes('private upstream detail'), false);
    return true;
  });
});
