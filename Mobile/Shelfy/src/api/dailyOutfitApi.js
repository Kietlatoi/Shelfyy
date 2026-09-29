import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/client';

const getTodayDailyOutfit = httpsCallable(functions, 'getTodayDailyOutfit');
const confirmTodayDailyOutfit = httpsCallable(functions, 'confirmTodayDailyOutfit');
const cursorsByQuery = new Map();
const MAX_PAGE_SIZE = 50;

function userDailyOutfits() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để xem lịch sử trang phục.');
  return collection(db, 'users', uid, 'dailyOutfits');
}

function fromDocument(snapshot) {
  const data = snapshot.data();
  const items = Array.isArray(data.itemSnapshots) ? data.itemSnapshots : [];
  return {
    id: snapshot.id,
    confirmed: true,
    wornDate: data.dateKey,
    confirmedAt: data.confirmedAt || null,
    weatherSnapshotId: data.weatherSnapshotId || null,
    calendarEventId: data.calendarEventId || null,
    notes: data.notes || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    itemIds: data.itemIds || items.map((item) => item.id),
    items,
    outfit: {
      id: snapshot.id,
      name: data.name || 'Outfit hôm nay',
      description: data.description || '',
      occasion: data.occasion || '',
      style: data.style || null,
      source: data.source || 'USER_CREATED',
      favorite: Boolean(data.favorite),
      createdAt: data.createdAt || null,
      itemIds: data.itemIds || items.map((item) => item.id),
      items,
    },
    wearCountUpdated: data.wearCountUpdated || { addedItemIds: [], removedItemIds: [] },
  };
}

export const dailyOutfitApi = {
  list: async ({ page = 0, size = 12, from, to } = {}) => {
    const pageNumber = Math.max(0, Number(page) || 0);
    const pageSize = Math.min(Math.max(Number(size) || 12, 1), MAX_PAGE_SIZE);
    const userId = auth.currentUser?.uid;
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

    const content = pageDocs.map(fromDocument);
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
  getToday: async () => (await getTodayDailyOutfit()).data,
  confirmToday: async (payload) => (await confirmTodayDailyOutfit(payload)).data,
};
