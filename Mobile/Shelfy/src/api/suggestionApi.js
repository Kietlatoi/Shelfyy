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
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { generateStylingSuggestion, getConfig } from '../utils/ruleBasedStylist';
import { localDateKey, shiftDateKey, timestampMillis, validTimeZone } from '../utils/dateTime';
import { calendarApi } from './calendarApi';

const MAX_WARDROBE_ITEMS = 60;
const MAX_EVENTS = 12;
let retryableGenerationRequestId = null;

function requireUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Vui lòng đăng nhập để dùng gợi ý trang phục.');
  return uid;
}

function imageUrl(value) {
  if (typeof value === 'string') return value;
  return value && typeof value.secureUrl === 'string' ? value.secureUrl : null;
}

function imageRef(value) {
  if (!value || typeof value !== 'object') return null;
  return { secureUrl: value.secureUrl || null, publicId: value.publicId || null };
}

function wardrobeItem(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || '',
    brand: data.brand || '',
    category: String(data.category || 'OTHER').toUpperCase(),
    color: data.color || '',
    colorHex: data.colorHex || null,
    season: data.season || '',
    pattern: data.pattern || '',
    size: data.size || '',
    material: data.material || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    imageUrl: imageUrl(data.image) || imageUrl(data.thumbnail) || data.sourceUrl || null,
    thumbnailUrl: imageUrl(data.thumbnail) || imageUrl(data.image) || null,
    backgroundRemovedUrl: data.backgroundRemovedUrl || null,
    image: imageRef(data.image),
    thumbnail: imageRef(data.thumbnail),
    wearCount: Number(data.wearCount) || 0,
    lastWornAt: data.lastWornAt || null,
    favorite: Boolean(data.favorite),
    itemStatus: data.status || 'IN_USE',
  };
}

function suggestionResponse(id, data) {
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    id,
    status: data.status || 'GENERATED',
    date: data.dateKey,
    title: data.title || '',
    description: data.summary || '',
    occasion: data.occasion || '',
    summary: data.summary || '',
    reason: data.reason || '',
    weatherReason: data.reason || '',
    confidence: data.confidence ?? null,
    tips: Array.isArray(data.tips) ? data.tips : [],
    modelName: data.modelName || getConfig().model,
    weatherSnapshotId: data.weatherSnapshotId || null,
    calendarEventId: data.calendarEventId || null,
    confirmedDailyOutfitId: data.confirmedDailyOutfitId || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    items,
    outfit: { items },
    context: data.context || {},
  };
}

async function buildContext(uid, profile, date, timeZone) {
  await calendarApi.today().catch(() => null);
  const userPath = ['users', uid];
  const [wardrobeResult, weatherSnapshot, eventsResult, outfitsResult, suggestionsResult] = await Promise.all([
    getDocs(query(collection(db, ...userPath, 'wardrobe'), limit(100))),
    getDoc(doc(db, ...userPath, 'weatherSnapshots', 'current')),
    getDocs(query(collection(db, ...userPath, 'calendarEvents'), where('dateKey', '==', date), limit(MAX_EVENTS))),
    getDocs(query(collection(db, ...userPath, 'dailyOutfits'), where('dateKey', '>=', shiftDateKey(date, -6)), limit(100))),
    getDocs(query(
      collection(db, ...userPath, 'suggestions'),
      where('dateKey', '==', date),
      orderBy('createdAt', 'desc'),
      limit(100),
    )),
  ]);

  const wardrobeItems = wardrobeResult.docs
    .map(wardrobeItem)
    .filter((item) => item.name && item.itemStatus !== 'TO_SELL')
    .sort((left, right) => Number(right.favorite) - Number(left.favorite)
      || ['IN_USE', 'RARELY_USED', 'STORED'].indexOf(left.itemStatus)
        - ['IN_USE', 'RARELY_USED', 'STORED'].indexOf(right.itemStatus)
      || left.wearCount - right.wearCount)
    .slice(0, MAX_WARDROBE_ITEMS);

  const events = eventsResult.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((left, right) => timestampMillis(left.start) - timestampMillis(right.start));
  const recentItemIds = [];
  outfitsResult.docs.forEach((entry) => {
    const outfit = entry.data();
    const itemIds = Array.isArray(outfit.itemIds) ? outfit.itemIds : [];
    itemIds.forEach((id) => {
      if (typeof id === 'string' && !recentItemIds.includes(id)) recentItemIds.push(id);
    });
  });
  const previous = suggestionsResult.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .filter((suggestion) => suggestion.status !== 'FAILED')
    .sort((left, right) => timestampMillis(right.createdAt) - timestampMillis(left.createdAt))[0];

  return {
    date,
    timeZone,
    weather: weatherSnapshot.exists() ? { id: 'current', ...weatherSnapshot.data() } : null,
    events,
    wardrobeItems,
    wardrobeCount: wardrobeItems.length,
    recentItemIds: recentItemIds.slice(0, 80),
    previousSuggestionItemIds: Array.isArray(previous?.items)
      ? previous.items.map((item) => item.itemId || item.id).filter(Boolean)
      : [],
    userEmail: profile.email || '',
    userName: profile.fullName || '',
  };
}

function compactContext(context) {
  return {
    date: context.date,
    timeZone: context.timeZone,
    weather: context.weather ? {
      id: 'current',
      location: context.weather.location || 'Vị trí hiện tại',
      temperature: context.weather.temperature ?? null,
      feelsLike: context.weather.feelsLike ?? null,
      condition: context.weather.condition || '',
      humidity: context.weather.humidity ?? null,
      cloudCover: context.weather.cloudCover ?? null,
      windSpeed: context.weather.windSpeed ?? null,
    } : null,
    events: context.events.slice(0, MAX_EVENTS).map((event) => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime || null,
      endTime: event.endTime || null,
      location: event.location || '',
    })),
    wardrobeCount: context.wardrobeCount,
    recentItemIds: context.recentItemIds,
    previousSuggestionItemIds: context.previousSuggestionItemIds,
    suggestionEngine: getConfig().model,
  };
}

export const suggestionApi = {
  async latestToday() {
    const uid = requireUser();
    const profile = await getDoc(doc(db, 'users', uid));
    const date = localDateKey(Date.now(), validTimeZone(profile.data()?.timeZone));
    const results = await getDocs(query(
      collection(db, 'users', uid, 'suggestions'),
      where('dateKey', '==', date),
      orderBy('createdAt', 'desc'),
      limit(100),
    ));
    const latest = results.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .filter((suggestion) => suggestion.status !== 'FAILED')
      .sort((left, right) => timestampMillis(right.createdAt) - timestampMillis(left.createdAt))[0];
    return latest ? suggestionResponse(latest.id, latest) : null;
  },

  async generateToday() {
    const uid = requireUser();
    retryableGenerationRequestId ||= `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    const suggestionRef = doc(db, 'users', uid, 'suggestions', retryableGenerationRequestId);
    const existing = await getDoc(suggestionRef);
    if (existing.exists()) {
      retryableGenerationRequestId = null;
      return suggestionResponse(existing.id, existing.data());
    }

    const profileSnapshot = await getDoc(doc(db, 'users', uid));
    const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const timeZone = validTimeZone(profile.timeZone);
    const date = localDateKey(Date.now(), timeZone);
    const context = await buildContext(uid, profile, date, timeZone);
    if (!context.wardrobeItems.length) {
      throw new Error('WARDROBE_CONTEXT_EMPTY: Tủ đồ chưa có món hợp lệ để tạo gợi ý.');
    }

    const generated = generateStylingSuggestion(context);
    const itemById = new Map(context.wardrobeItems.map((item) => [item.id, item]));
    const items = generated.suggestion.items.map((selected, index) => {
      const item = itemById.get(String(selected.itemId));
      if (!item) return null;
      return {
        ...item,
        slotName: selected.slotName || item.category,
        selectionReason: selected.reason || '',
        sortOrder: index,
      };
    }).filter(Boolean);
    if (!items.length) throw new Error('Tủ đồ hiện chưa có đủ món để phối outfit.');

    const record = {
      dateKey: date,
      timeZone,
      status: 'GENERATED',
      title: generated.suggestion.title,
      occasion: generated.suggestion.occasion,
      summary: generated.suggestion.summary,
      reason: generated.suggestion.reason,
      confidence: generated.suggestion.confidence,
      tips: generated.suggestion.tips || [],
      modelName: generated.modelName || getConfig().model,
      weatherSnapshotId: context.weather?.id || null,
      calendarEventId: context.events[0]?.id || null,
      confirmedDailyOutfitId: null,
      items,
      mediaPublicIds: [...new Set(items.flatMap((item) => [
        item.image?.publicId,
        item.thumbnail?.publicId,
      ]).filter(Boolean))],
      context: compactContext(context),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(suggestionRef, record);
    const saved = await getDoc(suggestionRef);
    retryableGenerationRequestId = null;
    return suggestionResponse(saved.id, saved.data());
  },
};
