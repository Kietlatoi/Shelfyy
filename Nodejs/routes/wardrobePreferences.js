var express = require('express');
var { authenticate } = require('../middleware/auth');
var { query, withTransaction } = require('../db');

var router = express.Router();
var VALID_STATUSES = ['IN_USE', 'RARELY_USED', 'STORED', 'TO_SELL'];
var MAX_ITEM_IDS = 100;

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 400;
  error.code = code || 'REQUEST_ERROR';
  error.publicMessage = message;
  return error;
}

function positiveBigInt(value, fieldName) {
  var numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw publicError(fieldName + ' không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return numeric;
}

function normalizeItemIds(value) {
  if (value === undefined || value === null || value === '') return [];

  var rawList = Array.isArray(value) ? value : String(value).split(',');
  var ids = [];
  var seen = new Set();

  for (var i = 0; i < rawList.length; i += 1) {
    var raw = String(rawList[i] || '').trim();
    if (!raw) continue;
    var id = positiveBigInt(raw, 'itemId');
    if (!seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }

  if (ids.length > MAX_ITEM_IDS) {
    throw publicError('Chỉ được đọc tối đa ' + MAX_ITEM_IDS + ' món đồ mỗi lần.', 422, 'VALIDATION_ERROR');
  }

  return ids;
}

function normalizeStatus(value) {
  if (value === undefined || value === null || value === '') return null;
  var status = String(value).trim().toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    throw publicError('Trạng thái món đồ không hợp lệ.', 422, 'VALIDATION_ERROR');
  }
  return status;
}

function normalizeBoolean(value, fieldName) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw publicError(fieldName + ' phải là boolean.', 422, 'VALIDATION_ERROR');
}

function preferenceResponse(row) {
  return {
    itemId: Number(row.item_id),
    favorite: Boolean(row.is_favorite),
    status: row.item_status || 'IN_USE',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function assertOwnedWardrobeItem(client, userId, itemId) {
  var result = await client.query(
    `SELECT item_id, COALESCE(is_favorite, false) AS is_favorite
     FROM wardrobe_items
     WHERE item_id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [itemId, userId]
  );

  if (result.rowCount === 0) {
    throw publicError('Món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.', 404, 'WARDROBE_ITEM_NOT_FOUND');
  }

  return result.rows[0];
}

router.get('/preferences', authenticate, async function(req, res, next) {
  try {
    var itemIds = normalizeItemIds(req.query.itemIds);
    if (!itemIds.length) {
      return res.json({ items: [] });
    }

    var result = await query(
      `SELECT wi.item_id,
              COALESCE(wip.is_favorite, wi.is_favorite, false) AS is_favorite,
              COALESCE(wip.item_status, 'IN_USE') AS item_status,
              wip.created_at,
              wip.updated_at
       FROM wardrobe_items wi
       LEFT JOIN wardrobe_item_preferences wip
         ON wip.item_id = wi.item_id
        AND wip.user_id = wi.user_id
       WHERE wi.user_id = $1
         AND wi.deleted_at IS NULL
         AND wi.item_id = ANY($2::bigint[])
       ORDER BY array_position($2::bigint[], wi.item_id)`,
      [req.user.userId, itemIds]
    );

    return res.json({ items: result.rows.map(preferenceResponse) });
  } catch (err) {
    return next(err);
  }
});

router.put('/items/:id/preferences', authenticate, async function(req, res, next) {
  try {
    var itemId = positiveBigInt(req.params.id, 'itemId');
    var favorite = normalizeBoolean(req.body && req.body.favorite, 'favorite');
    var status = normalizeStatus(req.body && req.body.status);

    if (favorite === null && status === null) {
      throw publicError('Cần gửi favorite hoặc status để cập nhật.', 422, 'VALIDATION_ERROR');
    }

    var result = await withTransaction(async function(client) {
      var item = await assertOwnedWardrobeItem(client, req.user.userId, itemId);
      var nextFavorite = favorite === null ? Boolean(item.is_favorite) : favorite;
      var nextStatus = status || 'IN_USE';

      var existingResult = await client.query(
        `SELECT is_favorite, item_status
         FROM wardrobe_item_preferences
         WHERE user_id = $1
           AND item_id = $2
         FOR UPDATE`,
        [req.user.userId, itemId]
      );

      if (existingResult.rowCount) {
        var existing = existingResult.rows[0];
        if (favorite === null) nextFavorite = Boolean(existing.is_favorite);
        if (!status) nextStatus = existing.item_status || 'IN_USE';
      }

      var preferenceResult = await client.query(
        `INSERT INTO wardrobe_item_preferences (
           user_id, item_id, is_favorite, item_status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id, item_id)
         DO UPDATE SET
           is_favorite = EXCLUDED.is_favorite,
           item_status = EXCLUDED.item_status,
           updated_at = NOW()
         RETURNING item_id, is_favorite, item_status, created_at, updated_at`,
        [req.user.userId, itemId, nextFavorite, nextStatus]
      );

      return preferenceResponse(preferenceResult.rows[0]);
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
