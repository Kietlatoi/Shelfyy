import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/client';

const createWeatherSnapshot = httpsCallable(functions, 'createWeatherSnapshot');

export const weatherApi = {
  createSnapshot: async ({ lat, lon }) => (await createWeatherSnapshot({ lat, lon })).data,
  latestSnapshot: async () => {
    if (!auth.currentUser) throw new Error('Vui lòng đăng nhập để xem dữ liệu thời tiết đã lưu.');
    const snapshot = await getDoc(doc(db, 'users', auth.currentUser.uid, 'weatherSnapshots', 'current'));
    if (!snapshot.exists()) {
      const error = new Error('Chưa có dữ liệu thời tiết đã lưu.');
      error.code = 'not-found';
      throw error;
    }
    return { ...snapshot.data(), id: snapshot.id };
  },
};
