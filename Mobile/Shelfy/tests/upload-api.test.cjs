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
  let uploadRequest;
  class MockFile {
    constructor(uri) {
      this.uri = uri;
      this.exists = true;
      this.size = 1024;
      this.type = 'image/jpeg';
    }

    async upload(url, options) {
      uploadRequest = { url, options, uri: this.uri };
      return { status: response.status ?? 200, body: JSON.stringify(response.body) };
    }
  }
  const edgeCalls = [];
  const mocks = {
    'expo-file-system': { File: MockFile, UploadType: { MULTIPART: 'multipart' } },
    './edgeApi': {
      edgeRequest: async (url, options) => {
        edgeCalls.push({ url, options });
        return signedUpload;
      },
    },
  };
  vm.runInNewContext(code, {
    AbortController,
    clearTimeout,
    exports,
    setTimeout,
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return { uploadApi: exports.uploadApi, edgeCalls, getUploadRequest: () => uploadRequest };
}

const signedUpload = {
  apiKey: 'public-key',
  cloudName: 'shelfy',
  timestamp: 1710000000,
  folder: 'alice/tryon-input',
  public_id: 'input-123',
  signature: 'signature',
};

test('try-on upload uses the Worker signature and validates the Cloudinary response', async () => {
  const fixture = loadUploadApi({
    signedUpload,
    response: {
      body: {
        secure_url: 'https://res.cloudinary.com/shelfy/image/upload/v1/alice/tryon-input/input-123.jpg',
        public_id: 'alice/tryon-input/input-123',
        type: 'upload',
        format: 'jpg',
        bytes: 1024,
      },
    },
  });
  const result = await fixture.uploadApi.uploadTryOnInput('file:///photo.jpg', 'photo.jpg', 'image/jpeg');

  assert.equal(fixture.edgeCalls[0].url, '/v1/uploads/signatures');
  assert.equal(fixture.edgeCalls[0].options.body.intent, 'tryOnInput');
  assert.match(fixture.getUploadRequest().url, /\/image\/upload$/);
  assert.equal(fixture.getUploadRequest().options.parameters.public_id, 'input-123');
  assert.equal(result.deliveryType, 'upload');
  assert.equal(result.publicId, 'alice/tryon-input/input-123');
});

test('try-on upload rejects a Cloudinary response outside the signed folder', async () => {
  const fixture = loadUploadApi({
    signedUpload,
    response: {
      body: {
        secure_url: 'https://res.cloudinary.com/shelfy/image/upload/v1/mallory/input-123.jpg',
        public_id: 'mallory/input-123',
        type: 'upload',
        format: 'jpg',
        bytes: 1024,
      },
    },
  });

  await assert.rejects(fixture.uploadApi.uploadTryOnInput('file:///photo.jpg'), /không khớp chữ ký/);
});
