const crypto = require('node:crypto');

const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const FREE_DAILY_LIMIT = 5;
const PREMIUM_MONTHLY_LIMIT = 50;
const SUPPORTED_CATEGORIES = new Set(['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR']);

function safeTimeZone(value) {
  if (typeof value !== 'string' || value.length > 64) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function localDateKey(milliseconds, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(milliseconds)).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function errorWithCode(HttpsError, code, message) {
  if (HttpsError) throw new HttpsError(code, message);
  const error = new Error(message);
  error.code = code;
  throw error;
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function imageUrl(item) {
  return item?.backgroundRemovedUrl
    || item?.image?.secureUrl
    || item?.thumbnail?.secureUrl
    || null;
}

function extractOutputUrl(prediction) {
  const output = prediction?.output;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return output.find((value) => typeof value === 'string') || null;
  if (output && typeof output === 'object') {
    return Object.values(output).find((value) => typeof value === 'string') || null;
  }
  return null;
}

function publicJob(jobId, data) {
  return {
    id: jobId,
    jobId,
    status: data.status || 'PENDING',
    resultImageUrl: data.resultImage?.secureUrl || null,
    processingTimeMs: Number.isFinite(data.processingTimeMs) ? data.processingTimeMs : null,
    accuracy: null,
    errorCode: data.errorCode || null,
    errorMessage: data.errorMessage || null,
    isSaved: Boolean(data.isSaved),
    savedAt: data.savedAt || null,
    createdAt: data.createdAt || null,
    completedAt: data.completedAt || null,
    clothingItem: data.itemSnapshot || null,
  };
}

function createTryOnService({
  database,
  serverTimestamp,
  deleteField = () => null,
  replicate,
  cloudinary,
  media,
  cloudName,
  now = Date.now,
  HttpsError,
}) {
  function requireUid(uid) {
    if (typeof uid !== 'string' || !uid) errorWithCode(HttpsError, 'unauthenticated', 'Vui lòng đăng nhập để thử đồ.');
  }

  function assertRequestId(requestId) {
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 100 || requestId.includes('/')) {
      errorWithCode(HttpsError, 'invalid-argument', 'Mã yêu cầu thử đồ không hợp lệ.');
    }
  }

  function validatePersonImage(uid, ref) {
    const currentCloudName = typeof cloudName === 'function' ? cloudName() : cloudName;
    const prefix = `https://res.cloudinary.com/${currentCloudName}/image/authenticated/`;
    if (!ref || ref.deliveryType !== 'authenticated'
      || typeof ref.secureUrl !== 'string' || !ref.secureUrl.startsWith(prefix)
      || typeof ref.publicId !== 'string' || !ref.publicId.startsWith(`${uid}/tryon-input/`)
      || !ref.secureUrl.includes(ref.publicId)
      || !['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(String(ref.format || '').toLowerCase())) {
      errorWithCode(HttpsError, 'invalid-argument', 'Ảnh người dùng chưa được tải lên Cloudinary bằng tài khoản hiện tại.');
    }
    return {
      secureUrl: ref.secureUrl,
      publicId: ref.publicId,
      format: String(ref.format).toLowerCase(),
      deliveryType: 'authenticated',
    };
  }

  function validateWardrobeImage(uid, item) {
    const currentCloudName = typeof cloudName === 'function' ? cloudName() : cloudName;
    const prefix = `https://res.cloudinary.com/${currentCloudName}/image/upload/`;
    const refs = [item.image, item.thumbnail].filter(Boolean);
    const valid = refs.find((ref) => ref && typeof ref.secureUrl === 'string'
      && ref.secureUrl.startsWith(prefix)
      && typeof ref.publicId === 'string'
      && ref.publicId.startsWith(`${uid}/wardrobe/`)
      && ref.secureUrl.includes(ref.publicId));
    if (!valid) errorWithCode(HttpsError, 'failed-precondition', 'Món đồ này chưa có ảnh Cloudinary hợp lệ để thử.');
    return valid.secureUrl;
  }

  function quotaFor(entitlement, dateKey) {
    const planId = String(entitlement?.planId || 'FREE').toUpperCase();
    const expiry = timestampMillis(entitlement?.expiresAt);
    const active = ['PRO', 'PREMIUM'].includes(planId)
      && expiry > now()
      && !['EXPIRED', 'CANCELED', 'CANCELLED', 'REVOKED'].includes(String(entitlement?.status || '').toUpperCase());
    const periodKey = active ? dateKey.slice(0, 7) : dateKey;
    const configuredLimit = Number(entitlement?.tryOnLimit);
    const limit = active
      ? Number.isSafeInteger(configuredLimit) && configuredLimit > 0
        ? Math.min(configuredLimit, 500)
        : PREMIUM_MONTHLY_LIMIT
      : FREE_DAILY_LIMIT;
    return { periodKey, limit };
  }

  function providerError(error) {
    const code = ['resource-exhausted', 'deadline-exceeded', 'unavailable'].includes(error?.code)
      ? error.code : 'unavailable';
    const message = code === 'deadline-exceeded'
      ? 'Dịch vụ thử đồ phản hồi quá lâu. Bạn có thể kiểm tra lại lịch sử sau.'
      : code === 'resource-exhausted'
        ? 'Dịch vụ thử đồ đang bận. Vui lòng thử lại sau.'
        : 'Không thể bắt đầu thử đồ lúc này. Vui lòng thử lại sau.';
    return { code, message };
  }

  function providerOutputUrl(prediction) {
    const value = extractOutputUrl(prediction);
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !(url.hostname === 'replicate.delivery' || url.hostname.endsWith('.replicate.delivery'))) return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  async function markProviderFailure(uid, jobId, code, message) {
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    await jobRef.update({
      status: 'FAILED',
      errorCode: code,
      errorMessage: message,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await clearPersonImage(uid, jobId);
  }

  async function clearPersonImage(uid, jobId) {
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const privateSnapshot = await privateRef.get();
    if (!privateSnapshot.exists) return;
    const privateData = privateSnapshot.data();
    const ref = privateData.personImage;
    if (!ref?.publicId) return;
    try {
      await cloudinary.deleteImage(ref.publicId);
      await privateRef.update({ personImage: deleteField(), inputCleanupPending: false });
    } catch {
      await privateRef.update({ inputCleanupPending: true });
    }
  }

  async function claimProviderStart(uid, jobId) {
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const claimId = crypto.randomUUID();
    let claimed = false;
    await database.runTransaction(async (transaction) => {
      const [privateSnapshot, jobSnapshot] = await Promise.all([
        transaction.get(privateRef),
        transaction.get(jobRef),
      ]);
      if (!privateSnapshot.exists || !jobSnapshot.exists) errorWithCode(HttpsError, 'not-found', 'Try-on job không tồn tại.');
      const internal = privateSnapshot.data();
      const job = jobSnapshot.data();
      if (job.isDeleted || ['DONE', 'FAILED'].includes(job.status) || internal.predictionId) return;
      if (Number(internal.providerClaimUntilMillis) > now()) return;
      transaction.update(privateRef, {
        providerClaimId: claimId,
        providerClaimUntilMillis: now() + 45_000,
      });
      claimed = true;
    });
    if (!claimed) return null;
    await submitPrediction(uid, jobId, claimId);
    return true;
  }

  async function persistProviderResult(uid, jobId, prediction, internal) {
    const resultUrl = providerOutputUrl(prediction);
    if (!resultUrl) {
      await markProviderFailure(uid, jobId, 'INVALID_PROVIDER_RESULT', 'Nhà cung cấp không trả ảnh kết quả hợp lệ.');
      return;
    }
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const claimId = crypto.randomUUID();
    let claimed = false;
    await database.runTransaction(async (transaction) => {
      const [jobSnapshot, privateSnapshot] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(privateRef),
      ]);
      if (!jobSnapshot.exists || !privateSnapshot.exists) errorWithCode(HttpsError, 'not-found', 'Try-on job không tồn tại.');
      if (jobSnapshot.data().isDeleted || jobSnapshot.data().status === 'DONE') return;
      if (Number(privateSnapshot.data().resultUploadLeaseUntilMillis) > now()) return;
      transaction.update(privateRef, { resultUploadClaimId: claimId, resultUploadLeaseUntilMillis: now() + 120_000 });
      claimed = true;
    });
    if (!claimed) return;

    let resultImage;
    let resultSaved = false;
    try {
      resultImage = await cloudinary.uploadResultFromUrl(resultUrl, { uid, jobId });
      await database.runTransaction(async (transaction) => {
        resultSaved = false;
        const [jobSnapshot, privateSnapshot] = await Promise.all([
          transaction.get(jobRef),
          transaction.get(privateRef),
        ]);
        if (!jobSnapshot.exists || !privateSnapshot.exists || jobSnapshot.data().isDeleted
          || privateSnapshot.data().resultUploadClaimId !== claimId) return;
        const metrics = prediction.metrics || {};
        const seconds = Number(metrics.predict_time || metrics.total_time);
        transaction.update(jobRef, {
          status: 'DONE',
          resultImage,
          processingTimeMs: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null,
          errorCode: null,
          errorMessage: null,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.update(privateRef, {
          resultUploadClaimId: deleteField(),
          resultUploadLeaseUntilMillis: 0,
        });
        resultSaved = true;
      });
    } catch {
      await privateRef.update({ resultUploadClaimId: deleteField(), resultUploadLeaseUntilMillis: 0 });
      const current = await jobRef.get();
      if (current.exists && !current.data().isDeleted) {
        await jobRef.update({
          errorCode: 'RESULT_STORAGE_PENDING',
          errorMessage: 'Đang lưu ảnh kết quả. Ứng dụng sẽ tự kiểm tra lại.',
          updatedAt: serverTimestamp(),
        });
      }
      return;
    }
    if (!resultSaved) {
      try { await cloudinary.deleteImage(resultImage.publicId); } catch { /* A later cleanup pass can retry. */ }
      return;
    }
    await clearPersonImage(uid, jobId);
  }

  async function create(uid, payload = {}) {
    requireUid(uid);
    assertRequestId(payload.requestId);
    if (!replicate.isConfigured()) errorWithCode(HttpsError, 'failed-precondition', 'Tính năng thử đồ hiện chưa được cấu hình.');
    const personImage = validatePersonImage(uid, payload.personImage);
    const clothingItemId = payload.clothingItemId;
    if (typeof clothingItemId !== 'string' || !clothingItemId || clothingItemId.length > 128 || clothingItemId.includes('/')) {
      errorWithCode(HttpsError, 'invalid-argument', 'Mã món đồ không hợp lệ.');
    }

    const profileSnapshot = await database.doc(`users/${uid}`).get();
    const timeZone = safeTimeZone(profileSnapshot.data()?.timeZone);
    const dateKey = localDateKey(now(), timeZone);
    const entitlementRef = database.doc(`users/${uid}/entitlements/current`);
    const itemRef = database.doc(`users/${uid}/wardrobe/${clothingItemId}`);
    const requestHash = crypto.createHash('sha256').update(`${uid}:${dateKey}:${payload.requestId}`).digest('hex');
    const receiptRef = database.doc(`_tryOnReceipts/${requestHash}`);
    const usageRef = database.doc(`_tryOnUsage/${crypto.createHash('sha256').update(uid).digest('hex')}`);
    const jobId = crypto.randomUUID();
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const claimId = crypto.randomUUID();
    let shouldStart = false;
    let responseJobId = jobId;
    let garmentImageUrl;
    let category;
    let itemSnapshotForClient;
    let garmentDescription;

    await database.runTransaction(async (transaction) => {
      shouldStart = false;
      const [receiptSnapshot, entitlementSnapshot, usageSnapshot, itemSnapshot] = await Promise.all([
        transaction.get(receiptRef),
        transaction.get(entitlementRef),
        transaction.get(usageRef),
        transaction.get(itemRef),
      ]);
      if (receiptSnapshot.exists) {
        responseJobId = receiptSnapshot.data().jobId;
        return;
      }
      if (!itemSnapshot.exists) errorWithCode(HttpsError, 'not-found', 'Món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.');
      const item = itemSnapshot.data();
      const mediaRefs = media ? await media.readAttachments(transaction, uid, [personImage], 'tryOnInput') : [];
      category = String(item.category || '').toUpperCase();
      if (!SUPPORTED_CATEGORIES.has(category)) errorWithCode(HttpsError, 'failed-precondition', 'Món này chưa phù hợp để thử AI.');
      garmentImageUrl = validateWardrobeImage(uid, item);
      itemSnapshotForClient = {
        id: clothingItemId,
        name: String(item.name || '').slice(0, 150),
        brand: String(item.brand || '').slice(0, 100),
        category,
        color: String(item.color || '').slice(0, 50),
        imageUrl: garmentImageUrl,
      };
      garmentDescription = [item.brand, item.name, item.color].filter(Boolean).join(' ').slice(0, 200);
      const quota = quotaFor(entitlementSnapshot.data(), dateKey);
      const usage = usageSnapshot.exists ? usageSnapshot.data() : {};
      const count = usage.periodKey === quota.periodKey ? Number(usage.count) || 0 : 0;
      if (count >= quota.limit) errorWithCode(HttpsError, 'resource-exhausted', 'Bạn đã hết lượt thử đồ trong kỳ hiện tại.');

      const stamp = serverTimestamp();
      if (media) media.retain(transaction, mediaRefs);
      transaction.create(jobRef, {
        status: 'PENDING',
        clothingItemId,
        itemSnapshot: itemSnapshotForClient,
        mediaPublicIds: [item.image?.publicId, item.thumbnail?.publicId].filter(Boolean),
        resultImage: null,
        processingTimeMs: null,
        errorCode: null,
        errorMessage: null,
        isSaved: false,
        savedAt: null,
        isDeleted: false,
        dateKey,
        timeZone,
        createdAt: stamp,
        updatedAt: stamp,
        completedAt: null,
      });
      transaction.create(privateRef, {
        uid,
        personImage,
        garmentImageUrl,
        garmentDescription,
        category,
        predictionId: null,
        providerClaimId: claimId,
        providerClaimUntilMillis: now() + 45_000,
        resultUploadLeaseUntilMillis: 0,
        inputCleanupPending: false,
        nextReconcileAtMillis: now() + 60_000,
        createdAt: stamp,
      });
      transaction.create(receiptRef, { uid, dateKey, jobId, createdAt: stamp });
      transaction.set(usageRef, { periodKey: quota.periodKey, count: count + 1, updatedAt: stamp });
      shouldStart = true;
    });

    if (shouldStart) await submitPrediction(uid, responseJobId, claimId);
    const saved = await database.doc(`users/${uid}/tryOns/${responseJobId}`).get();
    return publicJob(responseJobId, saved.data());
  }

  async function submitPrediction(uid, jobId, expectedClaimId) {
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const internalSnapshot = await privateRef.get();
    if (!internalSnapshot.exists) return;
    const internal = internalSnapshot.data();
    if (expectedClaimId && internal.providerClaimId !== expectedClaimId) return;
    try {
      const prediction = await replicate.createPrediction({
        personImageUrl: await cloudinary.createTemporaryInputUrl(internal.personImage),
        garmentImageUrl: internal.garmentImageUrl,
        garmentDescription: internal.garmentDescription,
        category: internal.category,
      });
      await database.runTransaction(async (transaction) => {
        const [currentInternal, jobSnapshot] = await Promise.all([
          transaction.get(privateRef),
          transaction.get(jobRef),
        ]);
        if (!currentInternal.exists || !jobSnapshot.exists || currentInternal.data().providerClaimId !== internal.providerClaimId) return;
        transaction.update(privateRef, {
          predictionId: prediction.id,
          providerClaimId: deleteField(),
          providerClaimUntilMillis: 0,
        });
        transaction.update(jobRef, { status: 'PROCESSING', updatedAt: serverTimestamp() });
      });
      if (prediction.status === 'succeeded') {
        await persistProviderResult(uid, jobId, prediction, internal);
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        await markProviderFailure(uid, jobId, 'PROVIDER_FAILED', 'Quá trình thử đồ không thành công. Vui lòng thử ảnh khác.');
      }
    } catch (error) {
      const mapped = providerError(error);
      await markProviderFailure(uid, jobId, mapped.code === 'resource-exhausted' ? 'PROVIDER_BUSY' : 'PROVIDER_UNAVAILABLE', mapped.message);
    }
  }

  async function getStatus(uid, jobId) {
    requireUid(uid);
    if (typeof jobId !== 'string' || !jobId || jobId.length > 128 || jobId.includes('/')) {
      errorWithCode(HttpsError, 'invalid-argument', 'Mã tiến trình thử đồ không hợp lệ.');
    }
    const jobRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const jobSnapshot = await jobRef.get();
    if (!jobSnapshot.exists || jobSnapshot.data().isDeleted) errorWithCode(HttpsError, 'not-found', 'Try-on job không tồn tại hoặc không thuộc tài khoản hiện tại.');
    let job = jobSnapshot.data();
    if (['PENDING', 'PROCESSING'].includes(job.status)) {
      const privateRef = database.doc(`_tryOnJobs/${jobId}`);
      const privateSnapshot = await privateRef.get();
      if (!privateSnapshot.exists) errorWithCode(HttpsError, 'not-found', 'Try-on job không tồn tại.');
      const internal = privateSnapshot.data();
      if (!internal.predictionId) {
        if (Number(internal.providerClaimUntilMillis) <= now()) await claimProviderStart(uid, jobId);
      } else {
        try {
          const prediction = await replicate.getPrediction(internal.predictionId);
          if (prediction.status === 'succeeded') await persistProviderResult(uid, jobId, prediction, internal);
          else if (prediction.status === 'failed' || prediction.status === 'canceled') {
            await markProviderFailure(uid, jobId, 'PROVIDER_FAILED', 'Quá trình thử đồ không thành công. Vui lòng thử ảnh khác.');
          } else if (job.status !== 'PROCESSING') {
            await jobRef.update({ status: 'PROCESSING', updatedAt: serverTimestamp() });
          }
        } catch (error) {
          if (error?.code !== 'unavailable' && error?.code !== 'deadline-exceeded') throw error;
        }
      }
    }
    const current = await jobRef.get();
    job = current.data();
    if (['DONE', 'FAILED'].includes(job.status)) await clearPersonImage(uid, jobId);
    return publicJob(jobId, job);
  }

  async function setSaved(uid, jobId, saved) {
    requireUid(uid);
    if (typeof jobId !== 'string' || !jobId || jobId.length > 128 || jobId.includes('/') || typeof saved !== 'boolean') {
      errorWithCode(HttpsError, 'invalid-argument', 'Thông tin lưu kết quả thử đồ không hợp lệ.');
    }
    const ref = database.doc(`users/${uid}/tryOns/${jobId}`);
    const current = await ref.get();
    if (!current.exists || current.data().isDeleted) errorWithCode(HttpsError, 'not-found', 'Try-on job không tồn tại hoặc không thuộc tài khoản hiện tại.');
    if (saved && current.data().status !== 'DONE') errorWithCode(HttpsError, 'failed-precondition', 'Chỉ có thể lưu kết quả thử đồ đã hoàn tất.');
    await ref.update({ isSaved: saved, savedAt: saved ? serverTimestamp() : null, updatedAt: serverTimestamp() });
    const updated = await ref.get();
    return publicJob(jobId, updated.data());
  }

  async function deleteHistory(uid, jobId) {
    requireUid(uid);
    if (typeof jobId !== 'string' || !jobId || jobId.length > 128 || jobId.includes('/')) {
      errorWithCode(HttpsError, 'invalid-argument', 'Mã tiến trình thử đồ không hợp lệ.');
    }
    const publicRef = database.doc(`users/${uid}/tryOns/${jobId}`);
    const privateRef = database.doc(`_tryOnJobs/${jobId}`);
    const current = await publicRef.get();
    if (!current.exists) return { jobId, deleted: true };
    await publicRef.update({ isDeleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const internal = await privateRef.get();
    if (internal.exists) await privateRef.update({ nextReconcileAtMillis: now() + 60_000 });
    if (internal.exists && internal.data().predictionId && ['PENDING', 'PROCESSING'].includes(current.data().status)) {
      try {
        await replicate.cancelPrediction(internal.data().predictionId);
        await privateRef.update({ cancellationPending: false });
      } catch { await privateRef.update({ cancellationPending: true }); }
    }
    if (internal.exists) {
      const data = internal.data();
      if (data.personImage?.publicId) {
        try {
          await cloudinary.deleteImage(data.personImage.publicId);
          await privateRef.update({ personImage: deleteField(), inputCleanupPending: false });
        } catch {
          await privateRef.update({ inputCleanupPending: true });
        }
      }
    }
    if (current.data().resultImage?.publicId) {
      try {
        await cloudinary.deleteImage(current.data().resultImage.publicId);
        await publicRef.update({ resultImage: deleteField(), resultCleanupPending: false });
      } catch {
        await publicRef.update({ resultCleanupPending: true });
      }
    }
    return { jobId, deleted: true };
  }

  async function reconcile() {
    const due = await database.collection('_tryOnJobs').where('nextReconcileAtMillis', '<=', now()).orderBy('nextReconcileAtMillis').limit(20).get();
    for (const internal of due.docs) {
      const { uid } = internal.data();
      // Defer first so one failing job cannot starve the rest of the queue.
      await internal.ref.update({ nextReconcileAtMillis: now() + 5 * 60_000 });
      try {
        const access = await database.doc(`_accountAccess/${uid}`).get();
        if (access.exists && access.data().status !== 'active') continue;
        const ref = database.doc(`users/${uid}/tryOns/${internal.id}`);
        const before = await ref.get();
        if (!before.exists) { await internal.ref.delete(); continue; }
        if (before.data().isDeleted) await deleteHistory(uid, internal.id);
        else await getStatus(uid, internal.id);
        const [job, state] = await Promise.all([ref.get(), internal.ref.get()]);
        const terminal = job.data().isDeleted || ['DONE', 'FAILED'].includes(job.data().status);
        const pending = state.data()?.inputCleanupPending || state.data()?.cancellationPending || job.data().resultCleanupPending;
        await internal.ref.update({ nextReconcileAtMillis: terminal && !pending ? Number.MAX_SAFE_INTEGER : now() + 5 * 60_000 });
      } catch { /* The persisted due date guarantees a bounded retry on the next run. */ }
    }
    return { examined: due.size };
  }
  return { create, getStatus, setSaved, deleteHistory, reconcile };
}

module.exports = { FREE_DAILY_LIMIT, PREMIUM_MONTHLY_LIMIT, SUPPORTED_CATEGORIES, createTryOnService, localDateKey };
