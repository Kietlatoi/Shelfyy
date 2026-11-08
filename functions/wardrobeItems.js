const crypto = require('node:crypto');

const CATEGORIES = new Set(['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER']);
const STATUSES = new Set(['IN_USE', 'RARELY_USED', 'STORED', 'TO_SELL']);
const OPTIONAL_STRINGS = {
  brand: 100,
  subCategory: 100,
  color: 50,
  colorHex: 20,
  season: 50,
  size: 30,
  pattern: 100,
  material: 100,
  purchaseDate: 32,
  sourceUrl: 2048,
  backgroundRemovedUrl: 2048,
};
const FREE_WARDROBE_LIMIT = 100;

function millis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function createWardrobeItemsService({
  database,
  serverTimestamp,
  cloudName,
  media,
  createId = () => crypto.randomUUID(),
  now = Date.now,
  HttpsError,
}) {
  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function requireUid(uid) {
    if (typeof uid !== 'string' || !uid) fail('unauthenticated', 'Vui lòng đăng nhập để sử dụng tủ đồ.');
  }

  function validateAsset(uid, asset, field) {
    if (asset == null) return null;
    const name = typeof cloudName === 'function' ? cloudName() : cloudName;
    const prefix = `https://res.cloudinary.com/${name}/image/upload/`;
    if (!asset || typeof asset !== 'object'
      || typeof asset.secureUrl !== 'string' || !asset.secureUrl.startsWith(prefix)
      || typeof asset.publicId !== 'string' || !asset.publicId.startsWith(`${uid}/wardrobe/`)
      || !asset.secureUrl.includes(asset.publicId)) {
      fail('invalid-argument', `Ảnh ${field} phải thuộc tài khoản Cloudinary của bạn.`);
    }
    return { secureUrl: asset.secureUrl, publicId: asset.publicId };
  }

  function normalizePayload(uid, payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      fail('invalid-argument', 'Thông tin món đồ không hợp lệ.');
    }
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const category = typeof payload.category === 'string' ? payload.category.toUpperCase() : '';
    if (!name || name.length > 150) fail('invalid-argument', 'Tên món đồ phải có từ 1 đến 150 ký tự.');
    if (!CATEGORIES.has(category)) fail('invalid-argument', 'Danh mục món đồ không hợp lệ.');
    if (payload.purchasePrice != null
      && (!Number.isFinite(Number(payload.purchasePrice)) || Number(payload.purchasePrice) < 0 || Number(payload.purchasePrice) > 1_000_000_000)) {
      fail('invalid-argument', 'Giá mua phải nằm trong khoảng hợp lệ.');
    }
    if (payload.favorite != null && typeof payload.favorite !== 'boolean') {
      fail('invalid-argument', 'Trạng thái yêu thích không hợp lệ.');
    }
    if (payload.status != null && !STATUSES.has(payload.status)) {
      fail('invalid-argument', 'Trạng thái món đồ không hợp lệ.');
    }
    if (payload.tags != null && (!Array.isArray(payload.tags) || payload.tags.length > 25
      || payload.tags.some((tag) => typeof tag !== 'string' || tag.length > 50))) {
      fail('invalid-argument', 'Danh sách tags không hợp lệ.');
    }

    const result = {
      name,
      category,
      favorite: payload.favorite === true,
      status: payload.status || 'IN_USE',
      tags: Array.isArray(payload.tags) ? payload.tags.slice() : [],
      image: validateAsset(uid, payload.image, 'chính'),
      thumbnail: validateAsset(uid, payload.thumbnail, 'thu nhỏ'),
    };
    if (payload.purchasePrice != null) result.purchasePrice = Number(payload.purchasePrice);
    for (const [field, maxLength] of Object.entries(OPTIONAL_STRINGS)) {
      if (payload[field] == null) { if (Object.hasOwn(payload, field)) result[field] = null; continue; }
      if (typeof payload[field] !== 'string' || payload[field].length > maxLength) {
        fail('invalid-argument', `Trường ${field} không hợp lệ.`);
      }
      result[field] = payload[field];
    }
    return result;
  }

  function wardrobeLimit(entitlement, currentTime) {
    const planId = String(entitlement?.planId || 'FREE').toUpperCase();
    const expiresAt = millis(entitlement?.expiresAt);
    const active = ['PRO', 'PREMIUM'].includes(planId)
      && expiresAt > currentTime
      && !['CANCELED', 'CANCELLED', 'EXPIRED', 'REVOKED'].includes(String(entitlement?.status || '').toUpperCase());
    const configured = Number(entitlement?.wardrobeLimit);
    return active
      ? Number.isSafeInteger(configured) && configured > 0 ? configured : -1
      : FREE_WARDROBE_LIMIT;
  }

  async function create(uid, payload) {
    requireUid(uid);
    const data = normalizePayload(uid, payload);
    const id = createId();
    if (typeof id !== 'string' || !id || id.includes('/')) fail('internal', 'Không thể tạo mã món đồ.');
    const itemRef = database.doc(`users/${uid}/wardrobe/${id}`);
    const entitlementRef = database.doc(`users/${uid}/entitlements/current`);
    const counterRef = database.doc(`_wardrobeCounters/${uid}`);
    const timestamp = serverTimestamp();
    const item = {
      ...data,
      wearCount: 0,
      lastWornAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await database.runTransaction(async (transaction) => {
      const [entitlement, counter, existing] = await Promise.all([
        transaction.get(entitlementRef), transaction.get(counterRef), transaction.get(itemRef),
      ]);
      if (existing.exists) fail('already-exists', 'Mã món đồ đã được sử dụng.');
      const count = Math.max(0, Number(counter.data()?.count) || 0);
      const limit = wardrobeLimit(entitlement.exists ? entitlement.data() : null, now());
      if (limit !== -1 && count >= limit) {
        fail('resource-exhausted', 'Tủ đồ đã đạt giới hạn của gói hiện tại. Hãy xóa bớt món hoặc nâng cấp gói.');
      }
      const attachments = [data.image, data.thumbnail].filter(Boolean);
      if (attachments.length && !media) fail('failed-precondition', 'Chưa cấu hình xác minh ảnh.');
      const refs = media ? await media.readAttachments(transaction, uid, attachments, 'wardrobe') : [];
      if (media) media.retain(transaction, refs);
      transaction.create(itemRef, item);
      if (counter.exists) transaction.update(counterRef, { count: count + 1, updatedAt: timestamp });
      else transaction.create(counterRef, { count: count + 1, updatedAt: timestamp });
    });

    const saved = await itemRef.get();
    return { ...saved.data(), id };
  }

  async function remove(uid, itemId) {
    requireUid(uid);
    if (typeof itemId !== 'string' || !itemId || itemId.length > 128 || itemId.includes('/')) {
      fail('invalid-argument', 'Mã món đồ không hợp lệ.');
    }
    const itemRef = database.doc(`users/${uid}/wardrobe/${itemId}`);
    const counterRef = database.doc(`_wardrobeCounters/${uid}`);
    await database.runTransaction(async (transaction) => {
      const [item, counter] = await Promise.all([transaction.get(itemRef), transaction.get(counterRef)]);
      if (!item.exists) return;
      const count = Math.max(0, Number(counter.data()?.count) || 0);
      if (media) media.release(transaction, uid, [item.data().image, item.data().thumbnail]);
      transaction.delete(itemRef);
      if (counter.exists) transaction.update(counterRef, { count: Math.max(0, count - 1), updatedAt: serverTimestamp() });
      else transaction.create(counterRef, { count: 0, updatedAt: serverTimestamp() });
    });
    return { id: itemId, deleted: true };
  }

  async function update(uid, itemId, payload) {
    requireUid(uid);
    if (typeof itemId !== 'string' || !itemId || itemId.includes('/') || itemId.length > 128) fail('invalid-argument', 'Mã món đồ không hợp lệ.');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('invalid-argument', 'Thông tin món đồ không hợp lệ.');
    const ref = database.doc(`users/${uid}/wardrobe/${itemId}`);
    await database.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail('not-found', 'Không tìm thấy món đồ này.');
      const data = normalizePayload(uid, { ...snap.data(), ...payload });
      const attachments = [data.image, data.thumbnail].filter(Boolean);
      if (attachments.length && !media) fail('failed-precondition', 'Chưa cấu hình xác minh ảnh.');
      const refs = media ? await media.readAttachments(tx, uid, attachments, 'wardrobe') : [];
      if (media) {
        media.retain(tx, refs);
        media.release(tx, uid, [snap.data().image, snap.data().thumbnail].filter((old) => old && !attachments.some((asset) => asset.publicId === old.publicId)));
      }
      tx.update(ref, { ...data, updatedAt: serverTimestamp() });
    });
    const saved = await ref.get();
    return { ...saved.data(), id: itemId };
  }
  return { create, update, delete: remove };
}

module.exports = { createWardrobeItemsService };
