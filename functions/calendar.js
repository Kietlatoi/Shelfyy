const crypto = require('node:crypto');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const TIME_ZONE_OFFSET = '+07:00';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_TIMEOUT_MILLIS = 10 * 1000;
const SYNC_CACHE_MILLIS = 5 * 60 * 1000;
const EVENT_LIMIT = 20;
const EVENT_RETENTION_DAYS = 30;

function getLocalDateParts(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return parts.reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
}

function getTodayRange(now = Date.now(), timeZone = TIME_ZONE) {
  const parts = getLocalDateParts(new Date(now), timeZone);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const nextDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1));
  const nextParts = getLocalDateParts(nextDate, 'UTC');
  const tomorrow = `${nextParts.year}-${nextParts.month}-${nextParts.day}`;
  return {
    date: today,
    timeZone,
    timeMin: `${today}T00:00:00${TIME_ZONE_OFFSET}`,
    timeMax: `${tomorrow}T00:00:00${TIME_ZONE_OFFSET}`,
  };
}

function plainText(value, maxLength = 500) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function formatEventTime(value, timeZone) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.hour}:${parts.minute}`;
}

function normalizeCalendarEvent(event, timeZone = TIME_ZONE) {
  const start = event?.start || {};
  const end = event?.end || {};
  const allDay = Boolean(start.date && !start.dateTime);
  const startValue = start.dateTime || start.date || null;
  const endValue = end.dateTime || end.date || null;
  return {
    id: typeof event?.id === 'string' ? event.id : '',
    title: plainText(event?.summary, 250) || 'Không có tiêu đề',
    summary: plainText(event?.summary, 250) || 'Không có tiêu đề',
    startDate: start.date || null,
    endDate: end.date || null,
    startDateTime: start.dateTime || null,
    endDateTime: end.dateTime || null,
    startTime: allDay ? null : formatEventTime(start.dateTime, timeZone),
    endTime: allDay ? null : formatEventTime(end.dateTime, timeZone),
    time: allDay ? 'Cả ngày' : null,
    allDay,
    location: plainText(event?.location, 300),
    description: plainText(event?.description),
    htmlLink: typeof event?.htmlLink === 'string' ? event.htmlLink : '',
    status: typeof event?.status === 'string' ? event.status : '',
    rawStart: startValue,
    rawEnd: endValue,
  };
}

function eventStartMillis(event) {
  if (event.startDateTime) return new Date(event.startDateTime).getTime() || 0;
  if (event.startDate) return new Date(`${event.startDate}T00:00:00${TIME_ZONE_OFFSET}`).getTime() || 0;
  return 0;
}

function createCalendarService({
  database,
  clientId,
  clientSecret,
  fetchImpl = fetch,
  now = Date.now,
  serverTimestamp = () => new Date(),
  HttpsError,
}) {
  function fail(code, message) {
    if (HttpsError) throw new HttpsError(code, message);
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function requireUid(uid) {
    if (typeof uid !== 'string' || !uid) fail('unauthenticated', 'Vui lòng đăng nhập để xem lịch.');
  }

  function readConfig() {
    const id = String(typeof clientId === 'function' ? clientId() : clientId || '').trim();
    const secret = String(typeof clientSecret === 'function' ? clientSecret() : clientSecret || '').trim();
    if (!id || id.startsWith('demo-') || !secret) fail('failed-precondition', 'Chưa cấu hình Google Calendar OAuth.');
    return { clientId: id, clientSecret: secret };
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MILLIS);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      let body = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      if (!response.ok) {
        const error = new Error('Google Calendar không thể xử lý yêu cầu.');
        error.googleStatus = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') fail('deadline-exceeded', 'Google Calendar phản hồi quá lâu.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function markDisconnected(uid) {
    await database.runTransaction(async (transaction) => {
      transaction.delete(database.doc(`_googleCalendarConnections/${uid}`));
      transaction.set(database.doc(`users/${uid}/integrationStatus/googleCalendar`), {
        provider: 'GOOGLE',
        connected: false,
        lastErrorCode: 'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await deleteAllEvents(uid);
  }

  async function refreshAccessToken(uid, connection) {
    const oauthConfig = readConfig();
    const parameters = new URLSearchParams({
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    });
    try {
      const result = await requestJson(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: parameters.toString(),
      });
      if (typeof result.access_token !== 'string' || !result.access_token) fail('unavailable', 'Google không trả access token mới.');
      const expiresAtMillis = Number.isFinite(Number(result.expires_in))
        ? now() + Number(result.expires_in) * 1000
        : now() + 60 * 60 * 1000;
      const refreshed = {
        ...connection,
        accessToken: result.access_token,
        refreshToken: result.refresh_token || connection.refreshToken,
        expiresAtMillis,
        updatedAt: serverTimestamp(),
      };
      let saved = false;
      await database.runTransaction(async (transaction) => {
        saved = false;
        const current = await transaction.get(database.doc(`_googleCalendarConnections/${uid}`));
        if (!current.exists || current.data().connectionId !== connection.connectionId) return;
        transaction.set(database.doc(`_googleCalendarConnections/${uid}`), refreshed);
        saved = true;
      });
      if (!saved) return null;
      return refreshed;
    } catch (error) {
      if (error.googleStatus === 400 || error.googleStatus === 401) {
        await markDisconnected(uid);
        return null;
      }
      if (error.code) throw error;
      fail('unavailable', 'Không thể làm mới quyền Google Calendar.');
    }
  }

  async function storedEvents(uid, date) {
    const snapshot = await database.collection(`users/${uid}/calendarEvents`)
      .where('dateKey', '==', date)
      .get();
    return snapshot.docs
      .map((event) => event.data())
      .sort((left, right) => (left.sortStartMillis || 0) - (right.sortStartMillis || 0));
  }

  async function saveEvents(uid, range, events, connectionId, publicStatus, syncedAtMillis) {
    const collection = database.collection(`users/${uid}/calendarEvents`);
    const wanted = new Set(events.map((event) => crypto.createHash('sha256').update(event.id).digest('hex')));
    let saved = false;
    await database.runTransaction(async (transaction) => {
      saved = false;
      const currentConnection = await transaction.get(database.doc(`_googleCalendarConnections/${uid}`));
      if (!currentConnection.exists || currentConnection.data().connectionId !== connectionId) return;
      const existing = await transaction.get(collection.where('dateKey', '==', range.date));

      for (const snapshot of existing.docs) {
        if (!wanted.has(snapshot.id)) transaction.delete(snapshot.ref);
      }
      for (const event of events) {
        if (!event.id) continue;
        const eventKey = crypto.createHash('sha256').update(event.id).digest('hex');
        const startAtMillis = eventStartMillis(event);
        transaction.set(collection.doc(eventKey), {
          ...event,
          googleEventId: event.id,
          googleCalendarId: 'primary',
          dateKey: range.date,
          timeZone: range.timeZone,
          startAtMillis,
          endAtMillis: event.endDateTime
            ? new Date(event.endDateTime).getTime()
            : event.endDate ? new Date(`${event.endDate}T00:00:00${TIME_ZONE_OFFSET}`).getTime() : null,
          sortStartMillis: startAtMillis,
          context: 'google_calendar',
          lastSyncedAt: serverTimestamp(),
        });
      }
      transaction.set(database.doc(`users/${uid}/integrationStatus/googleCalendar`), {
        provider: 'GOOGLE',
        connected: true,
        providerEmail: publicStatus.providerEmail || null,
        scope: publicStatus.scope || null,
        connectedAt: publicStatus.connectedAt || serverTimestamp(),
        lastSyncedAt: serverTimestamp(),
        lastSyncedAtMillis: syncedAtMillis,
        lastSyncedDate: range.date,
        lastErrorCode: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      saved = true;
    });
    if (!saved) return false;

    const cutoffParts = getLocalDateParts(new Date(now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const cutoff = `${cutoffParts.year}-${cutoffParts.month}-${cutoffParts.day}`;
    const expired = await collection.where('dateKey', '<', cutoff).get();
    if (!expired.empty) {
      const cleanup = database.batch();
      for (const snapshot of expired.docs) cleanup.delete(snapshot.ref);
      await cleanup.commit();
    }
    return true;
  }

  async function status(uid) {
    requireUid(uid);
    const snapshot = await database.doc(`users/${uid}/integrationStatus/googleCalendar`).get();
    const data = snapshot.exists ? snapshot.data() : {};
    return {
      connected: Boolean(data.connected),
      provider: 'GOOGLE',
      email: data.providerEmail || null,
      connectedAt: data.connectedAt || null,
      lastSyncedAt: data.lastSyncedAt || null,
      lastErrorCode: data.lastErrorCode || null,
    };
  }

  async function syncToday(uid) {
    requireUid(uid);
    const currentTime = now();
    const range = getTodayRange(currentTime);
    const connectionRef = database.doc(`_googleCalendarConnections/${uid}`);
    const statusRef = database.doc(`users/${uid}/integrationStatus/googleCalendar`);
    const [connectionSnapshot, statusSnapshot] = await Promise.all([connectionRef.get(), statusRef.get()]);
    const connection = connectionSnapshot.exists ? connectionSnapshot.data() : null;
    const publicStatus = statusSnapshot.exists ? statusSnapshot.data() : {};

    if (!connection?.refreshToken) {
      return { ...await status(uid), date: range.date, timeZone: range.timeZone, events: [] };
    }

    const syncedAt = Number(publicStatus.lastSyncedAtMillis);
    if (publicStatus.connected && publicStatus.lastSyncedDate === range.date
      && Number.isFinite(syncedAt) && currentTime - syncedAt >= 0
      && currentTime - syncedAt < SYNC_CACHE_MILLIS) {
      return { ...await status(uid), date: range.date, timeZone: range.timeZone, events: await storedEvents(uid, range.date) };
    }

    let activeConnection = connection;
    if (!activeConnection.accessToken || Number(activeConnection.expiresAtMillis) - currentTime <= 60 * 1000) {
      activeConnection = await refreshAccessToken(uid, activeConnection);
      if (!activeConnection) {
        return { ...await status(uid), connected: false, date: range.date, timeZone: range.timeZone, events: [] };
      }
    }

    const eventsUrl = new URL(EVENTS_URL);
    eventsUrl.searchParams.set('timeMin', range.timeMin);
    eventsUrl.searchParams.set('timeMax', range.timeMax);
    eventsUrl.searchParams.set('timeZone', range.timeZone);
    eventsUrl.searchParams.set('singleEvents', 'true');
    eventsUrl.searchParams.set('orderBy', 'startTime');
    eventsUrl.searchParams.set('maxResults', String(EVENT_LIMIT));
    eventsUrl.searchParams.set('showDeleted', 'false');

    let response;
    try {
      response = await requestJson(eventsUrl, { headers: { Authorization: `Bearer ${activeConnection.accessToken}` } });
    } catch (error) {
      if (error.googleStatus === 401 || error.googleStatus === 403) {
        await markDisconnected(uid);
        return { ...await status(uid), connected: false, date: range.date, timeZone: range.timeZone, events: [] };
      }
      if (error.code) throw error;
      fail('unavailable', 'Không thể tải sự kiện Google Calendar.');
    }

    const events = (Array.isArray(response.items) ? response.items : [])
      .map((event) => normalizeCalendarEvent(event, range.timeZone))
      .filter((event) => event.id);
    const saved = await saveEvents(uid, range, events, activeConnection.connectionId, {
      providerEmail: activeConnection.providerEmail,
      scope: activeConnection.scope,
      connectedAt: publicStatus.connectedAt || activeConnection.connectedAt,
    }, currentTime);
    if (!saved) return { ...await status(uid), connected: false, date: range.date, timeZone: range.timeZone, events: [] };

    return {
      connected: true,
      provider: 'GOOGLE',
      email: activeConnection.providerEmail || null,
      date: range.date,
      timeZone: range.timeZone,
      events,
    };
  }

  async function deleteAllEvents(uid) {
    const collection = database.collection(`users/${uid}/calendarEvents`);
    while (true) {
      const snapshot = await collection.limit(400).get();
      if (snapshot.empty) return;
      const batch = database.batch();
      for (const event of snapshot.docs) batch.delete(event.ref);
      await batch.commit();
    }
  }

  async function disconnect(uid) {
    requireUid(uid);
    const connectionRef = database.doc(`_googleCalendarConnections/${uid}`);
    const connectionSnapshot = await connectionRef.get();
    if (connectionSnapshot.exists) {
      const connection = connectionSnapshot.data();
      const token = connection.refreshToken || connection.accessToken;
      if (token) {
        try {
          const parameters = new URLSearchParams({ token });
          await requestJson(REVOKE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: parameters.toString(),
          });
        } catch {
          // Local credentials and cached events are removed even if Google's revoke endpoint is unavailable.
        }
      }
    }

    await database.runTransaction(async (transaction) => {
      transaction.delete(connectionRef);
      transaction.set(database.doc(`users/${uid}/integrationStatus/googleCalendar`), {
        provider: 'GOOGLE',
        connected: false,
        lastErrorCode: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await deleteAllEvents(uid);
    return { disconnected: true };
  }

  return { status, syncToday, disconnect };
}

module.exports = { EVENT_LIMIT, EVENT_RETENTION_DAYS, SYNC_CACHE_MILLIS, TIME_ZONE, createCalendarService, getTodayRange, normalizeCalendarEvent };
