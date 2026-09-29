const crypto = require('node:crypto');

function createCloudinarySignature(parameters, apiSecret) {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

module.exports = { createCloudinarySignature };
