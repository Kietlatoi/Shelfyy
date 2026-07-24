var crypto = require('crypto');
var querystring = require('qs');

var DEFAULT_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
var VN_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

function cleanEnv(value) {
  return String(value || '').trim();
}

function nodeBaseUrl() {
  return cleanEnv(process.env.NODE_PUBLIC_BASE_URL) ||
    cleanEnv(process.env.NODE_BASE_URL) ||
    'http://localhost:' + (process.env.PORT || 3000);
}

function getConfig() {
  var baseUrl = nodeBaseUrl().replace(/\/+$/, '');
  return {
    tmnCode: cleanEnv(process.env.VNPAY_TMN_CODE),
    hashSecret: cleanEnv(process.env.VNPAY_HASH_SECRET),
    payUrl: cleanEnv(process.env.VNPAY_PAY_URL) || DEFAULT_PAY_URL,
    returnUrl: cleanEnv(process.env.VNPAY_RETURN_URL) || baseUrl + '/api/payments/vnpay/callback',
    ipnUrl: cleanEnv(process.env.VNPAY_IPN_URL) || baseUrl + '/api/payments/vnpay/ipn',
    frontendUrl: (cleanEnv(process.env.APP_FRONTEND_URL) || 'http://localhost:5173').replace(/\/+$/, ''),
  };
}

function isConfigured() {
  var config = getConfig();
  return Boolean(
    config.tmnCode &&
    config.hashSecret &&
    config.tmnCode !== '...' &&
    config.hashSecret !== '...'
  );
}

function normalizeClientIp(value) {
  var text = cleanEnv(value);
  if (!text || text.indexOf(':') !== -1 || text === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1';
  }
  return text;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatVnpDate(date) {
  var vnDate = new Date(date.getTime() + VN_TIME_OFFSET_MS);
  return String(vnDate.getUTCFullYear()) +
    pad2(vnDate.getUTCMonth() + 1) +
    pad2(vnDate.getUTCDate()) +
    pad2(vnDate.getUTCHours()) +
    pad2(vnDate.getUTCMinutes()) +
    pad2(vnDate.getUTCSeconds());
}

function parseVnpDate(value) {
  var text = cleanEnv(value);
  if (!/^\d{14}$/.test(text)) return null;
  var year = Number(text.slice(0, 4));
  var month = Number(text.slice(4, 6));
  var day = Number(text.slice(6, 8));
  var hour = Number(text.slice(8, 10));
  var minute = Number(text.slice(10, 12));
  var second = Number(text.slice(12, 14));
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - VN_TIME_OFFSET_MS);
}

function vnpEncode(value) {
  return encodeURIComponent(String(value || ''))
    .replace(/%20/g, '+');
}

function sortedEntries(params) {
  return Object.keys(params || {})
    .sort()
    .map(function(key) {
      return [key, params[key]];
    })
    .filter(function(entry) {
      return entry[1] !== undefined && entry[1] !== null && String(entry[1]) !== '';
    });
}

function sortedEncodedParams(params) {
  var encoded = {};
  sortedEntries(params).forEach(function(entry) {
    encoded[encodeURIComponent(entry[0])] = vnpEncode(entry[1]);
  });
  return encoded;
}

function buildHashData(params) {
  return querystring.stringify(sortedEncodedParams(params), { encode: false });
}

function hmacSHA512(key, data) {
  return crypto
    .createHmac('sha512', Buffer.from(key, 'utf8'))
    .update(Buffer.from(data, 'utf8'))
    .digest('hex');
}

function timingSafeEqualHex(left, right) {
  var a = Buffer.from(cleanEnv(left).toLowerCase(), 'hex');
  var b = Buffer.from(cleanEnv(right).toLowerCase(), 'hex');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function amountToVnpAmount(amount) {
  var text = cleanEnv(amount);
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error('Số tiền không hợp lệ.');
  var parts = text.split('.');
  var whole = parts[0] || '0';
  var cents = ((parts[1] || '') + '00').slice(0, 2);
  return (BigInt(whole) * 100n + BigInt(cents)).toString();
}

function generateTxnRef() {
  return String(Date.now()) + String(crypto.randomInt(1000, 10000));
}

function buildPaymentUrl(input) {
  var config = getConfig();
  var now = new Date();
  var params = {
    vnp_Amount: amountToVnpAmount(input.amount),
    vnp_Command: 'pay',
    vnp_CreateDate: formatVnpDate(now),
    vnp_CurrCode: 'VND',
    vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + 15 * 60 * 1000)),
    vnp_IpAddr: normalizeClientIp(input.clientIp),
    vnp_Locale: 'vn',
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: config.returnUrl,
    vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: input.txnRef,
    vnp_Version: '2.1.0',
  };

  var hashData = buildHashData(params);
  var secureHash = hmacSHA512(config.hashSecret, hashData);

  return config.payUrl + '?' + hashData + '&vnp_SecureHash=' + secureHash;
}

function verifySignature(rawParams) {
  var config = getConfig();
  var receivedHash = rawParams && rawParams.vnp_SecureHash;
  if (!receivedHash) return false;

  var params = {};
  Object.keys(rawParams || {}).forEach(function(key) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      params[key] = rawParams[key];
    }
  });

  var computedHash = hmacSHA512(config.hashSecret, buildHashData(params));
  return timingSafeEqualHex(computedHash, receivedHash);
}

function frontendPaymentResultUrl(result) {
  var config = getConfig();
  var url = new URL(config.frontendUrl + '/');
  var hashParams = new URLSearchParams();
  hashParams.set('payment', result.success ? 'success' : 'failed');
  if (result.planType) hashParams.set('plan', result.planType);
  if (result.reason) hashParams.set('reason', result.reason);
  url.hash = '/up-premium?' + hashParams.toString();
  return url.toString();
}

module.exports = {
  amountToVnpAmount: amountToVnpAmount,
  buildPaymentUrl: buildPaymentUrl,
  frontendPaymentResultUrl: frontendPaymentResultUrl,
  generateTxnRef: generateTxnRef,
  getConfig: getConfig,
  isConfigured: isConfigured,
  parseVnpDate: parseVnpDate,
  verifySignature: verifySignature,
};
