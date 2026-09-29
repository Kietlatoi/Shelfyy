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

const createTryOnJob = httpsCallable(functions, 'createTryOnJob');
const getTryOnJobStatus = httpsCallable(functions, 'getTryOnJobStatus');
const setTryOnJobSaved = httpsCallable(functions, 'setTryOnJobSaved');
const deleteTryOnJob = httpsCallable(functions, 'deleteTryOnJob');
const cursorsByQuery = new Map();
const MAX_PAGE_SIZE = 50;
let retryableRequestId = null;

function userTryOns() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để xem lịch sử thử đồ.');
  return collection(db, 'users', uid, 'tryOns');
}

function fromDocument(snapshot) {
  const data = snapshot.data();
  return {
    jobId: snapshot.id,
    id: snapshot.id,
    status: data.status || 'PENDING',
    resultImageUrl: data.resultImage?.secureUrl || null,
    processingTimeMs: data.processingTimeMs ?? null,
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

export const trialApi = {
  generate: async ({ personImage, clothingItemId }) => {
    retryableRequestId ||= `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    const result = await createTryOnJob({
      personImage,
      clothingItemId: String(clothingItemId),
      requestId: retryableRequestId,
    });
    retryableRequestId = null;
    return result.data;
  },
  getStatus: async (jobId) => (await getTryOnJobStatus({ jobId: String(jobId) })).data,
  getHistory: async ({ page = 0, size = 10, saved } = {}) => {
    const uid = auth.currentUser?.uid;
    const pageNumber = Math.max(0, Number(page) || 0);
    const pageSize = Math.min(Math.max(Number(size) || 10, 1), MAX_PAGE_SIZE);
    const cursorKey = JSON.stringify([uid, saved === undefined ? null : saved, pageSize]);
    const pageCursors = cursorsByQuery.get(cursorKey) || new Map([[0, null]]);
    if (pageNumber === 0) {
      pageCursors.clear();
      pageCursors.set(0, null);
    }
    const cursor = pageCursors.get(pageNumber);
    if (pageNumber > 0 && !cursor) throw new Error('Trang lịch sử đã hết hạn. Tải lại rồi thử lại.');
    const constraints = [where('isDeleted', '==', false)];
    if (typeof saved === 'boolean') constraints.push(where('isSaved', '==', saved));
    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize + 1));
    const snapshot = await getDocs(query(userTryOns(), ...constraints));
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
  setSaved: async (jobId, saved = true) => (await setTryOnJobSaved({ jobId: String(jobId), saved })).data,
  deleteHistory: async (jobId) => (await deleteTryOnJob({ jobId: String(jobId) })).data,
};
