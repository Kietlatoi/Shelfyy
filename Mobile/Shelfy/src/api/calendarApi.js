import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/client';

const startGoogleCalendarOAuth = httpsCallable(functions, 'startGoogleCalendarOAuth');
const syncGoogleCalendarToday = httpsCallable(functions, 'syncGoogleCalendarToday');
const disconnectGoogleCalendar = httpsCallable(functions, 'disconnectGoogleCalendar');

export const calendarApi = {
  status: async () => {
    if (!auth.currentUser) return { connected: false, provider: 'GOOGLE', email: null };
    const status = await getDoc(doc(db, 'users', auth.currentUser.uid, 'integrationStatus', 'googleCalendar'));
    if (!status.exists()) return { connected: false, provider: 'GOOGLE', email: null };
    const data = status.data();
    return { ...data, email: data.providerEmail || null };
  },
  today: async () => (await syncGoogleCalendarToday()).data,
  connect: async () => (await startGoogleCalendarOAuth()).data,
  disconnect: async () => (await disconnectGoogleCalendar()).data,
};
