import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { edgeRequest } from './edgeApi';

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
  generate: async ({ personImage, clothingItem }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để thử đồ.');
    const itemImage = clothingItem?.image || (clothingItem?.imagePublicId ? {
      secureUrl: clothingItem.imageUrl,
      publicId: clothingItem.imagePublicId,
    } : null);
    if (!clothingItem?.id || !itemImage?.secureUrl || !itemImage?.publicId) {
      throw new Error('Trang phục chưa có ảnh Cloudinary hợp lệ.');
    }
    retryableRequestId ||= `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    const result = await edgeRequest('/v1/try-on/predictions', {
      body: {
        personImage,
        clothingItem: {
          id: String(clothingItem.id),
          name: clothingItem.name || 'Trang phục',
          category: clothingItem.category,
          image: { secureUrl: itemImage.secureUrl, publicId: itemImage.publicId },
        },
        requestId: retryableRequestId,
      },
    });
    const jobId = String(result.jobId || result.id || '');
    if (!jobId) throw new Error('Replicate không trả về mã tiến trình.');
    await setDoc(doc(db, 'users', uid, 'tryOns', jobId), {
      status: result.status || 'PROCESSING',
      clothingItemId: String(clothingItem.id),
      itemSnapshot: {
        id: String(clothingItem.id),
        name: clothingItem.name || 'Trang phục',
        category: clothingItem.category,
        image: { secureUrl: itemImage.secureUrl, publicId: itemImage.publicId },
      },
      personImagePublicId: personImage.publicId,
      isSaved: false,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    retryableRequestId = null;
    return { ...result, jobId };
  },
  getStatus: async (jobId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để xem tiến trình.');
    const jobRef = doc(db, 'users', uid, 'tryOns', String(jobId));
    const snapshot = await getDoc(jobRef);
    if (!snapshot.exists()) throw new Error('Không tìm thấy lượt thử đồ này.');
    const current = snapshot.data();
    const result = await edgeRequest(`/v1/try-on/predictions/${encodeURIComponent(jobId)}/status`, {
      body: { personImagePublicId: current.personImagePublicId || null },
    });
    const patch = {
      status: result.status,
      processingTimeMs: result.processingTimeMs ?? null,
      errorCode: result.errorCode || null,
      errorMessage: result.errorMessage || null,
      updatedAt: serverTimestamp(),
    };
    if (result.status === 'DONE' && result.resultImage) {
      patch.resultImage = result.resultImage;
      patch.completedAt = serverTimestamp();
    } else if (result.status === 'FAILED') {
      patch.completedAt = serverTimestamp();
    }
    await updateDoc(jobRef, patch);
    return { ...result, jobId: String(jobId) };
  },
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
  setSaved: async (jobId, saved = true) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để lưu kết quả.');
    await updateDoc(doc(db, 'users', uid, 'tryOns', String(jobId)), {
      isSaved: Boolean(saved),
      savedAt: saved ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    return { jobId: String(jobId), isSaved: Boolean(saved) };
  },
  deleteHistory: async (jobId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để xóa kết quả.');
    const jobRef = doc(db, 'users', uid, 'tryOns', String(jobId));
    const snapshot = await getDoc(jobRef);
    if (!snapshot.exists()) return { jobId: String(jobId), deleted: true };
    const data = snapshot.data();
    await edgeRequest(`/v1/try-on/predictions/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      body: {
        personImagePublicId: data.personImagePublicId || null,
        resultPublicId: data.resultImage?.publicId || null,
      },
    });
    await updateDoc(jobRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { jobId: String(jobId), deleted: true };
  },
};
