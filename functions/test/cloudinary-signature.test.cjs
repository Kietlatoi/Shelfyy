const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCloudinarySignature } = require('../cloudinarySignature');

test('Cloudinary request signature follows its documented SHA-1 parameter format', () => {
  const parameters = { timestamp: 1315060510 };
  const expected = 'a21ad0f63beb4de2e5575204b79ab90bffb02c10';

  assert.equal(createCloudinarySignature(parameters, 'abcd'), expected);
  const options = {
    timestamp: 1315060510,
    public_id: 'sample_image',
    eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
  };
  assert.equal(
    createCloudinarySignature(options, 'abcd'),
    'bfd09f95f331f558cbd1320e67aa8d488770583e'
  );
  assert.equal(createCloudinarySignature({ eager: options.eager, public_id: options.public_id, timestamp: options.timestamp }, 'abcd'), createCloudinarySignature(options, 'abcd'));
});
