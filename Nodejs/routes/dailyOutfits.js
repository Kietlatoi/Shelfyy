var express = require('express');
var { authenticate } = require('../middleware/auth');
var { withTransaction } = require('../db');

var router = express.Router();
var DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
var MAX_OUTFIT_ITEMS = 20;

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

function limitedString(value, maxLength, fieldName, fallback) {
  var raw = value === undefined || value === null ? fallback : value;
  var text = String(raw || '').trim();
  if (!text) text = String(fallback || '').trim();
  if (text.length > maxLength) {
    throw publicError(fieldName + ' tối đa ' + maxLength + ' ký tự.', 422, 'VALIDATION_ERROR');
  }
  return text || null;
}

function localDateString(date, timeZone) {
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce(function(acc, part) {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return parts.year + '-' + parts.month + '-' + parts.day;
}

function dateOnlyString(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return localDateString(date, process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE);
}

function normalizeWornDate(value) {
  if (value === undefined || value === null || value === '') {
    return localDateString(new Date(), process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE);
  }

  var text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw publicError('wornDate phải có định dạng YYYY-MM-DD.', 422, 'VALIDATION_ERROR');
  }

  var parsed = new Date(text + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw publicError('wornDate không hợp lệ.', 422, 'VALIDATION_ERROR');
  }

  return text;
}

function normalizeOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  var text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw publicError(fieldName + ' phải có định dạng YYYY-MM-DD.', 422, 'VALIDATION_ERROR');
  }

  var parsed = new Date(text + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return text;
}

function normalizePageParams(query) {
  var page = Number(query && query.page !== undefined ? query.page : 0);
  var size = Number(query && query.size !== undefined ? query.size : 12);
  if (!Number.isInteger(page) || page < 0) {
    throw publicError('page phải là số nguyên không âm.', 422, 'VALIDATION_ERROR');
  }
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    throw publicError('size phải nằm trong khoảng 1 đến 50.', 422, 'VALIDATION_ERROR');
  }
  return { page: page, size: size };
}

function normalizeItemIds(itemIds) {
  if (!Array.isArray(itemIds)) {
    throw publicError('itemIds phải là danh sách món đồ.', 422, 'VALIDATION_ERROR');
  }

  var unique = [];
  var seen = new Set();
  for (var i = 0; i < itemIds.length; i += 1) {
    var id = positiveBigInt(itemIds[i], 'itemId');
    if (!seen.has(id)) {
      unique.push(id);
      seen.add(id);
    }
  }

  if (!unique.length) {
    throw publicError('Chọn ít nhất một món đồ để xác nhận outfit hôm nay.', 422, 'VALIDATION_ERROR');
  }
  if (unique.length > MAX_OUTFIT_ITEMS) {
    throw publicError('Một outfit chỉ được chọn tối đa ' + MAX_OUTFIT_ITEMS + ' món đồ.', 422, 'VALIDATION_ERROR');
  }
  return unique;
}

function validateConfirmPayload(body) {
  var payload = body || {};
  var outfitId = positiveBigInt(payload.outfitId, 'outfitId');
  var hasItemIds = Object.prototype.hasOwnProperty.call(payload, 'itemIds');
  if (outfitId && hasItemIds) {
    throw publicError('Chỉ gửi outfitId hoặc itemIds, không gửi cả hai.', 422, 'VALIDATION_ERROR');
  }
  if (!outfitId && !hasItemIds) {
    throw publicError('Cần outfitId hoặc itemIds để xác nhận outfit hôm nay.', 422, 'VALIDATION_ERROR');
  }

  return {
    outfitId: outfitId,
    itemIds: outfitId ? null : normalizeItemIds(payload.itemIds),
    wornDate: normalizeWornDate(payload.wornDate),
    name: limitedString(payload.name, 150, 'Tên outfit', 'Outfit hôm nay'),
    occasion: limitedString(payload.occasion, 100, 'Dịp mặc', 'Hôm nay'),
    description: limitedString(payload.description, 500, 'Mô tả', 'Người dùng tự chọn trong tủ đồ cá nhân.'),
    notes: limitedString(payload.notes, 500, 'Ghi chú', null),
    weatherSnapshotId: positiveBigInt(payload.weatherSnapshotId, 'weatherSnapshotId'),
    calendarEventId: positiveBigInt(payload.calendarEventId, 'calendarEventId'),
  };
}

function slotForCategory(category) {
  var value = String(category || '').toUpperCase();
  if (['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER'].includes(value)) {
    return value;
  }
  return 'OTHER';
}

function rowToOutfit(row, items) {
  return {
    id: Number(row.outfit_id),
    name: row.outfit_name,
    description: row.description,
    occasion: row.occasion,
    style: row.style,
    source: row.source,
    favorite: row.is_favorite,
    createdAt: row.outfit_created_at || row.created_at,
    itemIds: items.map(function(item) { return Number(item.id); }),
    items: items,
  };
}

function rowToItem(row) {
  return {
    id: Number(row.item_id),
    name: row.item_name,
    brand: row.brand,
    category: row.category,
    color: row.color,
    colorHex: row.color_hex,
    season: row.season,
    pattern: row.pattern,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    backgroundRemovedUrl: row.background_removed_url,
    wearCount: Number(row.wear_count || 0),
    lastWornAt: row.last_worn_at,
  };
}

function dailyResponse(row, outfit, items, addedIds, removedIds, confirmed) {
  return {
    id: Number(row.daily_outfit_id),
    confirmed: confirmed,
    wornDate: dateOnlyString(row.worn_date),
    confirmedAt: row.confirmed_at,
    weatherSnapshotId: row.weather_snapshot_id == null ? null : Number(row.weather_snapshot_id),
    calendarEventId: row.calendar_event_id == null ? null : Number(row.calendar_event_id),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    weather: row.weather_snapshot_id ? {
      id: Number(row.weather_snapshot_id),
      location: row.location_label || 'Vị trí hiện tại',
      temperature: row.temperature_celsius == null ? null : Number(row.temperature_celsius),
      condition: row.condition_text || '',
    } : null,
    calendarEvent: row.calendar_event_id ? {
      id: Number(row.calendar_event_id),
      title: row.event_title || '',
      start: row.event_start || null,
      end: row.event_end || null,
    } : null,
    outfit: rowToOutfit(outfit, items),
    wearCountUpdated: {
      addedItemIds: addedIds || [],
      removedItemIds: removedIds || [],
    },
  };
}

async function assertOwnedReference(client, table, idColumn, value, userId, label) {
  if (!value) return;
  var result = await client.query(
    'SELECT 1 FROM ' + table + ' WHERE ' + idColumn + ' = $1 AND user_id = $2 LIMIT 1',
    [value, userId]
  );
  if (result.rowCount === 0) {
    throw publicError(label + ' không tồn tại hoặc không thuộc tài khoản hiện tại.', 422, 'VALIDATION_ERROR');
  }
}

async function fetchWardrobeItems(client, userId, itemIds) {
  var result = await client.query(
    `SELECT item_id, item_name, brand, category, color, color_hex, season, pattern,
            thumbnail_url, background_removed_url, wear_count, last_worn_at
     FROM wardrobe_items
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND item_id = ANY($2::bigint[])`,
    [userId, itemIds]
  );

  if (result.rowCount !== itemIds.length) {
    throw publicError('Một số món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.', 404, 'WARDROBE_ITEMS_NOT_FOUND');
  }

  var byId = new Map(result.rows.map(function(row) { return [Number(row.item_id), row]; }));
  return itemIds.map(function(id) { return byId.get(Number(id)); });
}

async function fetchOutfitItems(client, userId, outfitId) {
  var result = await client.query(
    `SELECT wi.item_id, wi.item_name, wi.brand, wi.category, wi.color, wi.color_hex,
            wi.season, wi.pattern, wi.thumbnail_url, wi.background_removed_url,
            wi.wear_count, wi.last_worn_at, fa.file_url AS image_url
     FROM outfit_items oi
     JOIN wardrobe_items wi ON wi.item_id = oi.item_id
     LEFT JOIN file_assets fa ON fa.file_id = wi.image_file_id
     WHERE oi.outfit_id = $1
       AND wi.user_id = $2
       AND wi.deleted_at IS NULL
     ORDER BY oi.outfit_item_id ASC`,
    [outfitId, userId]
  );
  return result.rows;
}

async function createOutfit(client, userId, payload, itemRows) {
  var outfitResult = await client.query(
    `INSERT INTO outfits (
       user_id, outfit_name, description, occasion, source, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, 'USER_CREATED', NOW(), NOW()
     )
     RETURNING outfit_id, outfit_name, description, occasion, style, source, is_favorite, created_at AS outfit_created_at`,
    [userId, payload.name, payload.description, payload.occasion]
  );
  var outfit = outfitResult.rows[0];

  for (var i = 0; i < itemRows.length; i += 1) {
    await client.query(
      `INSERT INTO outfit_items (outfit_id, item_id, slot_name)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [outfit.outfit_id, itemRows[i].item_id, slotForCategory(itemRows[i].category)]
    );
  }

  return outfit;
}

async function fetchOutfit(client, userId, outfitId) {
  var result = await client.query(
    `SELECT outfit_id, outfit_name, description, occasion, style, source, is_favorite,
            created_at AS outfit_created_at
     FROM outfits
     WHERE outfit_id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [outfitId, userId]
  );
  if (result.rowCount === 0) {
    throw publicError('Outfit không tồn tại hoặc không thuộc tài khoản hiện tại.', 404, 'OUTFIT_NOT_FOUND');
  }
  return result.rows[0];
}

async function outfitItemIds(client, outfitId) {
  var result = await client.query(
    'SELECT item_id FROM outfit_items WHERE outfit_id = $1 ORDER BY outfit_item_id ASC',
    [outfitId]
  );
  return result.rows.map(function(row) { return Number(row.item_id); });
}

function diffIds(nextIds, previousIds) {
  var previous = new Set(previousIds.map(Number));
  var next = new Set(nextIds.map(Number));
  return {
    added: nextIds.filter(function(id) { return !previous.has(Number(id)); }),
    removed: previousIds.filter(function(id) { return !next.has(Number(id)); }),
  };
}

async function updateWearCounts(client, userId, addedIds, removedIds) {
  if (addedIds.length) {
    await client.query(
      `UPDATE wardrobe_items
       SET wear_count = wear_count + 1,
           last_worn_at = NOW()
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND item_id = ANY($2::bigint[])`,
      [userId, addedIds]
    );
  }

  if (removedIds.length) {
    await client.query(
      `UPDATE wardrobe_items wi
       SET wear_count = GREATEST(wi.wear_count - 1, 0),
           last_worn_at = (
             SELECT MAX(d.worn_date)::timestamp
             FROM daily_outfits d
             JOIN outfit_items oi ON oi.outfit_id = d.outfit_id
             WHERE d.user_id = $1
               AND oi.item_id = wi.item_id
           )
       WHERE wi.user_id = $1
         AND wi.deleted_at IS NULL
         AND wi.item_id = ANY($2::bigint[])`,
      [userId, removedIds]
    );
  }
}

function pageResponse(content, page, size, totalElements) {
  var totalPages = Math.ceil(totalElements / size);
  return {
    content: content,
    page: page,
    size: size,
    totalElements: totalElements,
    totalPages: totalPages,
    numberOfElements: content.length,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
  };
}

router.get('/', authenticate, async function(req, res, next) {
  try {
    var paging = normalizePageParams(req.query);
    var from = normalizeOptionalDate(req.query.from, 'from');
    var to = normalizeOptionalDate(req.query.to, 'to');
    if (from && to && from > to) {
      throw publicError('from không được sau to.', 422, 'VALIDATION_ERROR');
    }

    var result = await withTransaction(async function(client) {
      var params = [req.user.userId];
      var conditions = ['d.user_id = $1'];

      if (from) {
        params.push(from);
        conditions.push('d.worn_date >= $' + params.length + '::date');
      }
      if (to) {
        params.push(to);
        conditions.push('d.worn_date <= $' + params.length + '::date');
      }

      var whereClause = conditions.join(' AND ');
      var countResult = await client.query(
        'SELECT COUNT(*)::int AS total FROM daily_outfits d WHERE ' + whereClause,
        params
      );
      var total = Number(countResult.rows[0] && countResult.rows[0].total || 0);

      params.push(paging.size);
      var limitParam = '$' + params.length;
      params.push(paging.page * paging.size);
      var offsetParam = '$' + params.length;

      var dailyResult = await client.query(
        `SELECT d.*,
                o.outfit_id, o.outfit_name, o.description, o.occasion, o.style,
                o.source, o.is_favorite, o.created_at AS outfit_created_at,
                ws.location_label, ws.temperature_celsius, ws.condition_text,
                ce.event_title, ce.event_start, ce.event_end
         FROM daily_outfits d
         JOIN outfits o ON o.outfit_id = d.outfit_id
         LEFT JOIN weather_snapshots ws ON ws.weather_snapshot_id = d.weather_snapshot_id
         LEFT JOIN calendar_events ce ON ce.event_id = d.calendar_event_id
         WHERE ${whereClause}
         ORDER BY d.worn_date DESC, d.confirmed_at DESC, d.daily_outfit_id DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );

      var content = [];
      for (var i = 0; i < dailyResult.rows.length; i += 1) {
        var row = dailyResult.rows[i];
        var items = (await fetchOutfitItems(client, req.user.userId, row.outfit_id)).map(rowToItem);
        content.push(dailyResponse(row, row, items, [], [], true));
      }

      return pageResponse(content, paging.page, paging.size, total);
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/today', authenticate, async function(req, res, next) {
  try {
    var wornDate = normalizeWornDate(req.query.date);
    var result = await withTransaction(async function(client) {
      var dailyResult = await client.query(
        `SELECT d.*, o.outfit_id, o.outfit_name, o.description, o.occasion, o.style,
                o.source, o.is_favorite, o.created_at AS outfit_created_at
         FROM daily_outfits d
         JOIN outfits o ON o.outfit_id = d.outfit_id
         WHERE d.user_id = $1
           AND d.worn_date = $2
         LIMIT 1`,
        [req.user.userId, wornDate]
      );

      if (dailyResult.rowCount === 0) {
        return {
          confirmed: false,
          wornDate: wornDate,
          outfit: null,
        };
      }

      var row = dailyResult.rows[0];
      var items = (await fetchOutfitItems(client, req.user.userId, row.outfit_id)).map(rowToItem);
      return dailyResponse(row, row, items, [], [], true);
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/', authenticate, async function(req, res, next) {
  try {
    var payload = validateConfirmPayload(req.body);

    var result = await withTransaction(async function(client) {
      await client.query('SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE', [req.user.userId]);
      await assertOwnedReference(client, 'weather_snapshots', 'weather_snapshot_id', payload.weatherSnapshotId, req.user.userId, 'Weather snapshot');
      await assertOwnedReference(client, 'calendar_events', 'event_id', payload.calendarEventId, req.user.userId, 'Calendar event');

      var itemRows;
      var outfit;
      if (payload.outfitId) {
        outfit = await fetchOutfit(client, req.user.userId, payload.outfitId);
        itemRows = await fetchOutfitItems(client, req.user.userId, payload.outfitId);
        if (!itemRows.length) {
          throw publicError('Outfit này chưa có món đồ nào để xác nhận.', 409, 'OUTFIT_EMPTY');
        }
      } else {
        itemRows = await fetchWardrobeItems(client, req.user.userId, payload.itemIds);
        outfit = await createOutfit(client, req.user.userId, payload, itemRows);
      }

      var newItemIds = itemRows.map(function(row) { return Number(row.item_id); });
      var existingResult = await client.query(
        `SELECT daily_outfit_id, outfit_id
         FROM daily_outfits
         WHERE user_id = $1
           AND worn_date = $2
         FOR UPDATE`,
        [req.user.userId, payload.wornDate]
      );
      var existing = existingResult.rows[0] || null;
      var previousItemIds = existing ? await outfitItemIds(client, existing.outfit_id) : [];
      var changes = diffIds(newItemIds, previousItemIds);

      var dailyResult = await client.query(
        `INSERT INTO daily_outfits (
           user_id, outfit_id, worn_date, confirmed_at, weather_snapshot_id,
           calendar_event_id, notes, created_at, updated_at
         ) VALUES (
           $1, $2, $3, NOW(), $4, $5, $6, NOW(), NOW()
         )
         ON CONFLICT (user_id, worn_date)
         DO UPDATE SET
           outfit_id = EXCLUDED.outfit_id,
           confirmed_at = NOW(),
           weather_snapshot_id = EXCLUDED.weather_snapshot_id,
           calendar_event_id = EXCLUDED.calendar_event_id,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [
          req.user.userId,
          outfit.outfit_id,
          payload.wornDate,
          payload.weatherSnapshotId,
          payload.calendarEventId,
          payload.notes,
        ]
      );

      await updateWearCounts(client, req.user.userId, changes.added, changes.removed);
      var responseItems = await fetchOutfitItems(client, req.user.userId, outfit.outfit_id);

      return {
        created: !existing,
        body: dailyResponse(
          dailyResult.rows[0],
          outfit,
          responseItems.map(rowToItem),
          changes.added,
          changes.removed,
          true
        ),
      };
    });

    return res.status(result.created ? 201 : 200).json(result.body);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
