const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const MAX_OUTFIT_ITEMS = 20;

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

function validTimeZone(value) {
  if (typeof value !== 'string' || value.length > 64) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function fail(HttpsError, code, message) {
  if (HttpsError) throw new HttpsError(code, message);
  const error = new Error(message);
  error.code = code;
  throw error;
}

function stringField(value, maximum, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.length > maximum) return null;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function selectItem(id, data) {
  const image = data.image && typeof data.image === 'object' ? data.image.secureUrl : null;
  const thumbnail = data.thumbnail && typeof data.thumbnail === 'object' ? data.thumbnail.secureUrl : null;
  return {
    id,
    name: data.name || '',
    brand: data.brand || '',
    category: data.category || 'OTHER',
    color: data.color || '',
    colorHex: data.colorHex || null,
    season: data.season || '',
    pattern: data.pattern || '',
    size: data.size || '',
    material: data.material || '',
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 25) : [],
    imageUrl: image || thumbnail || data.sourceUrl || null,
    thumbnailUrl: thumbnail || image || null,
    backgroundRemovedUrl: data.backgroundRemovedUrl || null,
    image: data.image || null,
    thumbnail: data.thumbnail || null,
    wearCount: Number(data.wearCount) || 0,
    lastWornAt: data.lastWornAt || null,
    favorite: Boolean(data.favorite),
    itemStatus: data.status || 'IN_USE',
  };
}

function toResponse(id, data) {
  const items = Array.isArray(data.itemSnapshots) ? data.itemSnapshots : [];
  const outfit = {
    id,
    name: data.name || 'Outfit hôm nay',
    description: data.description || '',
    occasion: data.occasion || '',
    style: data.style || null,
    source: data.source || 'USER_CREATED',
    favorite: Boolean(data.favorite),
    createdAt: data.createdAt || null,
    itemIds: Array.isArray(data.itemIds) ? data.itemIds : items.map((item) => item.id),
    items,
  };
  return {
    id,
    confirmed: true,
    wornDate: data.dateKey,
    confirmedAt: data.confirmedAt || null,
    weatherSnapshotId: data.weatherSnapshotId || null,
    calendarEventId: data.calendarEventId || null,
    notes: data.notes || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    itemIds: outfit.itemIds,
    items,
    outfit,
    wearCountUpdated: data.wearCountUpdated || { addedItemIds: [], removedItemIds: [] },
  };
}

function createDailyOutfitService({ database, serverTimestamp, now = Date.now, HttpsError, media }) {
  function requireUid(uid) {
    if (typeof uid !== 'string' || !uid) fail(HttpsError, 'unauthenticated', 'Vui lòng đăng nhập để xác nhận outfit.');
  }

  async function dateFor(uid) {
    const profile = await database.doc(`users/${uid}`).get();
    const timeZone = validTimeZone(profile.data()?.timeZone);
    return { timeZone, dateKey: localDateKey(now(), timeZone) };
  }

  async function getToday(uid) {
    requireUid(uid);
    const { dateKey } = await dateFor(uid);
    const snapshot = await database.doc(`users/${uid}/dailyOutfits/${dateKey}`).get();
    if (!snapshot.exists) return { confirmed: false, wornDate: dateKey, outfit: null };
    return toResponse(dateKey, snapshot.data());
  }

  async function confirmToday(uid, payload = {}) {
    requireUid(uid);
    if (!Array.isArray(payload.itemIds) || payload.itemIds.length === 0 || payload.itemIds.length > MAX_OUTFIT_ITEMS) {
      fail(HttpsError, 'invalid-argument', `Chọn từ 1 đến ${MAX_OUTFIT_ITEMS} món đồ để xác nhận outfit hôm nay.`);
    }
    const itemIds = payload.itemIds;
    if (itemIds.some((id) => typeof id !== 'string' || !id || id.length > 128 || id.includes('/'))
      || new Set(itemIds).size !== itemIds.length) {
      fail(HttpsError, 'invalid-argument', 'Danh sách mã món đồ không hợp lệ.');
    }
    const name = stringField(payload.name, 150, 'Outfit hôm nay');
    const occasion = stringField(payload.occasion, 100, 'Hôm nay');
    const description = stringField(payload.description, 500, 'Người dùng tự chọn trong tủ đồ cá nhân.');
    const notes = stringField(payload.notes, 500, null);
    if (name === null || occasion === null || description === null || (payload.notes != null && notes === null)) {
      fail(HttpsError, 'invalid-argument', 'Tên outfit, dịp mặc hoặc ghi chú không hợp lệ.');
    }
    const suggestionId = payload.suggestionId;
    if (suggestionId !== undefined && (typeof suggestionId !== 'string' || !suggestionId || suggestionId.length > 128 || suggestionId.includes('/'))) {
      fail(HttpsError, 'invalid-argument', 'Mã gợi ý không hợp lệ.');
    }

    const { timeZone, dateKey } = await dateFor(uid);
    const dailyRef = database.doc(`users/${uid}/dailyOutfits/${dateKey}`);
    const itemRefs = itemIds.map((itemId) => database.doc(`users/${uid}/wardrobe/${itemId}`));
    const suggestionRef = suggestionId ? database.doc(`users/${uid}/suggestions/${suggestionId}`) : null;
    await database.runTransaction(async (transaction) => {
      const reads = await Promise.all([
        transaction.get(dailyRef),
        ...itemRefs.map((reference) => transaction.get(reference)),
        ...(suggestionRef ? [transaction.get(suggestionRef)] : []),
      ]);
      const dailySnapshot = reads[0];
      const itemSnapshots = reads.slice(1, itemRefs.length + 1);
      const suggestionSnapshot = suggestionRef ? reads[itemRefs.length + 1] : null;
      const wardrobeItems = itemSnapshots.map((snapshot, index) => {
        if (!snapshot.exists) fail(HttpsError, 'not-found', 'Một số món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.');
        const data = snapshot.data();
        if (data.status === 'TO_SELL') fail(HttpsError, 'failed-precondition', 'Không thể xác nhận món đồ đã chuyển sang mục cần bán.');
        return selectItem(itemIds[index], data);
      });
      if (suggestionRef && !suggestionSnapshot.exists) {
        fail(HttpsError, 'not-found', 'Gợi ý không tồn tại hoặc không thuộc tài khoản hiện tại.');
      }
      if (suggestionRef && suggestionSnapshot.data().dateKey !== dateKey) {
        fail(HttpsError, 'failed-precondition', 'Chỉ có thể xác nhận gợi ý của hôm nay.');
      }
      const linkedSuggestion = suggestionSnapshot?.data() || null;

      const previousIds = dailySnapshot.exists && Array.isArray(dailySnapshot.data().itemIds)
        ? dailySnapshot.data().itemIds : [];
      const previousSet = new Set(previousIds);
      const nextSet = new Set(itemIds);
      const addedItemIds = itemIds.filter((id) => !previousSet.has(id));
      const removedItemIds = previousIds.filter((id) => !nextSet.has(id));
      const removedItemRefs = removedItemIds.map((itemId) => database.doc(`users/${uid}/wardrobe/${itemId}`));
      const removedItemSnapshots = await Promise.all(removedItemRefs.map((reference) => transaction.get(reference)));
      const mediaRefs = media ? await media.readAttachments(transaction, uid, wardrobeItems.flatMap((item) => [item.image, item.thumbnail]), 'wardrobe') : [];
      if (media) media.retain(transaction, mediaRefs);

      for (let index = 0; index < itemRefs.length; index += 1) {
        const itemId = itemIds[index];
        const data = itemSnapshots[index].data();
        if (addedItemIds.includes(itemId)) {
          transaction.update(itemRefs[index], {
            wearCount: (Number(data.wearCount) || 0) + 1,
            lastWornAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      for (let index = 0; index < removedItemIds.length; index += 1) {
        const previousItemSnapshot = removedItemSnapshots[index];
        if (previousItemSnapshot.exists) {
          const data = previousItemSnapshot.data();
          transaction.update(removedItemRefs[index], {
            wearCount: Math.max(0, (Number(data.wearCount) || 0) - 1),
            lastWornAt: null,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const itemSnapshotsForOutfit = wardrobeItems.map((item) => ({
        ...item,
        slotName: item.category,
        selectionReason: '',
      }));
      const nowStamp = serverTimestamp();
      const record = {
        dateKey,
        timeZone,
        confirmedAt: nowStamp,
        itemIds,
        itemSnapshots: itemSnapshotsForOutfit,
        mediaPublicIds: [...new Set(itemSnapshotsForOutfit.flatMap((item) => [item.image?.publicId, item.thumbnail?.publicId]).filter(Boolean))],
        name,
        description,
        occasion,
        style: null,
        source: 'USER_CREATED',
        favorite: false,
        notes,
        weatherSnapshotId: linkedSuggestion?.weatherSnapshotId || null,
        calendarEventId: linkedSuggestion?.calendarEventId || null,
        wearCountUpdated: { addedItemIds, removedItemIds },
        createdAt: dailySnapshot.exists ? dailySnapshot.data().createdAt || nowStamp : nowStamp,
        updatedAt: nowStamp,
      };
      transaction.set(dailyRef, record);
      if (suggestionRef) {
        transaction.update(suggestionRef, {
          status: 'CONFIRMED',
          confirmedDailyOutfitId: dateKey,
          updatedAt: nowStamp,
        });
      }
    });
    const saved = await dailyRef.get();
    return toResponse(dateKey, saved.data());
  }

  return { getToday, confirmToday };
}

module.exports = { createDailyOutfitService, localDateKey, toResponse };
