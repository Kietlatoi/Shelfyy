// Callable and trigger implementations are added with their feature slices.
const crypto = require('node:crypto');
const { defineString, defineSecret } = require('firebase-functions/params');
const { HttpsError, onCall: firebaseOnCall, onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { createCloudinarySignature } = require('./cloudinarySignature');
const { createCalendarService } = require('./calendar');
const { createCalendarOAuthService } = require('./calendarOAuth');
const { createCloudinaryAssets } = require('./cloudinaryAssets');
const { createDailyOutfitService } = require('./dailyOutfits');
const { createBillingService } = require('./billing');
const { createReplicateClient } = require('./replicateClient');
const { createStylingService } = require('./styling');
const { createTryOnService } = require('./tryOn');
const { createWeatherService } = require('./weather');
const { createVnpayClient, DEFAULT_PAY_URL } = require('./vnpayClient');
const { createWardrobeItemsService } = require('./wardrobeItems');
const { createMediaService } = require('./media');
const { createAccountLifecycle } = require('./accountLifecycle');

initializeApp();
const database = getFirestore();
function onCall(options, handler) {
  return firebaseOnCall({ maxInstances: 5, ...options }, async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Vui lòng đăng nhập.');
    const [user, access] = await Promise.all([getAuth().getUser(request.auth.uid), database.doc(`_accountAccess/${request.auth.uid}`).get()]);
    if (user.disabled || (access.exists && access.data().status !== 'active')) {
      throw new HttpsError('permission-denied', 'Tài khoản đã bị khóa hoặc đang được xóa.');
    }
    return handler(request);
  });
}
const weatherService = createWeatherService({
  database,
  serverTimestamp: () => FieldValue.serverTimestamp(),
  HttpsError,
});
const cloudinaryCloudName = defineString('CLOUDINARY_CLOUD_NAME', { default: 'demo-cloud' });
const cloudinaryApiKey = defineString('CLOUDINARY_API_KEY', { default: 'demo-api-key' });
const cloudinaryApiSecret = defineSecret('CLOUDINARY_API_SECRET');
const googleCalendarClientId = defineString('GOOGLE_CALENDAR_CLIENT_ID', { default: 'demo-client-id.apps.googleusercontent.com' });
const googleCalendarRedirectUri = defineString('GOOGLE_CALENDAR_REDIRECT_URI', { default: 'https://example.invalid/googleCalendarCallback' });
const googleCalendarClientSecret = defineSecret('GOOGLE_CALENDAR_CLIENT_SECRET');
const replicateApiToken = defineSecret('REPLICATE_API_TOKEN');
const replicateModelVersion = defineString('REPLICATE_IDM_VTON_VERSION', {
  default: '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
});
const vnpayTmnCode = defineString('VNPAY_TMN_CODE', { default: '' });
const vnpayHashSecret = defineSecret('VNPAY_HASH_SECRET');
const vnpayPaymentEnabled = defineString('VNPAY_PAYMENT_ENABLED', { default: 'false' });
const vnpayPayUrl = defineString('VNPAY_PAY_URL', { default: DEFAULT_PAY_URL });
const vnpayReturnUrl = defineString('VNPAY_RETURN_URL', { default: '' });
const vnpayIpnUrl = defineString('VNPAY_IPN_URL', { default: '' });

const calendarOAuthService = createCalendarOAuthService({
  database,
  clientId: () => googleCalendarClientId.value(),
  clientSecret: () => googleCalendarClientSecret.value(),
  redirectUri: () => googleCalendarRedirectUri.value(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) => Timestamp.fromMillis(millis),
  HttpsError,
});
const calendarService = createCalendarService({
  database,
  clientId: () => googleCalendarClientId.value(),
  clientSecret: () => googleCalendarClientSecret.value(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  HttpsError,
});
const stylingService = createStylingService({
  database,
  media: { readAttachments: (...args) => mediaService.readAttachments(...args), retain: (...args) => mediaService.retain(...args) },
  serverTimestamp: () => FieldValue.serverTimestamp(),
  HttpsError,
});
const dailyOutfitService = createDailyOutfitService({
  database,
  media: { readAttachments: (...args) => mediaService.readAttachments(...args), retain: (...args) => mediaService.retain(...args) },
  serverTimestamp: () => FieldValue.serverTimestamp(),
  HttpsError,
});
const replicateClient = createReplicateClient({
  apiToken: () => replicateApiToken.value(),
  modelVersion: () => replicateModelVersion.value(),
});
const cloudinaryAssets = createCloudinaryAssets({
  cloudName: () => cloudinaryCloudName.value(),
  apiKey: () => cloudinaryApiKey.value(),
  apiSecret: () => cloudinaryApiSecret.value(),
});
const mediaService = createMediaService({ database, cloudinary: cloudinaryAssets, serverTimestamp: () => FieldValue.serverTimestamp(), HttpsError });
const tryOnService = createTryOnService({
  database,
  serverTimestamp: () => FieldValue.serverTimestamp(),
  deleteField: () => FieldValue.delete(),
  replicate: replicateClient,
  cloudinary: cloudinaryAssets,
  media: mediaService,
  cloudName: () => cloudinaryCloudName.value(),
  HttpsError,
});
const vnpayClient = createVnpayClient({
  getConfig: () => ({
    tmnCode: vnpayTmnCode.value(),
    hashSecret: vnpayHashSecret.value(),
    payUrl: vnpayPayUrl.value(),
    returnUrl: vnpayReturnUrl.value(),
    ipnUrl: vnpayIpnUrl.value(),
  }),
});
const billingService = createBillingService({
  database,
  vnpay: vnpayClient,
  paymentsEnabled: () => vnpayPaymentEnabled.value().toLowerCase() === 'true',
  serverTimestamp: () => FieldValue.serverTimestamp(),
  HttpsError,
});
const wardrobeItemsService = createWardrobeItemsService({
  database,
  serverTimestamp: () => FieldValue.serverTimestamp(),
  cloudName: () => cloudinaryCloudName.value(),
  media: mediaService,
  HttpsError,
});
const accountLifecycle = createAccountLifecycle({ database, auth: getAuth(), cloudinary: cloudinaryAssets, tryOn: tryOnService,
  calendar: calendarService, serverTimestamp: () => FieldValue.serverTimestamp(), HttpsError });
exports.requestAccountDeletion = onCall({ region: 'asia-southeast1' }, (request) => accountLifecycle.requestSelfDeletion(request));
exports.processAccountDeletions = onSchedule({ region: 'asia-southeast1', schedule: 'every 5 minutes', timeoutSeconds: 540,
  maxInstances: 1, secrets: [cloudinaryApiSecret, replicateApiToken] }, () => accountLifecycle.processQueue());

exports.getSubscriptionPlans = onCall(
  { region: 'asia-southeast1' },
  (request) => billingService.getPlans(request.auth?.uid)
);

exports.getMyEntitlement = onCall(
  { region: 'asia-southeast1' },
  (request) => billingService.getMyPlan(request.auth?.uid)
);

exports.createWardrobeItem = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30 },
  (request) => wardrobeItemsService.create(request.auth?.uid, request.data)
);

exports.deleteWardrobeItem = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30 },
  (request) => wardrobeItemsService.delete(request.auth?.uid, request.data?.itemId)
);

exports.updateWardrobeItem = onCall({ region: 'asia-southeast1' },
  (request) => wardrobeItemsService.update(request.auth.uid, request.data?.itemId, request.data?.payload));
exports.completeCloudinaryUpload = onCall({ region: 'asia-southeast1', timeoutSeconds: 30, secrets: [cloudinaryApiSecret] },
  (request) => mediaService.complete(request.auth.uid, request.data?.publicId));
exports.setProfileAvatar = onCall({ region: 'asia-southeast1' },
  (request) => mediaService.setAvatar(request.auth.uid, request.data?.avatar));
exports.cleanupCloudinaryAssets = onSchedule({ region: 'asia-southeast1', schedule: 'every 60 minutes', timeoutSeconds: 540, maxInstances: 1, secrets: [cloudinaryApiSecret] },
  () => mediaService.cleanup());
exports.reconcileTryOnJobs = onSchedule({ region: 'asia-southeast1', schedule: 'every 5 minutes', timeoutSeconds: 540, maxInstances: 1, secrets: [replicateApiToken, cloudinaryApiSecret] },
  () => tryOnService.reconcile());

exports.createVnpayPayment = onCall(
  { region: 'asia-southeast1', secrets: [vnpayHashSecret] },
  (request) => billingService.createVnpayPayment(request.auth?.uid, {
    planId: request.data?.planId || request.data?.planType,
    clientIp: request.rawRequest?.ip,
  })
);

function normalizeVnpayQuery(query) {
  const params = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) params[key] = value;
  }
  return params;
}

exports.vnpayIpn = onRequest(
  { region: 'asia-southeast1', timeoutSeconds: 30, secrets: [vnpayHashSecret] },
  async (request, response) => {
    if (request.method !== 'GET') return response.status(405).json({ RspCode: '99', Message: 'Method not allowed' });
    try {
      const result = await billingService.processVnpayCallback(normalizeVnpayQuery(request.query));
      return response.status(200).json({ RspCode: result.rspCode, Message: result.message });
    } catch {
      return response.status(200).json({ RspCode: '99', Message: 'Internal error' });
    }
  }
);

exports.vnpayReturn = onRequest(
  { region: 'asia-southeast1', timeoutSeconds: 30, secrets: [vnpayHashSecret] },
  async (request, response) => {
    response.set('Cache-Control', 'no-store, max-age=0');
    response.set('Referrer-Policy', 'no-referrer');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (request.method !== 'GET') return response.status(405).send('Method not allowed.');
    let status = 'Không thể xác nhận trạng thái thanh toán.';
    try {
      const result = await billingService.processVnpayCallback(normalizeVnpayQuery(request.query));
      status = result.status === 'SUCCESS' || result.success
        ? 'Thanh toán đã được xác nhận. Hãy quay lại Shelfy để xem quyền lợi mới.'
        : result.status === 'REVIEW'
          ? 'Đã nhận thông tin thanh toán. Shelfy cần kiểm tra giao dịch này trước khi kích hoạt gói.'
          : 'Giao dịch chưa thành công. Hãy quay lại Shelfy để thử lại nếu cần.';
    } catch {
      status = 'Chưa thể cập nhật giao dịch. Hãy quay lại Shelfy sau ít phút.';
    }
    return response.status(200).type('html').send(
      '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Thanh toán Shelfy</title></head><body><main><h1>Thanh toán Shelfy</h1><p>' +
      status + '</p><p>Bạn có thể đóng trang này và quay lại ứng dụng.</p></main></body></html>'
    );
  }
);

exports.createTryOnJob = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 60, secrets: [replicateApiToken, cloudinaryApiSecret] },
  (request) => tryOnService.create(request.auth?.uid, request.data)
);

exports.getTryOnJobStatus = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 60, secrets: [replicateApiToken, cloudinaryApiSecret] },
  (request) => tryOnService.getStatus(request.auth?.uid, request.data?.jobId)
);

exports.setTryOnJobSaved = onCall(
  { region: 'asia-southeast1' },
  (request) => tryOnService.setSaved(request.auth?.uid, request.data?.jobId, request.data?.saved)
);

exports.deleteTryOnJob = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30, secrets: [replicateApiToken, cloudinaryApiSecret] },
  (request) => tryOnService.deleteHistory(request.auth?.uid, request.data?.jobId)
);

exports.getLatestTodaySuggestion = onCall(
  { region: 'asia-southeast1' },
  (request) => stylingService.latestToday(request.auth?.uid)
);

exports.generateTodaySuggestion = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30 },
  (request) => stylingService.generateToday(request.auth?.uid, request.data)
);

exports.getTodayDailyOutfit = onCall(
  { region: 'asia-southeast1' },
  (request) => dailyOutfitService.getToday(request.auth?.uid)
);

exports.confirmTodayDailyOutfit = onCall(
  { region: 'asia-southeast1' },
  (request) => dailyOutfitService.confirmToday(request.auth?.uid, request.data)
);

exports.createCloudinaryUploadSignature = onCall(
  { region: 'asia-southeast1', secrets: [cloudinaryApiSecret], enforceAppCheck: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Vui lòng đăng nhập để tải ảnh lên.');

    const intent = request.data?.intent;
    if (intent !== 'avatar' && intent !== 'wardrobe' && intent !== 'tryOnInput') {
      throw new HttpsError('invalid-argument', 'Loại ảnh tải lên không hợp lệ.');
    }

    const cloudName = cloudinaryCloudName.value();
    const apiKey = cloudinaryApiKey.value();
    const apiSecret = cloudinaryApiSecret.value();
    if (!cloudName || !apiKey || !apiSecret || cloudName === 'demo-cloud' || apiKey === 'demo-api-key') {
      throw new HttpsError('failed-precondition', 'Chưa cấu hình Cloudinary cho môi trường này.');
    }

    const date = new Date().toISOString().slice(0, 10);
    const usageRef = database.doc(`_uploadRateLimits/${uid}`);
    await database.runTransaction(async (transaction) => {
      const usage = await transaction.get(usageRef);
      const count = usage.data()?.date === date ? usage.data().count || 0 : 0;
      if (count >= 40) {
        throw new HttpsError('resource-exhausted', 'Bạn đã đạt giới hạn tải ảnh hôm nay.');
      }
      transaction.set(usageRef, { date, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    });

    const parameters = {
      folder: `${uid}/${intent === 'avatar' ? 'avatars' : intent === 'tryOnInput' ? 'tryon-input' : 'wardrobe'}`,
      public_id: crypto.randomBytes(16).toString('hex'),
      timestamp: Math.floor(Date.now() / 1000),
      overwrite: false,
    };
    if (intent === 'tryOnInput') parameters.type = 'authenticated';
    await mediaService.register(uid, intent, `${parameters.folder}/${parameters.public_id}`);

    return {
      ...parameters,
      signature: createCloudinarySignature(parameters, apiSecret),
      apiKey,
      cloudName,
    };
  }
);

exports.markWardrobeItemWorn = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Vui lòng đăng nhập để cập nhật lịch sử mặc.');
  const itemId = request.data?.itemId;
  if (typeof itemId !== 'string' || itemId.length < 1 || itemId.length > 128 || itemId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Mã món đồ không hợp lệ.');
  }

  const itemRef = database.doc(`users/${uid}/wardrobe/${itemId}`);
  const requestId = request.data?.requestId;
  if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100 || requestId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Mã thao tác không hợp lệ.');
  }
  const receiptRef = database.doc(`_wearEventReceipts/${uid}_${requestId}`);
  await database.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return;
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Không tìm thấy món đồ này.');
    transaction.update(itemRef, {
      wearCount: FieldValue.increment(1),
      lastWornAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(receiptRef, {
      uid,
      itemId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { itemId, marked: true };
});

exports.createWeatherSnapshot = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30, memory: '256MiB' },
  (request) => weatherService.createSnapshot(request.auth?.uid, request.data)
);

exports.startGoogleCalendarOAuth = onCall(
  { region: 'asia-southeast1' },
  (request) => calendarOAuthService.start(request.auth?.uid)
);

exports.googleCalendarCallback = onRequest(
  { region: 'asia-southeast1', timeoutSeconds: 30, secrets: [googleCalendarClientSecret] },
  async (request, response) => {
    response.set('Cache-Control', 'no-store, max-age=0');
    response.set('Referrer-Policy', 'no-referrer');
    response.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (request.method !== 'GET') return response.status(405).send('Method not allowed.');

    const result = await calendarOAuthService.complete({
      state: typeof request.query.state === 'string' ? request.query.state : '',
      code: typeof request.query.code === 'string' ? request.query.code : '',
      error: typeof request.query.error === 'string' ? request.query.error : '',
    });
    const messages = {
      connected: 'Đã kết nối Google Calendar. Đóng trang này và quay lại Shelfy để xem lịch.',
      denied: 'Bạn chưa cấp quyền Google Calendar. Quay lại Shelfy nếu muốn thử lại.',
      error: 'Chưa thể kết nối Google Calendar. Quay lại Shelfy và thử kết nối lại.',
    };
    response.status(200).type('html').send(
      '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Google Calendar · Shelfy</title></head><body><main><h1>Google Calendar</h1><p>' +
      messages[result.status] + '</p></main></body></html>'
    );
  }
);

exports.syncGoogleCalendarToday = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30, secrets: [googleCalendarClientSecret] },
  (request) => calendarService.syncToday(request.auth?.uid)
);

exports.disconnectGoogleCalendar = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30 },
  (request) => calendarService.disconnect(request.auth?.uid)
);
