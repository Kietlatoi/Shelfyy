var express = require('express');
var { authenticate } = require('../middleware/auth');
var { query, withTransaction } = require('../db');
var replicateTryOn = require('../services/replicateTryOnClient');

var router = express.Router();
var SUPPORTED_MAIN_CATEGORIES = ['DRESS', 'OUTERWEAR', 'TOP', 'BOTTOM'];
var URL_MAX_LENGTH = 1000;
var MAX_PERSON_IMAGE_BYTES = Number(process.env.TRY_ON_MAX_PERSON_IMAGE_BYTES || 10 * 1024 * 1024);
var SUPPORTED_PERSON_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

function normalizeBoolean(value, fieldName) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    var text = value.trim().toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
  }
  throw publicError(fieldName + ' phải là boolean.', 422, 'VALIDATION_ERROR');
}

function normalizeUrl(value, fieldName) {
  var text = String(value || '').trim();
  if (!text) {
    throw publicError(fieldName + ' không được để trống.', 422, 'VALIDATION_ERROR');
  }
  if (text.length > URL_MAX_LENGTH) {
    throw publicError(fieldName + ' tối đa ' + URL_MAX_LENGTH + ' ký tự.', 422, 'VALIDATION_ERROR');
  }

  var parsed;
  try {
    parsed = new URL(text);
  } catch (err) {
    throw publicError(fieldName + ' phải là URL hợp lệ.', 422, 'VALIDATION_ERROR');
  }

  if (parsed.protocol !== 'https:') {
    throw publicError(fieldName + ' phải là URL HTTPS công khai để Replicate đọc được.', 422, 'VALIDATION_ERROR');
  }

  var hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    throw publicError(fieldName + ' không được trỏ về máy local.', 422, 'VALIDATION_ERROR');
  }

  return text;
}

function normalizeDataUrl(value, fieldName) {
  var text = String(value || '').trim();
  if (!text) {
    throw publicError(fieldName + ' không được để trống.', 422, 'VALIDATION_ERROR');
  }

  var match = text.match(/^data:(image\/(?:jpe?g|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    throw publicError(fieldName + ' phải là ảnh JPG, PNG hoặc WEBP dạng base64 data URL.', 422, 'VALIDATION_ERROR');
  }

  var mimeType = match[1].toLowerCase();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!SUPPORTED_PERSON_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw publicError('Định dạng ảnh người dùng chưa được hỗ trợ.', 422, 'VALIDATION_ERROR');
  }

  var base64 = match[2].replace(/\s/g, '');
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw publicError(fieldName + ' không phải dữ liệu base64 hợp lệ.', 422, 'VALIDATION_ERROR');
  }

  var padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  var sizeBytes = Math.floor((base64.length * 3) / 4) - padding;
  if (sizeBytes <= 0) {
    throw publicError(fieldName + ' không có dữ liệu ảnh.', 422, 'VALIDATION_ERROR');
  }
  if (sizeBytes > MAX_PERSON_IMAGE_BYTES) {
    throw publicError('Ảnh người dùng tối đa ' + Math.round(MAX_PERSON_IMAGE_BYTES / 1024 / 1024) + 'MB.', 413, 'TRY_ON_IMAGE_TOO_LARGE');
  }

  var imageBuffer = Buffer.from(base64, 'base64');
  var imageBlob = new Blob([imageBuffer], { type: mimeType });
  return {
    replicateInput: imageBlob,
    mimeType: mimeType,
    sizeBytes: sizeBytes,
  };
}

function normalizePersonImageInput(body, userId) {
  var hasUrl = Boolean(body && String(body.personImageUrl || '').trim());
  var hasDataUrl = Boolean(body && String(body.personImageDataUrl || '').trim());

  if (hasUrl && hasDataUrl) {
    throw publicError('Chỉ được gửi một trong hai trường personImageUrl hoặc personImageDataUrl.', 422, 'VALIDATION_ERROR');
  }
  if (!hasUrl && !hasDataUrl) {
    throw publicError('Cần gửi personImageDataUrl hoặc personImageUrl để thử đồ.', 422, 'VALIDATION_ERROR');
  }

  if (hasDataUrl) {
    var dataUrl = normalizeDataUrl(body.personImageDataUrl, 'personImageDataUrl');
    var objectKey = 'tryon-input-user-' + userId + '-' + Date.now();
    return {
      replicateInput: dataUrl.replicateInput,
      storedFileUrl: 'inline-tryon-input://user/' + userId + '/' + objectKey,
      objectKey: objectKey,
      mimeType: dataUrl.mimeType,
    };
  }

  var personImageUrl = normalizeUrl(body.personImageUrl, 'personImageUrl');
  return {
    replicateInput: personImageUrl,
    storedFileUrl: personImageUrl,
    objectKey: 'tryon-input-user-' + userId + '-' + Date.now(),
    mimeType: imageMimeFromUrl(personImageUrl),
  };
}

function itemImageUrl(row) {
  return row.background_removed_url || row.image_url || row.thumbnail_url || row.source_url || null;
}

function mapCategoryForReplicate(category) {
  var value = String(category || '').toUpperCase();
  if (value === 'BOTTOM') return 'lower_body';
  if (value === 'DRESS') return 'dresses';
  return 'upper_body';
}

function statusForApi(status) {
  return status === 'COMPLETED' ? 'DONE' : status;
}

function truncate(value, maxLength) {
  var text = String(value || '');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function imageMimeFromUrl(url) {
  var pathname = '';
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch (err) {
    return 'image/jpeg';
  }
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function itemResponse(row) {
  if (!row) return null;
  return {
    id: Number(row.item_id),
    name: row.item_name,
    brand: row.brand,
    category: row.category,
    color: row.color,
    imageUrl: itemImageUrl(row),
  };
}

function sessionResponse(row) {
  return {
    jobId: Number(row.try_on_id),
    predictionId: row.prediction_id || null,
    status: statusForApi(row.status),
    resultImageUrl: row.result_file_url || null,
    processingTimeMs: row.processing_time_seconds == null
      ? null
      : Math.round(Number(row.processing_time_seconds) * 1000),
    accuracy: row.accuracy_score == null ? null : Number(row.accuracy_score).toFixed(1) + '%',
    errorMessage: row.error_message || null,
    isSaved: Boolean(row.is_saved),
    savedAt: row.saved_at || null,
    createdAt: row.created_at,
    completedAt: row.completed_at || null,
    clothingItem: itemResponse(row),
  };
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

function normalizePageParams(queryParams) {
  var page = Number(queryParams && queryParams.page !== undefined ? queryParams.page : 0);
  var size = Number(queryParams && queryParams.size !== undefined ? queryParams.size : 10);
  if (!Number.isInteger(page) || page < 0) {
    throw publicError('page phải là số nguyên không âm.', 422, 'VALIDATION_ERROR');
  }
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    throw publicError('size phải nằm trong khoảng 1 đến 50.', 422, 'VALIDATION_ERROR');
  }
  return { page: page, size: size };
}

function normalizeSavedFilter(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === false) return value;
  var text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  throw publicError('saved phải là true hoặc false.', 422, 'VALIDATION_ERROR');
}

async function fetchOwnedItem(client, userId, clothingItemId) {
  var result = await client.query(
    `SELECT wi.item_id,
            wi.item_name,
            wi.brand,
            wi.category,
            wi.color,
            wi.thumbnail_url,
            wi.background_removed_url,
            wi.source_url,
            fa.file_url AS image_url
     FROM wardrobe_items wi
     LEFT JOIN file_assets fa ON fa.file_id = wi.image_file_id AND fa.deleted_at IS NULL
     WHERE wi.item_id = $1
       AND wi.user_id = $2
       AND wi.deleted_at IS NULL
     LIMIT 1`,
    [clothingItemId, userId]
  );

  if (result.rowCount === 0) {
    throw publicError('Món đồ không tồn tại hoặc không thuộc tủ đồ của bạn.', 404, 'WARDROBE_ITEM_NOT_FOUND');
  }

  var item = result.rows[0];
  if (!SUPPORTED_MAIN_CATEGORIES.includes(String(item.category || '').toUpperCase())) {
    throw publicError('Món này chưa phù hợp để thử AI. Hãy chọn áo, áo khoác, quần hoặc váy.', 422, 'TRY_ON_CATEGORY_UNSUPPORTED');
  }

  var garmentUrl = itemImageUrl(item);
  if (!garmentUrl) {
    throw publicError('Món đồ này chưa có ảnh để thử AI.', 422, 'TRY_ON_ITEM_IMAGE_MISSING');
  }
  normalizeUrl(garmentUrl, 'Ảnh món đồ');
  return item;
}

async function enforceTryOnLimit(client, userId) {
  var userResult = await client.query(
    'SELECT plan, try_on_limit FROM users WHERE user_id = $1 FOR UPDATE',
    [userId]
  );
  var user = userResult.rows[0];
  var plan = String(user && user.plan || 'FREE').toUpperCase();
  var limit = Number(user && user.try_on_limit);
  if (!Number.isFinite(limit) || limit <= 0) return;

  var rangeSql = plan === 'FREE'
    ? 'created_at >= CURRENT_DATE'
    : "created_at >= date_trunc('month', CURRENT_DATE)::timestamp";
  var countResult = await client.query(
    `SELECT COUNT(*)::int AS used
     FROM node_try_on_sessions
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND ${rangeSql}`,
    [userId]
  );
  var used = Number(countResult.rows[0] && countResult.rows[0].used || 0);
  if (used >= limit) {
    throw publicError('Bạn đã hết lượt thử đồ trong kỳ hiện tại.', 429, 'TRY_ON_LIMIT_EXCEEDED');
  }
}

async function insertFileAsset(client, userId, fileUrl, fileType, objectKey, mimeType) {
  var result = await client.query(
    `INSERT INTO file_assets (
       owner_user_id, file_url, object_key, file_type, mime_type, visibility, uploaded_at
     ) VALUES (
       $1, $2, $3, $4, $5, 'PRIVATE', NOW()
     )
     RETURNING file_id`,
    [userId, fileUrl, objectKey, fileType, mimeType || imageMimeFromUrl(fileUrl)]
  );
  return result.rows[0].file_id;
}

async function fetchSession(client, userId, jobId) {
  var result = await client.query(
    `SELECT s.*,
            result_file.file_url AS result_file_url,
            wi.item_id,
            wi.item_name,
            wi.brand,
            wi.category,
            wi.color,
            wi.thumbnail_url,
            wi.background_removed_url,
            wi.source_url,
            item_file.file_url AS image_url
     FROM node_try_on_sessions s
     LEFT JOIN file_assets result_file ON result_file.file_id = s.result_file_id
     LEFT JOIN wardrobe_items wi ON wi.item_id = s.clothing_item_id
     LEFT JOIN file_assets item_file ON item_file.file_id = wi.image_file_id AND item_file.deleted_at IS NULL
     WHERE s.try_on_id = $1
       AND s.user_id = $2
       AND s.deleted_at IS NULL
     LIMIT 1`,
    [jobId, userId]
  );

  if (result.rowCount === 0) {
    throw publicError('Try-on job không tồn tại hoặc không thuộc tài khoản hiện tại.', 404, 'TRY_ON_JOB_NOT_FOUND');
  }
  return result.rows[0];
}

function extractProviderError(prediction) {
  if (!prediction) return 'Replicate xử lý thất bại.';
  var raw = typeof prediction.error === 'string'
    ? prediction.error
    : prediction.error && prediction.error.message
      ? prediction.error.message
      : 'Replicate status: ' + (prediction.status || 'failed');
  if (/list index out of range/i.test(raw)) {
    return 'Ảnh chưa phù hợp để thử đồ. Hãy dùng ảnh toàn thân rõ dáng và chọn ảnh món đồ rõ phần trang phục.';
  }
  return raw;
}

async function applyPredictionToSession(client, userId, jobId, prediction) {
  var providerStatus = String(prediction && prediction.status || '').toLowerCase();
  var metrics = prediction && prediction.metrics || {};

  if (providerStatus === 'succeeded') {
    var outputUrl = replicateTryOn.extractOutputUrl(prediction);
    if (!outputUrl) {
      await client.query(
        `UPDATE node_try_on_sessions
         SET status = 'FAILED',
             error_message = $3
         WHERE try_on_id = $1 AND user_id = $2`,
        [jobId, userId, 'Replicate đã hoàn tất nhưng không trả ảnh kết quả.']
      );
      return fetchSession(client, userId, jobId);
    }

    normalizeUrl(outputUrl, 'Ảnh kết quả');
    var existing = await fetchSession(client, userId, jobId);
    var resultFileId = existing.result_file_id;
    if (!resultFileId) {
      resultFileId = await insertFileAsset(
        client,
        userId,
        outputUrl,
        'TRY_ON_RESULT',
        'replicate-result-' + (prediction.id || jobId)
      );
    }

    await client.query(
      `UPDATE node_try_on_sessions
       SET status = 'COMPLETED',
           result_file_id = $3,
           accuracy_score = COALESCE(accuracy_score, 98.4),
           processing_time_seconds = $4,
           completed_at = COALESCE(completed_at, NOW()),
           error_message = NULL
       WHERE try_on_id = $1 AND user_id = $2`,
      [
        jobId,
        userId,
        resultFileId,
        metrics.predict_time == null && metrics.total_time == null
          ? null
          : Number(metrics.predict_time || metrics.total_time),
      ]
    );
  } else if (providerStatus === 'failed' || providerStatus === 'canceled') {
    await client.query(
      `UPDATE node_try_on_sessions
       SET status = 'FAILED',
           error_message = $3
       WHERE try_on_id = $1 AND user_id = $2`,
      [jobId, userId, truncate(extractProviderError(prediction), 500)]
    );
  } else if (providerStatus === 'starting' || providerStatus === 'processing') {
    await client.query(
      `UPDATE node_try_on_sessions
       SET status = 'PROCESSING'
       WHERE try_on_id = $1 AND user_id = $2 AND status <> 'COMPLETED'`,
      [jobId, userId]
    );
  }

  return fetchSession(client, userId, jobId);
}

router.post('/generate', authenticate, async function(req, res, next) {
  try {
    var personImage = normalizePersonImageInput(req.body || {}, req.user.userId);
    var clothingItemId = positiveBigInt(req.body && req.body.clothingItemId, 'clothingItemId');
    if (!replicateTryOn.isConfigured()) {
      throw publicError('Chưa cấu hình REPLICATE_API_TOKEN cho tính năng thử đồ.', 503, 'TRY_ON_PROVIDER_NOT_CONFIGURED');
    }

    var prepared = await withTransaction(async function(client) {
      await enforceTryOnLimit(client, req.user.userId);
      var item = await fetchOwnedItem(client, req.user.userId, clothingItemId);
      var inputFileId = await insertFileAsset(
        client,
        req.user.userId,
        personImage.storedFileUrl,
        'TRY_ON_INPUT',
        personImage.objectKey,
        personImage.mimeType
      );
      var sessionResult = await client.query(
        `INSERT INTO node_try_on_sessions (
           user_id, clothing_item_id, input_file_id, status, created_at
         ) VALUES (
           $1, $2, $3, 'PENDING', NOW()
         )
         RETURNING try_on_id`,
        [req.user.userId, item.item_id, inputFileId]
      );

      return {
        jobId: Number(sessionResult.rows[0].try_on_id),
        item: item,
      };
    });

    var prediction;
    try {
      prediction = await replicateTryOn.createPrediction({
        personImageUrl: personImage.replicateInput,
        garmentImageUrl: itemImageUrl(prepared.item),
        garmentDescription: [prepared.item.brand, prepared.item.item_name, prepared.item.color]
          .filter(Boolean)
          .join(' '),
        category: mapCategoryForReplicate(prepared.item.category),
      });
      if (!prediction || !prediction.id) {
        throw publicError('Replicate không trả prediction id cho job thử đồ.', 502, 'TRY_ON_PROVIDER_ERROR');
      }
    } catch (err) {
      await query(
        `UPDATE node_try_on_sessions
         SET status = 'FAILED',
             error_message = $3
         WHERE try_on_id = $1 AND user_id = $2`,
        [prepared.jobId, req.user.userId, truncate(err.publicMessage || err.message, 500)]
      );
      throw err;
    }

    var updated = await withTransaction(async function(client) {
      await client.query(
        `UPDATE node_try_on_sessions
         SET prediction_id = $3,
             status = 'PROCESSING'
         WHERE try_on_id = $1 AND user_id = $2`,
        [prepared.jobId, req.user.userId, prediction.id || null]
      );
      return applyPredictionToSession(client, req.user.userId, prepared.jobId, prediction);
    });

    return res.status(201).json(sessionResponse(updated));
  } catch (err) {
    return next(err);
  }
});

router.get('/history', authenticate, async function(req, res, next) {
  try {
    var paging = normalizePageParams(req.query);
    var savedFilter = normalizeSavedFilter(req.query && req.query.saved);
    var result = await withTransaction(async function(client) {
      var whereParts = ['user_id = $1', 'deleted_at IS NULL'];
      var params = [req.user.userId];
      if (savedFilter !== null) {
        params.push(savedFilter);
        whereParts.push('is_saved = $' + params.length);
      }
      var whereSql = whereParts.join(' AND ');

      var countResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM node_try_on_sessions
         WHERE ${whereSql}`,
        params
      );

      var listParams = params.concat([paging.size, paging.page * paging.size]);
      var sessions = await client.query(
        `SELECT s.*,
                result_file.file_url AS result_file_url,
                wi.item_id,
                wi.item_name,
                wi.brand,
                wi.category,
                wi.color,
                wi.thumbnail_url,
                wi.background_removed_url,
                wi.source_url,
                item_file.file_url AS image_url
         FROM node_try_on_sessions s
         LEFT JOIN file_assets result_file ON result_file.file_id = s.result_file_id
         LEFT JOIN wardrobe_items wi ON wi.item_id = s.clothing_item_id
         LEFT JOIN file_assets item_file ON item_file.file_id = wi.image_file_id AND item_file.deleted_at IS NULL
         WHERE ${whereSql.replace('user_id', 's.user_id').replace('deleted_at', 's.deleted_at').replace('is_saved', 's.is_saved')}
         ORDER BY s.created_at DESC, s.try_on_id DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams
      );

      return pageResponse(
        sessions.rows.map(sessionResponse),
        paging.page,
        paging.size,
        Number(countResult.rows[0] && countResult.rows[0].total || 0)
      );
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:jobId/saved', authenticate, async function(req, res, next) {
  try {
    var jobId = positiveBigInt(req.params.jobId, 'jobId');
    var saved = normalizeBoolean(req.body && req.body.saved, 'saved');

    var updated = await withTransaction(async function(client) {
      var current = await fetchSession(client, req.user.userId, jobId);
      if (current.status !== 'COMPLETED' || !current.result_file_id) {
        throw publicError('Chỉ có thể lưu kết quả try-on đã hoàn tất.', 409, 'TRY_ON_RESULT_NOT_READY');
      }

      await client.query(
        `UPDATE node_try_on_sessions
         SET is_saved = $3,
             saved_at = CASE
               WHEN $3 THEN COALESCE(saved_at, NOW())
               ELSE NULL
             END
         WHERE try_on_id = $1
           AND user_id = $2
           AND deleted_at IS NULL`,
        [jobId, req.user.userId, saved]
      );

      return fetchSession(client, req.user.userId, jobId);
    });

    return res.json(sessionResponse(updated));
  } catch (err) {
    return next(err);
  }
});

router.get('/:jobId/status', authenticate, async function(req, res, next) {
  try {
    var jobId = positiveBigInt(req.params.jobId, 'jobId');
    var current = await withTransaction(function(client) {
      return fetchSession(client, req.user.userId, jobId);
    });

    if (
      current.prediction_id &&
      (current.status === 'PENDING' || current.status === 'PROCESSING') &&
      replicateTryOn.isConfigured()
    ) {
      var prediction = await replicateTryOn.getPrediction(current.prediction_id);
      current = await withTransaction(function(client) {
        return applyPredictionToSession(client, req.user.userId, jobId, prediction);
      });
    }

    return res.json(sessionResponse(current));
  } catch (err) {
    return next(err);
  }
});

router.delete('/history/:id', authenticate, async function(req, res, next) {
  try {
    var id = positiveBigInt(req.params.id, 'id');
    var result = await query(
      `UPDATE node_try_on_sessions
       SET deleted_at = NOW()
       WHERE try_on_id = $1
         AND user_id = $2
         AND deleted_at IS NULL`,
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      throw publicError('Try-on job không tồn tại hoặc không thuộc tài khoản hiện tại.', 404, 'TRY_ON_JOB_NOT_FOUND');
    }

    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
