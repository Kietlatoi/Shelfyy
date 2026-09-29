const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadUploadApi({ signedUpload, response }) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', 'src/api/uploadApi.js'), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  const formDataInstances = [];
  class MockFormData {
    constructor() { this.fields = []; formDataInstances.push(this); }
    append(name, value) { this.fields.push([name, value]); }
  }
  let uploadRequest;
  const mocks = {
    'firebase/functions': { httpsCallable: (_functions, name) => async (payload) => {
      if (name === 'completeCloudinaryUpload') { assert.equal(payload.publicId, response.public_id); return { data: { secureUrl: response.secure_url, publicId: response.public_id, format: response.format, deliveryType: response.type } }; }
      assert.equal(name, 'createCloudinaryUploadSignature');
      assert.equal(payload.intent, 'tryOnInput');
      return { data: signedUpload };
    } },
    '../firebase/client': { functions: {} },
  };
  vm.runInNewContext(code, {
    exports,
    FormData: MockFormData,
    fetch: async (url, options) => {
      uploadRequest = { url, options };
      return { ok: true, json: async () => response };
    },
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return { uploadApi: exports.uploadApi, formDataInstances, getUploadRequest: () => uploadRequest };
}

test('try-on input upload includes the authenticated delivery type and validates Cloudinary response', async () => {
  const fixture = loadUploadApi({
    signedUpload: {
      apiKey: 'public-key', cloudName: 'shelfy', timestamp: 1710000000,
      folder: 'alice/tryon-input', public_id: 'input-123', type: 'authenticated', signature: 'signature',
    },
    response: {
      secure_url: 'https://res.cloudinary.com/shelfy/image/authenticated/v1/alice/tryon-input/input-123.jpg',
      public_id: 'alice/tryon-input/input-123', type: 'authenticated', format: 'jpg', bytes: 1024,
    },
  });
  const result = await fixture.uploadApi.uploadTryOnInput('file:///photo.jpg', 'photo.jpg', 'image/jpeg');
  const form = fixture.formDataInstances[0].fields;

  assert.equal(form.find(([name]) => name === 'type')[1], 'authenticated');
  assert.match(fixture.getUploadRequest().url, /\/image\/upload$/);
  assert.equal(result.deliveryType, 'authenticated');
  assert.equal(result.format, 'jpg');
  assert.equal(result.publicId, 'alice/tryon-input/input-123');
});

test('try-on upload rejects an upload response with a different delivery type', async () => {
  const fixture = loadUploadApi({
    signedUpload: {
      apiKey: 'public-key', cloudName: 'shelfy', timestamp: 1710000000,
      folder: 'alice/tryon-input', public_id: 'input-123', type: 'authenticated', signature: 'signature',
    },
    response: {
      secure_url: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-input/input-123.jpg',
      public_id: 'alice/tryon-input/input-123', type: 'upload', format: 'jpg', bytes: 1024,
    },
  });

  await assert.rejects(fixture.uploadApi.uploadTryOnInput('file:///photo.jpg'), /không khớp chữ ký/);
});
