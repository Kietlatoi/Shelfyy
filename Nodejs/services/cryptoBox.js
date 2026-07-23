var crypto = require('crypto');

var VERSION = 'v1';
var IV_LENGTH = 12;
var TAG_LENGTH = 16;

function decodeConfiguredKey(value) {
  var raw = String(value || '').trim();
  if (!raw) return null;

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  try {
    var decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) return decoded;
  } catch (err) {
    // Fall through and derive a stable key from the configured secret.
  }

  return crypto.createHash('sha256').update(raw).digest();
}

function getEncryptionKey() {
  var key = decodeConfiguredKey(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY);
  if (key) return key;

  var fallback = decodeConfiguredKey(process.env.JWT_SECRET);
  if (fallback) return fallback;

  var error = new Error('Calendar token encryption key chưa được cấu hình.');
  error.status = 500;
  error.code = 'CALENDAR_TOKEN_KEY_MISSING';
  throw error;
}

function encryptSecret(plaintext) {
  if (!plaintext) return null;

  var iv = crypto.randomBytes(IV_LENGTH);
  var cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: TAG_LENGTH,
  });
  var ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  var tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

function decryptSecret(value) {
  var raw = String(value || '');
  if (!raw) return null;

  var parts = raw.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    var invalid = new Error('Calendar token không đúng định dạng mã hóa.');
    invalid.status = 500;
    invalid.code = 'CALENDAR_TOKEN_INVALID';
    throw invalid;
  }

  var decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(parts[1], 'base64'),
    { authTagLength: TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(parts[2], 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(parts[3], 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  encryptSecret: encryptSecret,
  decryptSecret: decryptSecret,
};
