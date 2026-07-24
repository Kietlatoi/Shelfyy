var express = require('express');
var { authenticate } = require('../middleware/auth');
var { withTransaction } = require('../db');
var vnpay = require('../services/vnpayClient');

var router = express.Router();
var PAID_PLANS = ['PRO', 'PREMIUM'];

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 400;
  error.code = code || 'PAYMENT_ERROR';
  error.publicMessage = message;
  return error;
}

function normalizePlan(raw) {
  var plan = String(raw || '').trim().toUpperCase();
  if (!PAID_PLANS.includes(plan)) {
    throw publicError('Gói nâng cấp không hợp lệ.', 422, 'SUBSCRIPTION_INVALID_PLAN');
  }
  return plan;
}

function planRank(plan) {
  var normalized = String(plan || '').trim().toUpperCase();
  if (normalized === 'PREMIUM') return 2;
  if (normalized === 'PRO') return 1;
  return 0;
}

function addDays(date, days) {
  return new Date(date.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000);
}

function clientIp(req) {
  var forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket && req.socket.remoteAddress || '127.0.0.1';
}

function normalizeQueryParams(query) {
  var params = {};
  Object.keys(query || {}).forEach(function(key) {
    var value = query[key];
    if (Array.isArray(value)) value = value[0];
    if (value !== undefined && value !== null) params[key] = String(value);
  });
  return params;
}

function providerResponse(params) {
  return JSON.stringify(params || {});
}

function result(success, planType, reason, rspCode, message) {
  return {
    success: Boolean(success),
    planType: planType || null,
    reason: reason || null,
    rspCode: rspCode,
    message: message,
  };
}

function activationPublicError(err) {
  if (err && err.publicMessage) return err;
  return publicError(
    'Thanh toán thành công nhưng kích hoạt gói thất bại, vui lòng liên hệ hỗ trợ.',
    500,
    'SUBSCRIPTION_ACTIVATION_FAILED'
  );
}

async function fetchUserForPlan(client, userId) {
  var userResult = await client.query(
    `SELECT user_id, plan, plan_expires_at
     FROM users
     WHERE user_id = $1
       AND deleted_at IS NULL
     FOR UPDATE`,
    [userId]
  );
  if (userResult.rowCount === 0) {
    throw publicError('Tài khoản không tồn tại.', 404, 'USER_NOT_FOUND');
  }
  return userResult.rows[0];
}

async function fetchPaidPlan(client, planType) {
  var planResult = await client.query(
    `SELECT plan_id, plan_name, price, duration_days, try_on_limit_per_month, wardrobe_limit
     FROM plans
     WHERE plan_name = $1
       AND is_active = TRUE
     LIMIT 1`,
    [planType]
  );
  if (planResult.rowCount === 0) {
    throw publicError('Gói nâng cấp không tồn tại hoặc chưa được bật.', 422, 'SUBSCRIPTION_INVALID_PLAN');
  }
  return planResult.rows[0];
}

function assertNoDowngrade(user, planType) {
  var now = new Date();
  var currentPlan = String(user.plan || 'FREE').toUpperCase();
  var expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  var hasActivePaidPlan = currentPlan !== 'FREE' && expiresAt && expiresAt.getTime() > now.getTime();

  if (hasActivePaidPlan && planRank(currentPlan) > planRank(planType)) {
    throw publicError(
      'Không thể chuyển về gói thấp hơn khi gói hiện tại còn hạn.',
      409,
      'SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED'
    );
  }
}

async function assertPlanCanBePurchased(client, userId, planType) {
  var user = await fetchUserForPlan(client, userId);
  assertNoDowngrade(user, planType);
}

async function activatePaidPlan(client, userId, planType) {
  var user = await fetchUserForPlan(client, userId);
  assertNoDowngrade(user, planType);
  var plan = await fetchPaidPlan(client, planType);

  var now = new Date();
  var currentPlan = String(user.plan || 'FREE').toUpperCase();
  var expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  var hasActivePaidPlan = currentPlan !== 'FREE' && expiresAt && expiresAt.getTime() > now.getTime();
  var samePlan = hasActivePaidPlan && planRank(currentPlan) === planRank(planType);
  var expiryBase = samePlan ? expiresAt : now;
  var durationDays = Number(plan.duration_days || (planType === 'PREMIUM' ? 365 : 30));
  var endDate = addDays(expiryBase, durationDays);
  var storageLimit = plan.wardrobe_limit == null ? -1 : Number(plan.wardrobe_limit);
  var tryOnLimit = Number(plan.try_on_limit_per_month || 100);

  await client.query(
    `UPDATE users
     SET plan = $2,
         plan_expires_at = $3,
         storage_limit = $4,
         try_on_limit = $5,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, planType, endDate, storageLimit, tryOnLimit]
  );

  var subscriptionResult = await client.query(
    `INSERT INTO subscriptions (
       user_id, plan_id, start_date, end_date, status, auto_renew, created_at
     ) VALUES (
       $1, $2, $3, $4, 'ACTIVE', FALSE, NOW()
     )
     RETURNING subscription_id`,
    [userId, plan.plan_id, now, endDate]
  );

  return subscriptionResult.rows[0].subscription_id;
}

async function processVnpayParams(client, params, source) {
  if (!vnpay.verifySignature(params)) {
    return result(false, null, 'invalid_signature', '97', 'Invalid signature');
  }

  var txnRef = params.vnp_TxnRef;
  var paymentResult = await client.query(
    `SELECT payment_id, user_id, subscription_id, amount, payment_status, plan_type
     FROM payments
     WHERE transaction_code = $1
     FOR UPDATE`,
    [txnRef]
  );
  if (paymentResult.rowCount === 0) {
    return result(false, null, 'not_found', '01', 'Order not found');
  }

  var payment = paymentResult.rows[0];
  if (payment.payment_status !== 'PENDING') {
    var wasSuccess = payment.payment_status === 'SUCCESS';
    return result(
      wasSuccess,
      payment.plan_type,
      wasSuccess ? null : 'already_processed',
      '02',
      'Order already confirmed'
    );
  }

  var expectedAmount = vnpay.amountToVnpAmount(payment.amount);
  if (!params.vnp_Amount || String(params.vnp_Amount) !== expectedAmount) {
    await client.query(
      `UPDATE payments
       SET payment_status = 'FAILED',
           provider_response = $2
       WHERE payment_id = $1`,
      [payment.payment_id, providerResponse(params)]
    );
    return result(false, payment.plan_type, 'amount_mismatch', '04', 'Invalid amount');
  }

  var responseCode = params.vnp_ResponseCode;
  var transactionStatus = params.vnp_TransactionStatus;
  var isSuccess = responseCode === '00' && transactionStatus === '00';

  if (!isSuccess) {
    await client.query(
      `UPDATE payments
       SET payment_status = 'FAILED',
           provider_response = $2
       WHERE payment_id = $1`,
      [payment.payment_id, providerResponse(params)]
    );
    return result(false, payment.plan_type, 'vnpay_response_' + responseCode, '00', 'Confirm Success');
  }

  await client.query(
    `UPDATE payments
     SET payment_status = 'SUCCESS',
         provider_response = $2,
         paid_at = NOW()
     WHERE payment_id = $1`,
    [payment.payment_id, providerResponse(params)]
  );

  try {
    var subscriptionId = await activatePaidPlan(client, payment.user_id, payment.plan_type);
    await client.query(
      `UPDATE payments
       SET subscription_id = $2
       WHERE payment_id = $1`,
      [payment.payment_id, subscriptionId]
    );
  } catch (err) {
    activationPublicError(err);
    return result(false, payment.plan_type, 'activation_failed', '99', 'Confirm Success but activation failed');
  }

  return result(true, payment.plan_type, null, '00', 'Confirm Success');
}

router.post('/vnpay/create', authenticate, async function(req, res, next) {
  try {
    if (!vnpay.isConfigured()) {
      throw publicError('Chưa cấu hình VNPAY_TMN_CODE và VNPAY_HASH_SECRET cho Nodejs service.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
    }

    var planType = normalizePlan(req.body && req.body.planType);
    var prepared = await withTransaction(async function(client) {
      await assertPlanCanBePurchased(client, req.user.userId, planType);
      var plan = await fetchPaidPlan(client, planType);
      var txnRef = vnpay.generateTxnRef();
      var payment = await client.query(
        `INSERT INTO payments (
           user_id, amount, currency, payment_method, payment_status, transaction_code, plan_type, created_at
         ) VALUES (
           $1, $2, 'VND', 'VNPAY', 'PENDING', $3, $4, NOW()
         )
         RETURNING payment_id`,
        [req.user.userId, plan.price, txnRef, planType]
      );

      return {
        amount: plan.price,
        paymentId: payment.rows[0].payment_id,
        txnRef: txnRef,
      };
    });

    var paymentUrl = vnpay.buildPaymentUrl({
      amount: prepared.amount,
      clientIp: clientIp(req),
      orderInfo: 'Thanh toan goi ' + planType + ' Shelfy ' + prepared.paymentId,
      txnRef: prepared.txnRef,
    });

    return res.json({
      paymentUrl: paymentUrl,
      transactionCode: prepared.txnRef,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/vnpay/callback', async function(req, res, next) {
  try {
    var params = normalizeQueryParams(req.query);
    var paymentResult = await withTransaction(function(client) {
      return processVnpayParams(client, params, 'return');
    });
    return res.redirect(302, vnpay.frontendPaymentResultUrl(paymentResult));
  } catch (err) {
    return next(err);
  }
});

router.get('/vnpay/ipn', async function(req, res, next) {
  try {
    var params = normalizeQueryParams(req.query);
    var paymentResult = await withTransaction(function(client) {
      return processVnpayParams(client, params, 'ipn');
    });
    return res.json({
      RspCode: paymentResult.rspCode,
      Message: paymentResult.message,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
