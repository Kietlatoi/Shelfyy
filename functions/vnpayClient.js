const crypto = require('node:crypto');

const DEFAULT_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VIETNAM_OFFSET_MILLIS = 7 * 60 * 60 * 1000;

function createVnpayClient({ getConfig, now = () => new Date(), randomInt = crypto.randomInt }) {
  function config() {
    const values = getConfig();
    return {
      tmnCode: String(values.tmnCode || '').trim(),
      hashSecret: String(values.hashSecret || '').trim(),
      payUrl: String(values.payUrl || DEFAULT_PAY_URL).trim(),
      returnUrl: String(values.returnUrl || '').trim(),
      ipnUrl: String(values.ipnUrl || '').trim(),
    };
  }

  function isConfigured() {
    const values = config();
    return Boolean(values.tmnCode && values.hashSecret && values.returnUrl && values.ipnUrl);
  }

  function amountToVnpAmount(amount) {
    const value = typeof amount === 'number' ? amount : Number(String(amount || '').trim());
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Số tiền không hợp lệ.');
    return String(BigInt(value) * 100n);
  }

  function dateString(value) {
    const date = new Date(value.getTime() + VIETNAM_OFFSET_MILLIS);
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
      + `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  }

  function encodedValue(value) {
    return encodeURIComponent(String(value)).replace(/%20/g, '+');
  }

  function hashData(params) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodedValue(params[key])}`)
      .join('&');
  }

  function sign(params, secret = config().hashSecret) {
    return crypto.createHmac('sha512', Buffer.from(secret, 'utf8'))
      .update(Buffer.from(hashData(params), 'utf8'))
      .digest('hex');
  }

  function timingSafeEqualHex(left, right) {
    const a = Buffer.from(String(left || '').toLowerCase(), 'hex');
    const b = Buffer.from(String(right || '').toLowerCase(), 'hex');
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function verifySignature(params = {}) {
    const received = params.vnp_SecureHash;
    if (typeof received !== 'string' || !/^[0-9a-f]{128}$/i.test(received)) return false;
    const unsigned = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
      if (Array.isArray(value) || (value && typeof value === 'object')) return false;
      unsigned[key] = value;
    }
    return timingSafeEqualHex(sign(unsigned), received);
  }

  function generateTxnRef() {
    return `${Date.now()}${String(randomInt(1000, 10000))}`;
  }

  function normalizeClientIp(value) {
    const ip = String(value || '').trim();
    if (!ip || ip.includes(':')) return '127.0.0.1';
    return ip.slice(0, 45);
  }

  function buildPaymentUrl(input) {
    const values = config();
    if (!isConfigured()) throw new Error('VNPay chưa được cấu hình.');
    const createdAt = new Date(now());
    const params = {
      vnp_Amount: amountToVnpAmount(input.amount),
      vnp_Command: 'pay',
      vnp_CreateDate: dateString(createdAt),
      vnp_CurrCode: 'VND',
      vnp_ExpireDate: dateString(new Date(createdAt.getTime() + 15 * 60 * 1000)),
      vnp_IpAddr: normalizeClientIp(input.clientIp),
      vnp_Locale: 'vn',
      vnp_OrderInfo: String(input.orderInfo || '').slice(0, 255),
      vnp_OrderType: 'other',
      vnp_ReturnUrl: values.returnUrl,
      vnp_TmnCode: values.tmnCode,
      vnp_TxnRef: String(input.txnRef || ''),
      vnp_Version: '2.1.0',
    };
    const data = hashData(params);
    return `${values.payUrl}?${data}&vnp_SecureHash=${sign(params, values.hashSecret)}`;
  }

  return { isConfigured, amountToVnpAmount, generateTxnRef, buildPaymentUrl, verifySignature, getConfig: config };
}

module.exports = { createVnpayClient, DEFAULT_PAY_URL };
