import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { localDateKey } from '../utils/dateTime';

const CALENDAR_ENABLED_KEY = 'shelfy.deviceCalendar.enabled';
const MAX_EVENTS = 50;

function requireUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để dùng lịch thiết bị.');
  return uid;
}

function eventDocumentId(event, index) {
  const raw = `${event.id || ''}:${event.startDate || ''}:${index}`;
  let hash = 2166136261;
  for (let offset = 0; offset < raw.length; offset += 1) {
    hash ^= raw.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  return `device-${(hash >>> 0).toString(36)}`;
}

function eventTime(value, allDay) {
  if (allDay || !value) return null;
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function publicEvent(event, index, dateKey) {
  const allDay = Boolean(event.allDay);
  return {
    id: eventDocumentId(event, index),
    providerEventId: String(event.id || '').slice(0, 256),
    dateKey,
    title: String(event.title || 'Sự kiện').slice(0, 200),
    summary: String(event.title || 'Sự kiện').slice(0, 200),
    start: new Date(event.startDate).toISOString(),
    end: new Date(event.endDate || event.startDate).toISOString(),
    startTime: eventTime(event.startDate, allDay),
    endTime: eventTime(event.endDate, allDay),
    allDay,
    location: String(event.location || '').slice(0, 300),
    description: String(event.notes || '').slice(0, 500),
    context: 'DEVICE_CALENDAR',
  };
}

async function permissionStatus() {
  const permission = await Calendar.getCalendarPermissionsAsync();
  const enabled = await AsyncStorage.getItem(CALENDAR_ENABLED_KEY);
  return {
    connected: permission.granted && enabled === 'true',
    permissionGranted: permission.granted,
    canAskAgain: permission.canAskAgain,
    provider: 'DEVICE',
    email: null,
  };
}

async function clearToday(uid, dateKey) {
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'calendarEvents'),
    where('dateKey', '==', dateKey),
  ));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
}

export const calendarApi = {
  status: permissionStatus,

  async today() {
    const uid = requireUser();
    const status = await permissionStatus();
    const dateKey = localDateKey();
    if (!status.connected) return { ...status, dateKey, events: [] };

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarIds = calendars.map((calendar) => calendar.id);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const nativeEvents = calendarIds.length
      ? await Calendar.getEventsAsync(calendarIds, start, end)
      : [];
    const events = nativeEvents
      .sort((left, right) => new Date(left.startDate) - new Date(right.startDate))
      .slice(0, MAX_EVENTS)
      .map((event, index) => publicEvent(event, index, dateKey));

    const existing = await getDocs(query(
      collection(db, 'users', uid, 'calendarEvents'),
      where('dateKey', '==', dateKey),
    ));
    const nextIds = new Set(events.map((event) => event.id));
    const batch = writeBatch(db);
    existing.docs.filter((entry) => !nextIds.has(entry.id)).forEach((entry) => batch.delete(entry.ref));
    events.forEach((event) => batch.set(
      doc(db, 'users', uid, 'calendarEvents', event.id),
      { ...event, syncedAt: serverTimestamp() },
    ));
    await batch.commit();
    await setDoc(doc(db, 'users', uid, 'integrationStatus', 'googleCalendar'), {
      connected: true,
      provider: 'DEVICE',
      updatedAt: serverTimestamp(),
    });
    return { ...status, dateKey, events };
  },

  async connect() {
    const uid = requireUser();
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Bạn cần cấp quyền lịch trong Cài đặt để Shelfy đọc sự kiện hôm nay.');
    }
    await AsyncStorage.setItem(CALENDAR_ENABLED_KEY, 'true');
    await setDoc(doc(db, 'users', uid, 'integrationStatus', 'googleCalendar'), {
      connected: true,
      provider: 'DEVICE',
      updatedAt: serverTimestamp(),
    });
    return { connected: true, permissionGranted: true, provider: 'DEVICE', email: null };
  },

  async disconnect() {
    const uid = requireUser();
    const dateKey = localDateKey();
    await AsyncStorage.setItem(CALENDAR_ENABLED_KEY, 'false');
    await clearToday(uid, dateKey);
    await setDoc(doc(db, 'users', uid, 'integrationStatus', 'googleCalendar'), {
      connected: false,
      provider: 'DEVICE',
      updatedAt: serverTimestamp(),
    });
    return { connected: false, provider: 'DEVICE', email: null };
  },
};
