const crypto = require('node:crypto');
const stylist = require('./ruleBasedStylist');

const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const MAX_WARDROBE_ITEMS = 60;
const MAX_EVENTS = 12;

function getDateKey(milliseconds, timeZone = DEFAULT_TIME_ZONE) {
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

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timestampValue(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}

function imageUrl(value) {
  if (typeof value === 'string') return value;
  return value && typeof value.secureUrl === 'string' ? value.secureUrl : null;
}

function imageRef(value) {
  if (!value || typeof value !== 'object') return null;
  return { secureUrl: value.secureUrl || null, publicId: value.publicId || null };
}

function wardrobeItem(id, data) {
  return {
    id,
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

function publicEvent(data, id) {
  return {
    id: data.id || id,
    title: data.title || 'Không có tiêu đề',
    start: data.start || data.startAt || data.startTime || null,
    end: data.end || data.endAt || data.endTime || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    time: data.time || null,
    allDay: Boolean(data.allDay),
    location: data.location || '',
    description: data.description || '',
    context: data.context || '',
  };
}

function snapshotForItem(item, selected, sortOrder) {
  return {
    ...item,
    slotName: selected.slotName || item.category,
    selectionReason: selected.reason || '',
    sortOrder,
  };
}

function compactContext(context) {
  return {
    date: context.date,
    timeZone: context.timeZone,
    weather: context.weather ? {
      id: context.weather.id || 'current',
      location: context.weather.location || 'Vị trí hiện tại',
      temperature: context.weather.temperature ?? null,
      feelsLike: context.weather.feelsLike ?? null,
      condition: context.weather.condition || '',
      humidity: context.weather.humidity ?? null,
      cloudCover: context.weather.cloudCover ?? null,
      windSpeed: context.weather.windSpeed ?? null,
    } : null,
    events: context.events.map((event) => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
    })),
    wardrobeCount: context.wardrobeCount,
    recentItemIds: context.recentItemIds,
    previousSuggestionItemIds: context.previousSuggestionItemIds,
    suggestionEngine: stylist.getConfig().model,
  };
}

function createStylingService({ database, serverTimestamp, now = Date.now, HttpsError, generate = stylist.generateStylingSuggestion, media }) {
  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function requireUid(uid) {
    if (typeof uid !== 'string' || uid.length === 0) fail('unauthenticated', 'Vui lòng đăng nhập để dùng gợi ý trang phục.');
  }

  function validateRequestId(requestId) {
    if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 80 || requestId.includes('/')) {
      fail('invalid-argument', 'Mã yêu cầu tạo gợi ý không hợp lệ.');
    }
  }

  async function buildContext(uid, profile, date, timeZone) {
    const userPath = `users/${uid}`;
    const [wardrobeResult, weatherSnapshot, eventsResult, outfitsResult, suggestionsResult] = await Promise.all([
      database.collection(`${userPath}/wardrobe`).limit(100).get(),
      database.doc(`${userPath}/weatherSnapshots/current`).get(),
      database.collection(`${userPath}/calendarEvents`).where('dateKey', '==', date).limit(MAX_EVENTS).get(),
      database.collection(`${userPath}/dailyOutfits`).where('dateKey', '>=', shiftDateKey(date, -6)).limit(100).get(),
      database.collection(`${userPath}/suggestions`).where('dateKey', '==', date).limit(100).get(),
    ]);

    const wardrobeItems = wardrobeResult.docs
      .map((document) => wardrobeItem(document.id, document.data()))
      .filter((item) => item.name && item.itemStatus !== 'TO_SELL')
      .sort((left, right) => Number(right.favorite) - Number(left.favorite)
        || ['IN_USE', 'RARELY_USED', 'STORED'].indexOf(left.itemStatus) - ['IN_USE', 'RARELY_USED', 'STORED'].indexOf(right.itemStatus)
        || left.wearCount - right.wearCount)
      .slice(0, MAX_WARDROBE_ITEMS);

    const events = eventsResult.docs.map((document) => publicEvent(document.data(), document.id));
    events.sort((left, right) => timestampValue(left.start) - timestampValue(right.start));

    const recentItemIds = [];
    for (const document of outfitsResult.docs) {
      const outfit = document.data();
      const itemIds = Array.isArray(outfit.itemIds) ? outfit.itemIds
        : Array.isArray(outfit.itemSnapshots) ? outfit.itemSnapshots.map((item) => item.itemId || item.id)
          : [];
      for (const id of itemIds) if (typeof id === 'string' && !recentItemIds.includes(id)) recentItemIds.push(id);
    }

    const previous = suggestionsResult.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((suggestion) => suggestion.status !== 'FAILED')
      .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt))[0];
    const previousSuggestionItemIds = Array.isArray(previous?.items)
      ? previous.items.map((item) => item.itemId || item.id).filter((id) => typeof id === 'string')
      : [];
    const weather = weatherSnapshot.exists ? { id: 'current', ...weatherSnapshot.data() } : null;

    return {
      date,
      timeZone,
      weather,
      events,
      wardrobeItems,
      wardrobeCount: wardrobeItems.length,
      recentItemIds: recentItemIds.slice(0, 80),
      previousSuggestionItemIds,
      userEmail: typeof profile.email === 'string' ? profile.email : '',
      userName: typeof profile.fullName === 'string' ? profile.fullName : '',
    };
  }

  function suggestionResponse(id, data) {
    return {
      id,
      status: data.status || 'GENERATED',
      date: data.dateKey,
      title: data.title || '',
      occasion: data.occasion || '',
      summary: data.summary || '',
      reason: data.reason || '',
      confidence: data.confidence ?? null,
      tips: Array.isArray(data.tips) ? data.tips : [],
      modelName: data.modelName || stylist.getConfig().model,
      weatherSnapshotId: data.weatherSnapshotId || null,
      calendarEventId: data.calendarEventId || null,
      confirmedDailyOutfitId: data.confirmedDailyOutfitId || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
      items: Array.isArray(data.items) ? data.items : [],
      context: data.context || {},
    };
  }

  async function latestToday(uid) {
    requireUid(uid);
    const profileSnapshot = await database.doc(`users/${uid}`).get();
    const timeZone = validTimeZone(profileSnapshot.data()?.timeZone);
    const date = getDateKey(now(), timeZone);
    const results = await database.collection(`users/${uid}/suggestions`)
      .where('dateKey', '==', date).limit(100).get();
    const latest = results.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((suggestion) => suggestion.status !== 'FAILED')
      .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt))[0];
    return { suggestion: latest ? suggestionResponse(latest.id, latest) : null };
  }

  async function generateToday(uid, payload = {}) {
    requireUid(uid);
    validateRequestId(payload.requestId);
    const profileSnapshot = await database.doc(`users/${uid}`).get();
    const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
    const timeZone = validTimeZone(profile.timeZone);
    const date = getDateKey(now(), timeZone);
    const context = await buildContext(uid, profile, date, timeZone);
    if (!context.wardrobeItems.length) {
      fail('failed-precondition', 'WARDROBE_CONTEXT_EMPTY: Tủ đồ chưa có món hợp lệ để tạo gợi ý.');
    }

    const generated = generate(context);
    const itemById = new Map(context.wardrobeItems.map((item) => [item.id, item]));
    const items = generated.suggestion.items
      .map((selected, index) => {
        const item = itemById.get(String(selected.itemId));
        if (!item) return null;
        return snapshotForItem(item, selected, index);
      })
      .filter(Boolean);
    if (!items.length) fail('failed-precondition', 'Tủ đồ hiện chưa có đủ món để phối outfit.');

    const contextSnapshot = compactContext(context);
    const suggestionRef = database.doc(`users/${uid}/suggestions/${crypto.randomUUID()}`);
    const receiptId = crypto.createHash('sha256').update(`${uid}:${date}:${payload.requestId}`).digest('hex');
    const receiptRef = database.doc(`_suggestionReceipts/${receiptId}`);
    let suggestionId;
    await database.runTransaction(async (transaction) => {
      const receipt = await transaction.get(receiptRef);
      if (receipt.exists) {
        suggestionId = receipt.data().suggestionId;
        return;
      }
      const mediaRefs = media ? await media.readAttachments(transaction, uid, items.flatMap((item) => [item.image, item.thumbnail]), 'wardrobe') : [];
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
        modelName: generated.modelName || stylist.getConfig().model,
        weatherSnapshotId: context.weather?.id || null,
        calendarEventId: context.events[0]?.id || null,
        confirmedDailyOutfitId: null,
        items,
        mediaPublicIds: [...new Set(items.flatMap((item) => [item.image?.publicId, item.thumbnail?.publicId]).filter(Boolean))],
        context: contextSnapshot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (media) media.retain(transaction, mediaRefs);
      transaction.create(suggestionRef, record);
      transaction.create(receiptRef, { uid, dateKey: date, suggestionId: suggestionRef.id, createdAt: serverTimestamp() });
      suggestionId = suggestionRef.id;
    });

    const saved = await database.doc(`users/${uid}/suggestions/${suggestionId}`).get();
    return suggestionResponse(suggestionId, saved.data());
  }

  return { latestToday, generateToday };
}

module.exports = { createStylingService, getDateKey };
