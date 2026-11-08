const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCloudinarySignature } = require('../cloudinarySignature');
const { createCloudinaryAssets } = require('../cloudinaryAssets');

test('result upload signs Cloudinary parameters, excludes file, and validates the stored asset', async () => {
  let request;
  const assets = createCloudinaryAssets({
    cloudName: 'shelfy',
    apiKey: 'api-key',
    apiSecret: 'secret',
    now: () => 1_710_000_000_000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({
        secure_url: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-results/job-1.png',
        public_id: 'alice/tryon-results/job-1',
      }) };
    },
  });

  const result = await assets.uploadResultFromUrl('https://replicate.delivery/example/result.png', { uid: 'alice', jobId: 'job-1' });
  const body = new URLSearchParams(request.options.body);
  const signed = {
    folder: body.get('folder'),
    overwrite: body.get('overwrite'),
    public_id: body.get('public_id'),
    timestamp: body.get('timestamp'),
  };
  assert.equal(result.publicId, 'alice/tryon-results/job-1');
  assert.equal(body.get('file'), 'https://replicate.delivery/example/result.png');
  assert.equal(body.get('signature'), createCloudinarySignature(signed, 'secret'));
  assert.equal(request.url, 'https://api.cloudinary.com/v1_1/shelfy/image/upload');
});

test('input asset destroy is signed and Cloudinary errors stay sanitized', async () => {
  let body;
  const assets = createCloudinaryAssets({
    cloudName: 'shelfy',
    apiKey: 'api-key',
    apiSecret: 'secret',
    fetchImpl: async (_url, options) => {
      body = new URLSearchParams(options.body);
      return { ok: true, json: async () => ({ result: 'ok' }) };
    },
  });
  await assets.deleteImage('alice/tryon-input/person');
  assert.equal(body.get('public_id'), 'alice/tryon-input/person');
  assert.equal(body.get('type'), 'authenticated');
  assert.equal(typeof body.get('signature'), 'string');

  const broken = createCloudinaryAssets({
    cloudName: 'shelfy',
    apiKey: 'api-key',
    apiSecret: 'secret',
    fetchImpl: async () => ({ ok: false, json: async () => ({ error: { message: 'secret detail' } }) }),
  });
  await assert.rejects(broken.deleteImage('alice/tryon-input/person'), (error) => {
    assert.equal(error.code, 'unavailable');
    assert.equal(error.message.includes('secret detail'), false);
    return true;
  });
});

test('ordinary wardrobe image destroy uses upload delivery type in its signed request', async () => {
  let body;
  const assets = createCloudinaryAssets({
    cloudName: 'shelfy', apiKey: 'api-key', apiSecret: 'secret',
    fetchImpl: async (_url, options) => {
      body = new URLSearchParams(options.body);
      return { ok: true, json: async () => ({ result: 'ok' }) };
    },
  });
  await assets.deleteImage('alice/wardrobe/shirt');
  assert.equal(body.get('type'), 'upload');
  assert.equal(body.get('public_id'), 'alice/wardrobe/shirt');
  const parameters = Object.fromEntries(body.entries());
  delete parameters.api_key;
  delete parameters.signature;
  assert.equal(body.get('signature'), createCloudinarySignature(parameters, 'secret'));
});

function uploadVerificationFixture(overrides = {}, deliveryType = 'upload') {
  const publicId = deliveryType === 'authenticated' ? 'alice/tryon-input/person' : 'alice/wardrobe/shirt';
  const resource = {
    public_id: publicId,
    secure_url: `https://res.cloudinary.com/shelfy/image/${deliveryType}/v1/${publicId}.jpg`,
    resource_type: 'image', type: deliveryType, format: 'jpg', bytes: 1024, width: 800, height: 1200,
    ...overrides,
  };
  let request;
  const assets = createCloudinaryAssets({
    cloudName: 'shelfy', apiKey: 'api-key', apiSecret: 'secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => resource };
    },
  });
  return { assets, resource, input: { publicId, deliveryType }, request: () => request };
}

for (const deliveryType of ['upload', 'authenticated']) {
  test(`verifyUpload confirms ${deliveryType} image metadata using the authenticated Admin API`, async () => {
    const fixture = uploadVerificationFixture({ bytes: 10 * 1024 * 1024 }, deliveryType);
    const result = await fixture.assets.verifyUpload(fixture.input);
    const { url, options } = fixture.request();
    assert.equal(url, `https://api.cloudinary.com/v1_1/shelfy/resources/image/${deliveryType}/${encodeURIComponent(fixture.input.publicId)}`);
    assert.equal(options.method, 'GET');
    assert.equal(new Headers(options.headers).get('authorization'), `Basic ${Buffer.from('api-key:secret').toString('base64')}`);
    assert.deepEqual(result, {
      secureUrl: fixture.resource.secure_url,
      publicId: fixture.input.publicId,
      deliveryType,
      format: 'jpg', bytes: 10 * 1024 * 1024, width: 800, height: 1200,
    });
  });
}

for (const [reason, override] of [
  ['larger than 10 MiB', { bytes: 10 * 1024 * 1024 + 1 }],
  ['a video resource', { resource_type: 'video' }],
  ['a different public ID', { public_id: 'bob/wardrobe/shirt' }],
  ['a different delivery type', { type: 'authenticated' }],
  ['an unsupported SVG format', { format: 'svg' }],
  ['a URL on another cloud', { secure_url: 'https://res.cloudinary.com/other-cloud/image/upload/v1/alice/wardrobe/shirt.jpg' }],
]) {
  test(`verifyUpload rejects ${reason} instead of trusting client metadata`, async () => {
    const { assets, input } = uploadVerificationFixture(override);
    assert.equal(typeof assets.verifyUpload, 'function', 'Upload verification must be implemented');
    await assert.rejects(() => assets.verifyUpload(input));
  });
}

test('temporary authenticated input access is time-limited and signed', async () => {
  const assets = createCloudinaryAssets({
    cloudName: 'shelfy',
    apiKey: 'api-key',
    apiSecret: 'secret',
    now: () => 1_710_000_000_000,
  });

  const url = await assets.createTemporaryInputUrl({
    publicId: 'alice/tryon-input/person',
    format: 'jpg',
  });
  const parsed = new URL(url);
  const parameters = Object.fromEntries(parsed.searchParams.entries());
  const signed = {
    expires_at: parameters.expires_at,
    format: parameters.format,
    public_id: parameters.public_id,
    timestamp: parameters.timestamp,
    type: parameters.type,
  };

  assert.equal(parsed.origin + parsed.pathname, 'https://api.cloudinary.com/v1_1/shelfy/image/download');
  assert.equal(parameters.public_id, 'alice/tryon-input/person');
  assert.equal(parameters.type, 'authenticated');
  assert.equal(Number(parameters.expires_at), 1_710_003_600);
  assert.equal(parameters.signature, createCloudinarySignature(signed, 'secret'));
});
