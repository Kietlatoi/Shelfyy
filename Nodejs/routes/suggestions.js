var express = require('express');
var { authenticate } = require('../middleware/auth');
var { query, withTransaction } = require('../db');
var { describeWeatherCode } = require('../services/weatherCodes');
var stylist = require('../services/ruleBasedStylist');

var router = express.Router();
var DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
var MAX_CONTEXT_ITEMS = 60;

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 400;
  error.code = code || 'REQUEST_ERROR';
  error.publicMessage = message;
  return error;
}

function positiveBigInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  var numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return numeric;
}

function localDateString(date, timeZone) {
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce(function(acc, part) {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return parts.year + '-' + parts.month + '-' + parts.day;
}

function todayRange() {
  var timeZone = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
  var offset = process.env.APP_TIME_ZONE_OFFSET || '+07:00';
  var today = localDateString(new Date(), timeZone);
  var start = today + ' 00:00:00';
  var tomorrowDate = new Date(today + 'T00:00:00' + offset);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  var tomorrow = localDateString(tomorrowDate, timeZone);

  return {
    date: today,
    dbStart: start,
    dbEnd: tomorrow + ' 00:00:00',
    timeZone: timeZone,
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  var number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function weatherResponse(row) {
  if (!row) return null;
  var description = describeWeatherCode(row.weather_code);
  return {
    id: Number(row.weather_snapshot_id),
    provider: row.provider,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    timezone: row.timezone,
    location: row.location_label || 'Vị trí hiện tại',
    temperature: numberOrNull(row.temperature_celsius),
    feelsLike: numberOrNull(row.apparent_temperature_celsius),
    humidity: row.relative_humidity,
    precipitation: numberOrNull(row.precipitation_mm),
    rain: numberOrNull(row.rain_mm),
    weatherCode: row.weather_code,
    condition: row.condition_text,
    icon: description.icon,
    cloudCover: row.cloud_cover,
    windSpeed: numberOrNull(row.wind_speed_kmh),
    windDirection: row.wind_direction_deg,
    windGusts: numberOrNull(row.wind_gusts_kmh),
    isDay: row.is_day,
    observedAt: row.observed_at,
    createdAt: row.created_at,
  };
}

function formatEventTime(value, timeZone) {
  if (!value) return null;
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: timeZone || DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);
}

function eventResponse(row, timeZone) {
  return {
    id: Number(row.event_id),
    title: row.event_title || 'Không có tiêu đề',
    start: row.event_start,
    end: row.event_end,
    startTime: formatEventTime(row.event_start, timeZone),
    endTime: formatEventTime(row.event_end, timeZone),
    time: null,
    allDay: false,
    location: row.location || '',
    description: row.description || '',
    context: row.context || '',
    googleEventId: row.google_event_id || '',
    googleCalendarId: row.google_calendar_id || '',
  };
}

function imageUrlFor(row) {
  return row.thumbnail_url || row.background_removed_url || row.image_url || row.source_url || null;
}

function itemResponse(row, extra) {
  var status = row.item_status || 'IN_USE';
  return {
    id: Number(row.item_id),
    name: row.item_name,
    brand: row.brand,
    category: row.category,
    color: row.color,
    colorHex: row.color_hex,
    season: row.season,
    pattern: row.pattern,
    size: row.size,
    material: row.material,
    tags: row.tags,
    imageUrl: imageUrlFor(row),
    thumbnailUrl: row.thumbnail_url,
    backgroundRemovedUrl: row.background_removed_url,
    wearCount: Number(row.wear_count || 0),
    lastWornAt: row.last_worn_at,
    favorite: Boolean(row.is_favorite),
    itemStatus: status,
    slotName: extra && extra.slotName ? extra.slotName : null,
    selectionReason: extra && extra.reason ? extra.reason : '',
    sortOrder: extra && extra.sortOrder != null ? Number(extra.sortOrder) : null,
  };
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return localDateString(date, process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE);
}

function parseJsonValue(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function suggestionResponse(row, items, context) {
  if (!row) return null;
  return {
    id: Number(row.style_suggestion_id),
    status: row.status,
    date: dateOnly(row.suggestion_date),
    title: row.title,
    occasion: row.occasion,
    summary: row.summary || '',
    reason: row.reason || '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    tips: parseJsonValue(row.tips, []),
    modelName: row.model_name,
    weatherSnapshotId: row.weather_snapshot_id == null ? null : Number(row.weather_snapshot_id),
    calendarEventId: row.calendar_event_id == null ? null : Number(row.calendar_event_id),
    confirmedDailyOutfitId: row.confirmed_daily_outfit_id == null ? null : Number(row.confirmed_daily_outfit_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items || [],
    context: context || parseJsonValue(row.input_snapshot, {}),
  };
}

async function fetchLatestWeather(client, userId) {
  var result = await client.query(
    `SELECT *
     FROM weather_snapshots
     WHERE user_id = $1
     ORDER BY observed_at DESC, created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function fetchTodayEvents(client, userId, range) {
  var result = await client.query(
    `SELECT *
     FROM calendar_events
     WHERE user_id = $1
       AND event_start >= $2::timestamp
       AND event_start < $3::timestamp
     ORDER BY event_start ASC
     LIMIT 12`,
    [userId, range.dbStart, range.dbEnd]
  );
  return result.rows;
}

async function fetchWardrobeItems(client, userId) {
  var result = await client.query(
    `SELECT wi.item_id,
            wi.item_name,
            wi.brand,
            wi.category,
            wi.color,
            wi.color_hex,
            wi.season,
            wi.pattern,
            wi.size,
            wi.material,
            wi.tags,
            wi.thumbnail_url,
            wi.background_removed_url,
            wi.source_url,
            wi.wear_count,
            wi.last_worn_at,
            fa.file_url AS image_url,
            COALESCE(wip.is_favorite, wi.is_favorite, false) AS is_favorite,
            COALESCE(wip.item_status, 'IN_USE') AS item_status
     FROM wardrobe_items wi
     LEFT JOIN file_assets fa ON fa.file_id = wi.image_file_id AND fa.deleted_at IS NULL
     LEFT JOIN wardrobe_item_preferences wip
       ON wip.item_id = wi.item_id
      AND wip.user_id = wi.user_id
     WHERE wi.user_id = $1
       AND wi.deleted_at IS NULL
       AND COALESCE(wip.item_status, 'IN_USE') <> 'TO_SELL'
     ORDER BY COALESCE(wip.is_favorite, wi.is_favorite, false) DESC,
              CASE COALESCE(wip.item_status, 'IN_USE')
                WHEN 'IN_USE' THEN 1
                WHEN 'RARELY_USED' THEN 2
                WHEN 'STORED' THEN 3
                ELSE 4
              END ASC,
              wi.wear_count ASC,
              wi.created_at DESC
     LIMIT $2`,
    [userId, MAX_CONTEXT_ITEMS]
  );
  return result.rows;
}

async function fetchRecentItemIds(client, userId) {
  var result = await client.query(
    `SELECT DISTINCT oi.item_id
     FROM daily_outfits d
     JOIN outfit_items oi ON oi.outfit_id = d.outfit_id
     WHERE d.user_id = $1
       AND d.worn_date >= (CURRENT_DATE - INTERVAL '7 days')
     ORDER BY oi.item_id ASC
     LIMIT 80`,
    [userId]
  );
  return result.rows.map(function(row) { return Number(row.item_id); });
}

async function buildContext(client, user, range) {
  var weatherRow = await fetchLatestWeather(client, user.userId);
  var eventRows = await fetchTodayEvents(client, user.userId, range);
  var itemRows = await fetchWardrobeItems(client, user.userId);
  var recentItemIds = await fetchRecentItemIds(client, user.userId);

  var weather = weatherResponse(weatherRow);
  var events = eventRows.map(function(row) { return eventResponse(row, range.timeZone); });
  var wardrobeItems = itemRows.map(function(row) { return itemResponse(row); });

  return {
    date: range.date,
    timeZone: range.timeZone,
    aiConfigured: stylist.isConfigured(),
    suggestionEngine: stylist.getConfig().model,
    userEmail: user.email,
    userName: user.fullName,
    weather: weather,
    events: events,
    wardrobeItems: wardrobeItems,
    wardrobeCount: wardrobeItems.length,
    recentItemIds: recentItemIds,
  };
}

function compactInputSnapshot(context) {
  return {
    date: context.date,
    timeZone: context.timeZone,
    weather: context.weather ? {
      id: context.weather.id,
      location: context.weather.location,
      temperature: context.weather.temperature,
      feelsLike: context.weather.feelsLike,
      condition: context.weather.condition,
      humidity: context.weather.humidity,
      cloudCover: context.weather.cloudCover,
      windSpeed: context.weather.windSpeed,
    } : null,
    events: context.events.map(function(event) {
      return {
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
      };
    }),
    wardrobeItemIds: context.wardrobeItems.map(function(item) { return item.id; }),
    recentItemIds: context.recentItemIds,
    previousSuggestionItemIds: context.previousSuggestionItemIds || [],
  };
}

async function fetchSuggestionItems(client, userId, suggestionId) {
  var result = await client.query(
    `SELECT wi.item_id,
            wi.item_name,
            wi.brand,
            wi.category,
            wi.color,
            wi.color_hex,
            wi.season,
            wi.pattern,
            wi.size,
            wi.material,
            wi.tags,
            wi.thumbnail_url,
            wi.background_removed_url,
            wi.source_url,
            wi.wear_count,
            wi.last_worn_at,
            fa.file_url AS image_url,
            COALESCE(wip.is_favorite, wi.is_favorite, false) AS is_favorite,
            COALESCE(wip.item_status, 'IN_USE') AS item_status,
            si.slot_name,
            si.reason AS selection_reason,
            si.sort_order
     FROM ai_style_suggestion_items si
     JOIN wardrobe_items wi ON wi.item_id = si.item_id
     LEFT JOIN file_assets fa ON fa.file_id = wi.image_file_id AND fa.deleted_at IS NULL
     LEFT JOIN wardrobe_item_preferences wip
       ON wip.item_id = wi.item_id
      AND wip.user_id = wi.user_id
     WHERE si.style_suggestion_id = $1
       AND wi.user_id = $2
       AND wi.deleted_at IS NULL
     ORDER BY si.sort_order ASC, si.style_suggestion_item_id ASC`,
    [suggestionId, userId]
  );
  return result.rows.map(function(row) {
    return itemResponse(row, {
      slotName: row.slot_name,
      reason: row.selection_reason,
      sortOrder: row.sort_order,
    });
  });
}

async function fetchLatestSuggestion(client, userId, date) {
  var result = await client.query(
    `SELECT *
     FROM ai_style_suggestions
     WHERE user_id = $1
       AND suggestion_date = $2::date
       AND status <> 'FAILED'
     ORDER BY created_at DESC, style_suggestion_id DESC
     LIMIT 1`,
    [userId, date]
  );
  return result.rows[0] || null;
}

async function fetchLatestSuggestionItemIds(client, userId, date) {
  var result = await client.query(
    `SELECT si.item_id
     FROM ai_style_suggestion_items si
     JOIN ai_style_suggestions s ON s.style_suggestion_id = si.style_suggestion_id
     WHERE s.style_suggestion_id = (
       SELECT style_suggestion_id
       FROM ai_style_suggestions
       WHERE user_id = $1
         AND suggestion_date = $2::date
         AND status <> 'FAILED'
       ORDER BY created_at DESC, style_suggestion_id DESC
       LIMIT 1
     )
       AND s.user_id = $1
     ORDER BY si.sort_order ASC, si.style_suggestion_item_id ASC`,
    [userId, date]
  );
  return result.rows.map(function(row) { return Number(row.item_id); });
}

function slotForItem(itemById, selected) {
  var requested = String(selected.slotName || '').toUpperCase();
  var item = itemById.get(Number(selected.itemId));
  var fallback = item ? String(item.category || 'OTHER').toUpperCase() : 'OTHER';
  var allowed = ['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER'];
  if (allowed.includes(requested)) return requested;
  return allowed.includes(fallback) ? fallback : 'OTHER';
}

router.get('/today/latest', authenticate, async function(req, res, next) {
  try {
    var range = todayRange();
    var result = await withTransaction(async function(client) {
      var context = await buildContext(client, req.user, range);
      var latest = await fetchLatestSuggestion(client, req.user.userId, range.date);
      if (!latest) {
        return {
          generated: false,
          aiConfigured: context.aiConfigured,
          suggestionEngine: context.suggestionEngine,
          suggestion: null,
          context: {
            date: context.date,
            timeZone: context.timeZone,
            weather: context.weather,
            events: context.events,
            wardrobeCount: context.wardrobeCount,
            recentItemIds: context.recentItemIds,
            suggestionEngine: context.suggestionEngine,
          },
        };
      }

      var items = await fetchSuggestionItems(client, req.user.userId, latest.style_suggestion_id);
      return {
        generated: true,
        aiConfigured: context.aiConfigured,
        suggestionEngine: context.suggestionEngine,
        suggestion: suggestionResponse(latest, items, {
          date: context.date,
          timeZone: context.timeZone,
          weather: context.weather,
          events: context.events,
          wardrobeCount: context.wardrobeCount,
          recentItemIds: context.recentItemIds,
          suggestionEngine: context.suggestionEngine,
        }),
      };
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/today', authenticate, async function(req, res, next) {
  try {
    var range = todayRange();
    var context = await withTransaction(async function(client) {
      var built = await buildContext(client, req.user, range);
      built.previousSuggestionItemIds = await fetchLatestSuggestionItemIds(client, req.user.userId, range.date);
      return built;
    });
    if (!context.wardrobeItems.length) {
      throw publicError('Tủ đồ chưa có món hợp lệ để tạo gợi ý.', 409, 'WARDROBE_CONTEXT_EMPTY');
    }

    var generated = await stylist.generateStylingSuggestion(context);
    var result = await withTransaction(async function(client) {
      var suggestion = generated.suggestion;
      var itemById = new Map(context.wardrobeItems.map(function(item) { return [Number(item.id), item]; }));
      var primaryEvent = context.events[0] || null;

      var insert = await client.query(
        `INSERT INTO ai_style_suggestions (
           user_id,
           weather_snapshot_id,
           calendar_event_id,
           model_name,
           status,
           suggestion_date,
           title,
           occasion,
           summary,
           reason,
           confidence,
           tips,
           input_snapshot,
           raw_response,
           created_at,
           updated_at
         ) VALUES (
           $1, $2, $3, $4, 'GENERATED', $5::date, $6, $7, $8, $9, $10,
           $11::jsonb, $12::jsonb, $13::jsonb, NOW(), NOW()
         )
         RETURNING *`,
        [
          req.user.userId,
          context.weather ? context.weather.id : null,
          primaryEvent ? primaryEvent.id : null,
          generated.modelName,
          range.date,
          suggestion.title,
          suggestion.occasion,
          suggestion.summary,
          suggestion.reason,
          suggestion.confidence,
          JSON.stringify(suggestion.tips || []),
          JSON.stringify(compactInputSnapshot(context)),
          JSON.stringify(generated.rawResponse || {}),
        ]
      );

      var row = insert.rows[0];
      for (var i = 0; i < suggestion.items.length; i += 1) {
        var selected = suggestion.items[i];
        await client.query(
          `INSERT INTO ai_style_suggestion_items (
             style_suggestion_id, item_id, slot_name, reason, sort_order, created_at
           ) VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT DO NOTHING`,
          [
            row.style_suggestion_id,
            selected.itemId,
            slotForItem(itemById, selected),
            selected.reason || '',
            i,
          ]
        );
      }

      var items = await fetchSuggestionItems(client, req.user.userId, row.style_suggestion_id);
      return suggestionResponse(row, items, {
        date: context.date,
        timeZone: context.timeZone,
        weather: context.weather,
        events: context.events,
        wardrobeCount: context.wardrobeCount,
        recentItemIds: context.recentItemIds,
        previousSuggestionItemIds: context.previousSuggestionItemIds || [],
        suggestionEngine: context.suggestionEngine,
      });
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/confirm', authenticate, async function(req, res, next) {
  try {
    var suggestionId = positiveBigInt(req.params.id, 'suggestionId');
    var dailyOutfitId = positiveBigInt(req.body && req.body.dailyOutfitId, 'dailyOutfitId');

    var result = await withTransaction(async function(client) {
      var existing = await client.query(
        `SELECT *
         FROM ai_style_suggestions
         WHERE style_suggestion_id = $1
           AND user_id = $2
         FOR UPDATE`,
        [suggestionId, req.user.userId]
      );
      if (existing.rowCount === 0) {
        throw publicError('Gợi ý không tồn tại hoặc không thuộc tài khoản hiện tại.', 404, 'SUGGESTION_NOT_FOUND');
      }

      if (dailyOutfitId) {
        var daily = await client.query(
          `SELECT 1
           FROM daily_outfits
           WHERE daily_outfit_id = $1
             AND user_id = $2
           LIMIT 1`,
          [dailyOutfitId, req.user.userId]
        );
        if (daily.rowCount === 0) {
          throw publicError('Daily outfit không tồn tại hoặc không thuộc tài khoản hiện tại.', 422, 'DAILY_OUTFIT_NOT_FOUND');
        }
      }

      var updated = await client.query(
        `UPDATE ai_style_suggestions
         SET status = 'CONFIRMED',
             confirmed_daily_outfit_id = $3,
             updated_at = NOW()
         WHERE style_suggestion_id = $1
           AND user_id = $2
         RETURNING *`,
        [suggestionId, req.user.userId, dailyOutfitId]
      );
      var items = await fetchSuggestionItems(client, req.user.userId, suggestionId);
      return suggestionResponse(updated.rows[0], items);
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
