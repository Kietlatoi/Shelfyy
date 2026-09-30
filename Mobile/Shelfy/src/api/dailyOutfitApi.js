import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { localDateKey, validTimeZone } from '../utils/dateTime';

const cursorsByQuery = new Map();
const MAX_PAGE_SIZE = 50;
const MAX_OUTFIT_ITEMS = 20;

function requireUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để xem lịch sử trang phục.');
  return uid;
}

function userDailyOutfits() {
  return collection(db, 'users', requireUser(), 'dailyOutfits');
}

function itemSnapshot(id, data) {
  const imageUrl = data.image?.secureUrl || data.thumbnail?.secureUrl || data.sourceUrl || null;
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
    imageUrl,
    thumbnailUrl: data.thumbnail?.secureUrl || imageUrl,
    backgroundRemovedUrl: data.backgroundRemovedUrl || null,
    image: data.image || null,
    thumbnail: data.thumbnail || null,
    wearCount: Number(data.wearCount) || 0,
    lastWornAt: data.lastWornAt || null,
    favorite: Boolean(data.favorite),
    itemStatus: data.status || 'IN_USE',
    slotName: data.category || 'OTHER',
    selectionReason: '',
  };
}

function fromData(id, data) {
  const items = Array.isArray(data.itemSnapshots) ? data.itemSnapshots : [];
  const itemIds = data.itemIds || items.map((item) => item.id);
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
    itemIds,
    items,
    outfit: {
      id,
      name: data.name || 'Outfit hôm nay',
      description: data.description || '',
      occasion: data.occasion || '',
      style: data.style || null,
      source: data.source || 'USER_CREATED',
      favorite: Boolean(data.favorite),
      createdAt: data.createdAt || null,
      itemIds,
      items,
    },
    wearCountUpdated: data.wearCountUpdated || { addedItemIds: [], removedItemIds: [] },
  };
}

function stringField(value, maximum, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.length > maximum) return null;
  return value.trim() || fallback;
}

async function todayIdentity(uid) {
  const profile = await getDoc(doc(db, 'users', uid));
  const timeZone = validTimeZone(profile.data()?.timeZone);
  return { timeZone, dateKey: localDateKey(Date.now(), timeZone) };
}

export const dailyOutfitApi = {
  async list({ page = 0, size = 12, from, to } = {}) {
    const pageNumber = Math.max(0, Number(page) || 0);
    const pageSize = Math.min(Math.max(Number(size) || 12, 1), MAX_PAGE_SIZE);
    const userId = requireUser();
    const cursorKey = JSON.stringify([userId, from || '', to || '', pageSize]);
    const pageCursors = cursorsByQuery.get(cursorKey) || new Map([[0, null]]);
    if (pageNumber === 0) {
      pageCursors.clear();
      pageCursors.set(0, null);
    }
    const cursor = pageCursors.get(pageNumber);
    if (pageNumber > 0 && !cursor) {
      throw new Error('Trang lịch sử đã hết hạn. Tải lại danh sách rồi thử lại.');
    }
    const constraints = [];
    if (from) constraints.push(where('dateKey', '>=', from));
    if (to) constraints.push(where('dateKey', '<=', to));
    constraints.push(orderBy('dateKey', 'desc'));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize + 1));

    const snapshot = await getDocs(query(userDailyOutfits(), ...constraints));
    const hasMore = snapshot.docs.length > pageSize;
    const pageDocs = snapshot.docs.slice(0, pageSize);
    if (hasMore) pageCursors.set(pageNumber + 1, pageDocs[pageDocs.length - 1]);
    else pageCursors.delete(pageNumber + 1);
    cursorsByQuery.set(cursorKey, pageCursors);
    const content = pageDocs.map((entry) => fromData(entry.id, entry.data()));
    return {
      content,
      page: pageNumber,
      size: pageSize,
      totalElements: null,
      totalPages: hasMore ? pageNumber + 2 : pageNumber + 1,
      numberOfElements: content.length,
      first: pageNumber === 0,
      last: !hasMore,
    };
  },

  async getToday() {
    const uid = requireUser();
    const { dateKey } = await todayIdentity(uid);
    const snapshot = await getDoc(doc(db, 'users', uid, 'dailyOutfits', dateKey));
    if (!snapshot.exists()) return { confirmed: false, wornDate: dateKey, outfit: null };
    return fromData(snapshot.id, snapshot.data());
  },

  async confirmToday(payload = {}) {
    const uid = requireUser();
    const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds.map(String) : [];
    if (!itemIds.length || itemIds.length > MAX_OUTFIT_ITEMS
      || itemIds.some((id) => !id || id.length > 128 || id.includes('/'))
      || new Set(itemIds).size !== itemIds.length) {
      throw new Error(`Chọn từ 1 đến ${MAX_OUTFIT_ITEMS} món đồ hợp lệ để xác nhận outfit hôm nay.`);
    }
    const name = stringField(payload.name, 150, 'Outfit hôm nay');
    const occasion = stringField(payload.occasion, 100, 'Hôm nay');
    const description = stringField(payload.description, 500, 'Người dùng tự chọn trong tủ đồ cá nhân.');
    const notes = stringField(payload.notes, 500, null);
    if (name === null || occasion === null || description === null || (payload.notes != null && notes === null)) {
      throw new Error('Tên outfit, dịp mặc hoặc ghi chú không hợp lệ.');
    }
    const suggestionId = payload.suggestionId == null ? null : String(payload.suggestionId);
    if (suggestionId && (suggestionId.length > 128 || suggestionId.includes('/'))) {
      throw new Error('Mã gợi ý không hợp lệ.');
    }

    const { timeZone, dateKey } = await todayIdentity(uid);
    const dailyRef = doc(db, 'users', uid, 'dailyOutfits', dateKey);
    const itemRefs = itemIds.map((itemId) => doc(db, 'users', uid, 'wardrobe', itemId));
    const suggestionRef = suggestionId ? doc(db, 'users', uid, 'suggestions', suggestionId) : null;

    await runTransaction(db, async (transaction) => {
      const reads = await Promise.all([
        transaction.get(dailyRef),
        ...itemRefs.map((reference) => transaction.get(reference)),
        ...(suggestionRef ? [transaction.get(suggestionRef)] : []),
      ]);
      const dailySnapshot = reads[0];
      const wardrobeSnapshots = reads.slice(1, itemRefs.length + 1);
      const suggestionSnapshot = suggestionRef ? reads[itemRefs.length + 1] : null;
      const wardrobeItems = wardrobeSnapshots.map((snapshot, index) => {
        if (!snapshot.exists()) throw new Error('Một số món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.');
        if (snapshot.data().status === 'TO_SELL') throw new Error('Không thể xác nhận món đồ đã chuyển sang mục cần bán.');
        return itemSnapshot(itemIds[index], snapshot.data());
      });
      if (suggestionRef && !suggestionSnapshot.exists()) throw new Error('Gợi ý không tồn tại.');
      if (suggestionRef && suggestionSnapshot.data().dateKey !== dateKey) {
        throw new Error('Chỉ có thể xác nhận gợi ý của hôm nay.');
      }

      const previousIds = dailySnapshot.exists() && Array.isArray(dailySnapshot.data().itemIds)
        ? dailySnapshot.data().itemIds : [];
      const previousSet = new Set(previousIds);
      const nextSet = new Set(itemIds);
      const addedItemIds = itemIds.filter((id) => !previousSet.has(id));
      const removedItemIds = previousIds.filter((id) => !nextSet.has(id));
      const removedRefs = removedItemIds.map((itemId) => doc(db, 'users', uid, 'wardrobe', itemId));
      const removedSnapshots = await Promise.all(removedRefs.map((reference) => transaction.get(reference)));
      const stamp = serverTimestamp();

      wardrobeSnapshots.forEach((snapshot, index) => {
        if (!addedItemIds.includes(itemIds[index])) return;
        transaction.update(itemRefs[index], {
          wearCount: (Number(snapshot.data().wearCount) || 0) + 1,
          lastWornAt: stamp,
          updatedAt: stamp,
        });
      });
      removedSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) return;
        transaction.update(removedRefs[index], {
          wearCount: Math.max(0, (Number(snapshot.data().wearCount) || 0) - 1),
          lastWornAt: null,
          updatedAt: stamp,
        });
      });

      const linkedSuggestion = suggestionSnapshot?.data() || null;
      const record = {
        dateKey,
        timeZone,
        confirmedAt: stamp,
        itemIds,
        itemSnapshots: wardrobeItems,
        mediaPublicIds: [...new Set(wardrobeItems.flatMap((item) => [
          item.image?.publicId,
          item.thumbnail?.publicId,
        ]).filter(Boolean))],
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
        createdAt: dailySnapshot.exists() ? dailySnapshot.data().createdAt || stamp : stamp,
        updatedAt: stamp,
      };
      transaction.set(dailyRef, record);
      if (suggestionRef) {
        transaction.update(suggestionRef, {
          status: 'CONFIRMED',
          confirmedDailyOutfitId: dateKey,
          updatedAt: stamp,
        });
      }
    });
    const saved = await getDoc(dailyRef);
    return fromData(saved.id, saved.data());
  },
};
