import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/client';

const PAGE_SIZE_MAX = 100;
const SCAN_LIMIT = 500;
const cursorsByQuery = new Map();

function fromData(data, id) {
  return {
    ...data,
    id,
    imageUrl: data.image?.secureUrl || null,
    thumbnailUrl: data.thumbnail?.secureUrl || data.image?.secureUrl || null,
    favorite: Boolean(data.favorite),
    status: data.status || 'IN_USE',
    wearCount: data.wearCount || 0,
  };
}

function fromDocument(snapshot) {
  return fromData(snapshot.data(), snapshot.id);
}

function normalizeWritePayload(payload) {
  const allowed = [
    'name', 'brand', 'category', 'subCategory', 'color', 'colorHex', 'season', 'size',
    'pattern', 'material', 'tags', 'purchasePrice', 'purchaseDate', 'sourceUrl', 'image',
    'thumbnail', 'backgroundRemovedUrl', 'favorite', 'status', 'aiDetected',
  ];
  return Object.fromEntries(allowed
    .filter((key) => Object.hasOwn(payload, key))
    .map((key) => [key, payload[key]]));
}

export function createFirebaseWardrobeApi(firestore, firebaseAuth, markWornCallable, createItemCallable, deleteItemCallable, getPlanCallable, updateItemCallable) {
  const userItems = () => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để sử dụng tủ đồ.');
    return collection(firestore, 'users', uid, 'wardrobe');
  };

  return {
    async getItems({ category = 'ALL', q = '', page = 0, size = 20 } = {}) {
      const pageSize = Math.min(Math.max(Number(size) || 20, 1), PAGE_SIZE_MAX);
      const search = q.trim().toLocaleLowerCase();
      const key = JSON.stringify([firebaseAuth.currentUser?.uid, category, search, pageSize]);
      let queryCursors = cursorsByQuery.get(key);
      if (!queryCursors || page === 0) {
        queryCursors = new Map([[0, null]]);
        cursorsByQuery.set(key, queryCursors);
      }
      const cursor = queryCursors.get(page);
      if (page > 0 && !cursor) {
        throw new Error('Trang tủ đồ đã hết hạn. Tải lại danh sách rồi thử lại.');
      }

      const constraints = [];
      if (category && category !== 'ALL') constraints.push(where('category', '==', category));
      constraints.push(orderBy('createdAt', 'desc'));
      if (cursor) constraints.push(startAfter(cursor));

      const matches = [];
      let scanned = 0;
      let hasMore = false;
      let pageCursor = cursor;
      while (scanned < SCAN_LIMIT && matches.length <= pageSize) {
        const batchLimit = Math.min(100, SCAN_LIMIT - scanned);
        const batch = await getDocs(query(userItems(), ...constraints, limit(batchLimit)));
        if (batch.empty) break;
        for (const snapshot of batch.docs) {
          scanned += 1;
          const item = fromDocument(snapshot);
          const searchable = `${item.name || ''} ${item.brand || ''}`.toLocaleLowerCase();
          if (!search || searchable.includes(search)) {
            if (matches.length === pageSize) {
              hasMore = true;
              break;
            }
            matches.push(item);
          }
          pageCursor = snapshot;
        }
        if (hasMore) break;
        // A sparse search can exhaust the scan budget before filling a page.
        // Preserve its continuation instead of reporting that the closet ended.
        if (scanned >= SCAN_LIMIT && batch.size === batchLimit) hasMore = true;
        if (batch.size < batchLimit || scanned >= SCAN_LIMIT) break;
        const cursorConstraint = startAfter(pageCursor);
        const cursorIndex = constraints.findIndex((constraint) => constraint.type === 'startAfter');
        if (cursorIndex >= 0) constraints[cursorIndex] = cursorConstraint;
        else constraints.push(cursorConstraint);
      }

      if (hasMore) queryCursors.set(page + 1, pageCursor);
      return { content: matches, totalPages: hasMore ? page + 2 : page + 1, page, size: pageSize };
    },
    async createItem(payload) {
      const data = normalizeWritePayload(payload);
      const result = await createItemCallable(data);
      return fromData(result.data, result.data.id);
    },
    async getItem(id) {
      const snapshot = await getDoc(doc(userItems(), String(id)));
      if (!snapshot.exists()) throw new Error('Không tìm thấy món đồ này.');
      return fromDocument(snapshot);
    },
    async updateItem(id, payload) {
      const result = await updateItemCallable({ itemId: String(id), payload: normalizeWritePayload(payload) });
      return fromData(result.data, result.data.id);
    },
    async deleteItem(id) {
      const result = await deleteItemCallable({ itemId: String(id) });
      return result.data;
    },
    async markWorn(id) {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return markWornCallable({ itemId: String(id), requestId });
    },
    async getStats() {
      const items = userItems();
      const [total, worn, plan] = await Promise.all([
        getCountFromServer(query(items)),
        getCountFromServer(query(items, where('wearCount', '>', 0))),
        getPlanCallable({}),
      ]);
      return {
        totalItems: total.data().count,
        wornCount: worn.data().count,
        storageLimit: plan.data.wardrobeLimit,
      };
    },
    async updatePreference(id, updates) {
      const patch = {};
      if (Object.hasOwn(updates, 'favorite')) patch.favorite = Boolean(updates.favorite);
      if (Object.hasOwn(updates, 'status')) patch.status = updates.status;
      if (Object.keys(patch).length === 0) return this.getItem(id);
      patch.updatedAt = serverTimestamp();
      await updateDoc(doc(userItems(), String(id)), patch);
      return this.getItem(id);
    },
  };
}

export const wardrobeApi = createFirebaseWardrobeApi(
  db,
  auth,
  httpsCallable(functions, 'markWardrobeItemWorn'),
  httpsCallable(functions, 'createWardrobeItem'),
  httpsCallable(functions, 'deleteWardrobeItem'),
  httpsCallable(functions, 'getMyEntitlement'),
  httpsCallable(functions, 'updateWardrobeItem')
);

export const { getItems, createItem, getItem, updateItem, deleteItem, markWorn, getStats } = wardrobeApi;
