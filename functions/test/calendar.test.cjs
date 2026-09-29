const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCalendarService, getTodayRange, normalizeCalendarEvent } = require('../calendar');

function createFakeDatabase(initial = {}) {
  const documents = new Map(Object.entries(initial));
  function doc(path) {
    return {
      path,
      async get() {
        const data = documents.get(path);
        return { exists: Boolean(data), id: path.split('/').at(-1), data: () => data };
      },
      async set(data, options = {}) {
        documents.set(path, options.merge ? { ...(documents.get(path) || {}), ...data } : data);
      },
      async delete() { documents.delete(path); },
    };
  }
  function queryCollection(path, field, value, operator = '==', maximum = Infinity) {
    const prefix = `${path}/`;
    const docs = [...documents.entries()]
      .filter(([key, data]) => key.startsWith(prefix)
        && (!field || (operator === '==' ? data[field] === value : data[field] < value)))
      .map(([key, data]) => ({ id: key.slice(prefix.length), ref: doc(key), data: () => data }));
    const page = docs.slice(0, maximum);
    return { docs: page, empty: page.length === 0 };
  }
  return {
    documents,
    doc,
    collection(path) {
      return {
        doc: (id) => doc(`${path}/${id}`),
        where(field, operator, value) {
          return { get: async () => queryCollection(path, field, value, operator) };
        },
        get: async () => queryCollection(path),
        limit(maximum) { return { get: async () => queryCollection(path, null, null, '==', maximum) }; },
      };
    },
    async runTransaction(callback) {
      return callback({
        get: (reference) => reference.get(),
        set: (reference, data, options) => reference.set(data, options),
        delete: (reference) => reference.delete(),
      });
    },
    batch() {
      const operations = [];
      return {
        set: (...args) => operations.push(() => doc(args[0].path).set(args[1], args[2])),
        delete: (reference) => operations.push(() => reference.delete()),
        async commit() { await Promise.all(operations.map((operation) => operation())); },
      };
    },
  };
}

test('today range uses the configured Vietnam calendar day across UTC date boundaries', () => {
  const range = getTodayRange(Date.parse('2026-09-25T18:30:00.000Z'));
  assert.equal(range.date, '2026-09-26');
  assert.equal(range.timeMin, '2026-09-26T00:00:00+07:00');
  assert.equal(range.timeMax, '2026-09-27T00:00:00+07:00');
});

test('calendar event normalization preserves all-day dates and removes HTML from descriptions', () => {
  const event = normalizeCalendarEvent({
    id: 'event-1',
    summary: 'Họp nhóm',
    start: { date: '2026-09-26' },
    end: { date: '2026-09-27' },
    description: '<p>Chuẩn bị&nbsp;slide</p><script>ignore()</script>',
    location: 'Văn phòng',
  }, 'Asia/Ho_Chi_Minh');

  assert.equal(event.title, 'Họp nhóm');
  assert.equal(event.startTime, null);
  assert.equal(event.endTime, null);
  assert.equal(event.allDay, true);
  assert.equal(event.description, 'Chuẩn bị slide ignore()');
  assert.equal(event.location, 'Văn phòng');
});

test('today sync fetches, saves a bounded snapshot, then reuses its short cache', async () => {
  const now = Date.parse('2026-09-25T18:30:00.000Z');
  const range = getTodayRange(now);
  const database = createFakeDatabase({
    '_googleCalendarConnections/alice': {
      accessToken: 'private-access', refreshToken: 'private-refresh', expiresAtMillis: now + 3_600_000,
      providerEmail: 'mai@example.test', connectionId: 'connection-1',
    },
    'users/alice/integrationStatus/googleCalendar': { connected: true, providerEmail: 'mai@example.test' },
  });
  let calls = 0;
  const service = createCalendarService({
    database,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    serverTimestamp: () => 'server-time',
    now: () => now,
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, async json() { return { items: [
        { id: 'event-1', summary: 'Họp nhóm', start: { dateTime: '2026-09-26T02:00:00Z' }, end: { dateTime: '2026-09-26T03:00:00Z' } },
      ] }; } };
    },
  });

  const first = await service.syncToday('alice');
  const cached = await service.syncToday('alice');
  const saved = [...database.documents.entries()].find(([path]) => path.startsWith('users/alice/calendarEvents/'))[1];

  assert.equal(calls, 1);
  assert.equal(first.connected, true);
  assert.equal(first.date, range.date);
  assert.equal(first.events[0].title, 'Họp nhóm');
  assert.equal(cached.events[0].id, 'event-1');
  assert.equal(saved.dateKey, range.date);
  assert.equal(saved.context, 'google_calendar');
});

test('disconnected users do not call Google Calendar', async () => {
  const database = createFakeDatabase({ 'users/alice/integrationStatus/googleCalendar': { connected: false } });
  const service = createCalendarService({ database, fetchImpl: async () => { throw new Error('unexpected'); } });
  const result = await service.syncToday('alice');

  assert.equal(result.connected, false);
  assert.deepEqual(result.events, []);
});

test('expired access tokens refresh on the server before loading events', async () => {
  const now = Date.parse('2026-09-25T18:30:00.000Z');
  const database = createFakeDatabase({
    '_googleCalendarConnections/alice': {
      accessToken: 'expired-access', refreshToken: 'private-refresh', expiresAtMillis: now - 1000,
      connectionId: 'connection-1', providerEmail: 'mai@example.test',
    },
    'users/alice/integrationStatus/googleCalendar': { connected: true },
  });
  const requests = [];
  const service = createCalendarService({
    database,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    serverTimestamp: () => 'server-time',
    now: () => now,
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      return String(url).includes('/token')
        ? { ok: true, async json() { return { access_token: 'fresh-access', expires_in: 3600 }; } }
        : { ok: true, async json() { return { items: [] }; } };
    },
  });

  const result = await service.syncToday('alice');

  assert.equal(result.connected, true);
  assert.equal(requests.length, 2);
  assert.match(requests[0].options.body, /grant_type=refresh_token/);
  assert.equal(database.documents.get('_googleCalendarConnections/alice').accessToken, 'fresh-access');
  assert.equal(database.documents.get('_googleCalendarConnections/alice').refreshToken, 'private-refresh');
});

test('revoked refresh tokens disconnect and clear credentials and events', async () => {
  const now = Date.parse('2026-09-25T18:30:00.000Z');
  const database = createFakeDatabase({
    '_googleCalendarConnections/alice': {
      refreshToken: 'revoked-refresh', expiresAtMillis: now - 1, connectionId: 'connection-1',
    },
    'users/alice/integrationStatus/googleCalendar': { connected: true },
    'users/alice/calendarEvents/old-event': { dateKey: '2026-09-26', title: 'old event' },
  });
  const service = createCalendarService({
    database, clientId: 'client-id', clientSecret: 'client-secret', now: () => now,
    fetchImpl: async () => ({ ok: false, status: 400, async json() { return { error: 'invalid_grant' }; } }),
  });

  const result = await service.syncToday('alice');

  assert.equal(result.connected, false);
  assert.equal(database.documents.has('_googleCalendarConnections/alice'), false);
  assert.equal(database.documents.has('users/alice/calendarEvents/old-event'), false);
});

test('disconnect removes server tokens and cached calendar events', async () => {
  const database = createFakeDatabase({
    '_googleCalendarConnections/alice': { accessToken: 'private-access', refreshToken: 'private-refresh' },
    'users/alice/integrationStatus/googleCalendar': { connected: true },
    'users/alice/calendarEvents/event-1': { dateKey: '2026-09-26', title: 'Họp nhóm' },
  });
  const service = createCalendarService({ database, fetchImpl: async () => ({ ok: true, async json() { return {}; } }) });

  await service.disconnect('alice');

  assert.equal(database.documents.has('_googleCalendarConnections/alice'), false);
  assert.equal(database.documents.has('users/alice/calendarEvents/event-1'), false);
  assert.equal(database.documents.get('users/alice/integrationStatus/googleCalendar').connected, false);
});
