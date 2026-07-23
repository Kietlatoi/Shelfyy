var crypto = require('crypto');
var express = require('express');
var { authenticate } = require('../middleware/auth');
var { query, withTransaction } = require('../db');
var { encryptSecret, decryptSecret } = require('../services/cryptoBox');
var google = require('../services/googleOAuthClient');

var router = express.Router();
var PROVIDER = 'GOOGLE';
var DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
var DEFAULT_TIME_ZONE_OFFSET = '+07:00';

function hashState(state) {
  return crypto.createHash('sha256').update(String(state || '')).digest('hex');
}

function frontendRedirectUrl(status) {
  var base = String(process.env.APP_FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return base + '/#/home?calendar=' + encodeURIComponent(status);
}

function publicGoogleError(message, status, code) {
  var error = new Error(message);
  error.status = status || 502;
  error.code = code || 'GOOGLE_CALENDAR_ERROR';
  error.publicMessage = message;
  return error;
}

function getLocalDateParts(date, timeZone) {
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return parts.reduce(function(acc, part) {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
}

function localDateString(date, timeZone) {
  var parts = getLocalDateParts(date, timeZone);
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function localDateTimeString(value, timeZone) {
  if (!value) return null;

  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date).reduce(function(acc, part) {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return parts.year + '-' + parts.month + '-' + parts.day + ' ' +
    parts.hour + ':' + parts.minute + ':' + parts.second;
}

function todayRange() {
  var timeZone = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
  var offset = process.env.APP_TIME_ZONE_OFFSET || DEFAULT_TIME_ZONE_OFFSET;
  var today = localDateString(new Date(), timeZone);
  var start = today + 'T00:00:00' + offset;
  var tomorrow = localDateString(new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000), timeZone);

  return {
    date: today,
    timeZone: timeZone,
    timeMin: start,
    timeMax: tomorrow + 'T00:00:00' + offset,
    dbStart: today + ' 00:00:00',
    dbEnd: tomorrow + ' 00:00:00',
  };
}

function formatEventTime(value, timeZone) {
  if (!value) return null;
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);
}

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

function toEventResponse(event, timeZone) {
  var start = event.start || {};
  var end = event.end || {};
  var allDay = Boolean(start.date && !start.dateTime);
  var startValue = start.dateTime || start.date;
  var endValue = end.dateTime || end.date;

  return {
    id: event.id,
    title: event.summary || 'Không có tiêu đề',
    startDate: start.date || null,
    endDate: end.date || null,
    startDateTime: start.dateTime || null,
    endDateTime: end.dateTime || null,
    startTime: allDay ? null : formatEventTime(start.dateTime, timeZone),
    endTime: allDay ? null : formatEventTime(end.dateTime, timeZone),
    time: allDay ? 'Cả ngày' : null,
    allDay: allDay,
    location: event.location || '',
    description: plainText(event.description),
    htmlLink: event.htmlLink || '',
    status: event.status || '',
    rawStart: startValue,
    rawEnd: endValue,
  };
}

function toDbEvent(event, timeZone) {
  var start = event.start || {};
  var end = event.end || {};
  var startValue = start.dateTime ? localDateTimeString(start.dateTime, timeZone) : (start.date ? start.date + ' 00:00:00' : null);
  var endValue = end.dateTime ? localDateTimeString(end.dateTime, timeZone) : (end.date ? end.date + ' 00:00:00' : null);

  return {
    googleEventId: event.id,
    googleCalendarId: 'primary',
    title: event.summary || 'Không có tiêu đề',
    start: startValue,
    end: endValue,
    location: event.location || null,
    description: plainText(event.description) || null,
    context: 'google_calendar',
  };
}

async function findConnection(userId) {
  var result = await query(
    `SELECT *
     FROM calendar_connections
     WHERE user_id = $1
       AND provider = $2
       AND disconnected_at IS NULL
     LIMIT 1`,
    [userId, PROVIDER]
  );
  return result.rows[0] || null;
}

function connectionStatus(connection) {
  return {
    connected: Boolean(connection),
    provider: PROVIDER,
    email: connection ? connection.provider_email : null,
    connectedAt: connection ? connection.connected_at : null,
    lastSyncedAt: connection ? connection.last_synced_at : null,
    calendarUrl: 'https://calendar.google.com/calendar/u/0/r',
  };
}

async function markDisconnected(userId) {
  await query(
    `UPDATE calendar_connections
     SET disconnected_at = NOW(),
         access_token_ciphertext = NULL,
         refresh_token_ciphertext = NULL
     WHERE user_id = $1 AND provider = $2`,
    [userId, PROVIDER]
  );
}

async function ensureAccessToken(connection) {
  var currentToken = decryptSecret(connection.access_token_ciphertext);
  var expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;

  if (currentToken && expiresAt - Date.now() > 60 * 1000) {
    return currentToken;
  }

  var refreshToken = decryptSecret(connection.refresh_token_ciphertext);
  if (!refreshToken) {
    throw publicGoogleError('Cần kết nối lại Google Calendar.', 409, 'GOOGLE_CALENDAR_RECONNECT_REQUIRED');
  }

  try {
    var refreshed = await google.refreshAccessToken(refreshToken);
    if (!refreshed.access_token) {
      throw publicGoogleError('Google không trả access token mới.', 502, 'GOOGLE_CALENDAR_REFRESH_FAILED');
    }

    var tokenExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
      : null;

    await query(
      `UPDATE calendar_connections
       SET access_token_ciphertext = $1,
           token_expires_at = $2,
           scope = COALESCE($3, scope)
       WHERE calendar_connection_id = $4`,
      [
        encryptSecret(refreshed.access_token),
        tokenExpiresAt,
        refreshed.scope || null,
        connection.calendar_connection_id,
      ]
    );

    return refreshed.access_token;
  } catch (err) {
    if (err.googleStatus === 400 || err.googleStatus === 401) {
      await markDisconnected(connection.user_id);
      throw publicGoogleError('Cần kết nối lại Google Calendar.', 409, 'GOOGLE_CALENDAR_RECONNECT_REQUIRED');
    }
    throw err;
  }
}

async function upsertConnection(userId, tokens, profile) {
  var config = google.getConfig();
  var expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000)
    : null;

  var previous = await query(
    `SELECT refresh_token_ciphertext
     FROM calendar_connections
     WHERE user_id = $1 AND provider = $2
     LIMIT 1`,
    [userId, PROVIDER]
  );
  var previousRefresh = previous.rows[0] && previous.rows[0].refresh_token_ciphertext;

  if (!tokens.refresh_token && !previousRefresh) {
    throw publicGoogleError('Google chưa trả refresh token. Hãy thử kết nối lại và cấp quyền đầy đủ.', 409, 'GOOGLE_CALENDAR_REFRESH_TOKEN_MISSING');
  }

  await query(
    `INSERT INTO calendar_connections (
       user_id,
       provider,
       provider_account_id,
       provider_email,
       scope,
       access_token_ciphertext,
       refresh_token_ciphertext,
       token_expires_at,
       connected_at,
       disconnected_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NULL
     )
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       provider_account_id = EXCLUDED.provider_account_id,
       provider_email = COALESCE(EXCLUDED.provider_email, calendar_connections.provider_email),
       scope = EXCLUDED.scope,
       access_token_ciphertext = EXCLUDED.access_token_ciphertext,
       refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
       token_expires_at = EXCLUDED.token_expires_at,
       connected_at = NOW(),
       disconnected_at = NULL`,
    [
      userId,
      PROVIDER,
      profile && profile.id ? profile.id : null,
      profile && profile.email ? profile.email : null,
      tokens.scope || config.scopes,
      encryptSecret(tokens.access_token),
      tokens.refresh_token ? encryptSecret(tokens.refresh_token) : previousRefresh,
      expiresAt,
    ]
  );
}

async function saveEventsSnapshot(userId, range, events) {
  var dbEvents = events.map(function(event) {
    return toDbEvent(event, range.timeZone);
  }).filter(function(event) {
    return event.googleEventId && event.start;
  });

  await withTransaction(async function(client) {
    var ids = dbEvents.map(function(event) { return event.googleEventId; });
    if (ids.length) {
      await client.query(
        `DELETE FROM calendar_events
         WHERE user_id = $1
           AND google_calendar_id = 'primary'
           AND google_event_id IS NOT NULL
           AND event_start >= $2
           AND event_start < $3
           AND NOT (google_event_id = ANY($4::text[]))`,
        [userId, range.dbStart, range.dbEnd, ids]
      );
    } else {
      await client.query(
        `DELETE FROM calendar_events
         WHERE user_id = $1
           AND google_calendar_id = 'primary'
           AND google_event_id IS NOT NULL
           AND event_start >= $2
           AND event_start < $3`,
        [userId, range.dbStart, range.dbEnd]
      );
    }

    for (var i = 0; i < dbEvents.length; i += 1) {
      var event = dbEvents[i];
      await client.query(
        `INSERT INTO calendar_events (
           user_id,
           event_title,
           event_start,
           event_end,
           location,
           description,
           context,
           google_event_id,
           google_calendar_id,
           last_synced_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
         )
         ON CONFLICT (user_id, google_calendar_id, google_event_id)
         WHERE google_event_id IS NOT NULL
         DO UPDATE SET
           event_title = EXCLUDED.event_title,
           event_start = EXCLUDED.event_start,
           event_end = EXCLUDED.event_end,
           location = EXCLUDED.location,
           description = EXCLUDED.description,
           context = EXCLUDED.context,
           last_synced_at = NOW()`,
        [
          userId,
          event.title,
          event.start,
          event.end,
          event.location,
          event.description,
          event.context,
          event.googleEventId,
          event.googleCalendarId,
        ]
      );
    }

    await client.query(
      `UPDATE calendar_connections
       SET last_synced_at = NOW()
       WHERE user_id = $1 AND provider = $2`,
      [userId, PROVIDER]
    );
  });
}

router.get('/status', authenticate, async function(req, res, next) {
  try {
    var connection = await findConnection(req.user.userId);
    return res.json(connectionStatus(connection));
  } catch (err) {
    return next(err);
  }
});

router.post('/google/connect', authenticate, async function(req, res, next) {
  try {
    var state = crypto.randomBytes(32).toString('hex');
    var ttlMs = Number(process.env.GOOGLE_OAUTH_STATE_TTL_MS || 10 * 60 * 1000);
    var expiresAt = new Date(Date.now() + ttlMs);

    await query(
      `DELETE FROM calendar_oauth_states
       WHERE user_id = $1 AND (expires_at < NOW() OR consumed_at IS NOT NULL)`,
      [req.user.userId]
    );

    await query(
      `INSERT INTO calendar_oauth_states (user_id, state_hash, redirect_after, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, hashState(state), '/#/home', expiresAt]
    );

    return res.status(201).json({
      authorizationUrl: google.buildAuthorizationUrl(state),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/google/callback', async function(req, res) {
  try {
    if (req.query.error) {
      return res.redirect(frontendRedirectUrl('denied'));
    }

    var code = String(req.query.code || '');
    var state = String(req.query.state || '');
    if (!code || !state) {
      return res.redirect(frontendRedirectUrl('invalid'));
    }

    var oauthState = await withTransaction(async function(client) {
      var result = await client.query(
        `UPDATE calendar_oauth_states
         SET consumed_at = NOW()
         WHERE state_hash = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()
         RETURNING user_id`,
        [hashState(state)]
      );

      if (result.rowCount === 0) {
        throw publicGoogleError('Phiên kết nối Google Calendar không hợp lệ hoặc đã hết hạn.', 400, 'GOOGLE_OAUTH_STATE_INVALID');
      }

      return result.rows[0];
    });

    var tokens = await google.exchangeCodeForTokens(code);
    var profile = null;
    if (tokens.access_token) {
      try {
        profile = await google.getGoogleProfile(tokens.access_token);
      } catch (err) {
        profile = null;
      }
    }

    await upsertConnection(oauthState.user_id, tokens, profile);
    return res.redirect(frontendRedirectUrl('connected'));
  } catch (err) {
    return res.redirect(frontendRedirectUrl(err.code || 'error'));
  }
});

router.get('/today', authenticate, async function(req, res, next) {
  try {
    var range = todayRange();
    var connection = await findConnection(req.user.userId);
    if (!connection) {
      return res.json({
        ...connectionStatus(null),
        date: range.date,
        timeZone: range.timeZone,
        events: [],
      });
    }

    var accessToken;
    try {
      accessToken = await ensureAccessToken(connection);
    } catch (err) {
      if (err.code === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED') {
        return res.json({
          ...connectionStatus(null),
          date: range.date,
          timeZone: range.timeZone,
          status: err.code,
          events: [],
        });
      }
      throw err;
    }

    var googleEvents;
    try {
      googleEvents = await google.fetchTodayEvents(accessToken, range, 20);
    } catch (err) {
      if (err.googleStatus === 401 || err.googleStatus === 403) {
        await markDisconnected(req.user.userId);
        return res.json({
          ...connectionStatus(null),
          date: range.date,
          timeZone: range.timeZone,
          status: 'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
          events: [],
        });
      }
      throw err;
    }
    var events = Array.isArray(googleEvents.items) ? googleEvents.items : [];
    await saveEventsSnapshot(req.user.userId, range, events);

    var updatedConnection = await findConnection(req.user.userId);
    return res.json({
      ...connectionStatus(updatedConnection || connection),
      date: range.date,
      timeZone: range.timeZone,
      events: events.map(function(event) {
        return toEventResponse(event, range.timeZone);
      }),
    });
  } catch (err) {
    return next(err);
  }
});

router.delete('/google/disconnect', authenticate, async function(req, res, next) {
  try {
    await markDisconnected(req.user.userId);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
