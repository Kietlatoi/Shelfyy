var DEFAULT_MODEL = 'gemini-2.5-flash';
var DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
var ALLOWED_SLOTS = ['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER'];
var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 400;
  error.code = code || 'REQUEST_ERROR';
  error.publicMessage = message;
  return error;
}

function getConfig() {
  var apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  var includeImages = String(process.env.GEMINI_INCLUDE_ITEM_IMAGES || 'false').toLowerCase() === 'true';
  return {
    apiKey: apiKey,
    model: String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim(),
    baseUrl: String(process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 20000),
    maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 2500),
    includeImages: includeImages,
    maxInlineImages: Math.max(0, Math.min(Number(process.env.GEMINI_MAX_INLINE_IMAGES || 8), 20)),
    maxImageBytes: Math.max(100000, Number(process.env.GEMINI_MAX_IMAGE_BYTES || 2500000)),
    allowedImageHosts: String(process.env.GEMINI_IMAGE_ALLOWED_HOSTS || 'res.cloudinary.com')
      .split(',')
      .map(function(host) { return host.trim().toLowerCase(); })
      .filter(Boolean),
  };
}

function isConfigured() {
  return Boolean(getConfig().apiKey);
}

function requireConfig() {
  var config = getConfig();
  if (!config.apiKey) {
    throw publicError('AI Stylist chưa cấu hình GEMINI_API_KEY cho Nodejs service.', 503, 'GEMINI_API_KEY_MISSING');
  }
  return config;
}

function modelResourcePath(model) {
  var clean = String(model || DEFAULT_MODEL).trim();
  if (clean.startsWith('models/')) return clean;
  return 'models/' + clean;
}

function normalizeText(value, maxLength) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, maxLength || 500);
}

function categoryLabel(category) {
  var value = String(category || '').toUpperCase();
  var labels = {
    TOP: 'Áo',
    OUTERWEAR: 'Áo khoác',
    BOTTOM: 'Quần',
    DRESS: 'Váy/đầm',
    SHOES: 'Giày',
    BAG: 'Túi',
    ACCESSORY: 'Phụ kiện',
    OTHER: 'Khác',
  };
  return labels[value] || value || 'Khác';
}

function weatherSummary(weather) {
  if (!weather) return 'Chưa có snapshot thời tiết đã lưu.';
  return [
    weather.location ? 'Vị trí: ' + weather.location : null,
    weather.temperature != null ? 'Nhiệt độ: ' + weather.temperature + '°C' : null,
    weather.feelsLike != null ? 'Cảm giác như: ' + weather.feelsLike + '°C' : null,
    weather.condition ? 'Điều kiện: ' + weather.condition : null,
    weather.humidity != null ? 'Độ ẩm: ' + weather.humidity + '%' : null,
    weather.cloudCover != null ? 'Mây: ' + weather.cloudCover + '%' : null,
    weather.windSpeed != null ? 'Gió: ' + weather.windSpeed + ' km/h' : null,
  ].filter(Boolean).join('; ');
}

function eventSummary(events) {
  if (!events || !events.length) return 'Hôm nay chưa có sự kiện calendar đã lưu.';
  return events.slice(0, 8).map(function(event) {
    var time = event.time || [event.startTime, event.endTime].filter(Boolean).join('-') || 'Không rõ giờ';
    return '- ' + normalizeText(event.title, 120) + ' | ' + time +
      (event.location ? ' | ' + normalizeText(event.location, 120) : '');
  }).join('\n');
}

function itemSummary(item) {
  return [
    'id=' + item.id,
    'slot=' + String(item.category || 'OTHER').toUpperCase(),
    'nhóm=' + categoryLabel(item.category),
    'tên=' + normalizeText(item.name, 120),
    item.brand ? 'brand=' + normalizeText(item.brand, 80) : null,
    item.color ? 'màu=' + normalizeText(item.color, 60) : null,
    item.season ? 'mùa=' + normalizeText(item.season, 60) : null,
    item.material ? 'chất liệu=' + normalizeText(item.material, 80) : null,
    item.pattern ? 'họa tiết=' + normalizeText(item.pattern, 80) : null,
    item.size ? 'size=' + normalizeText(item.size, 40) : null,
    'trạng thái=' + (item.itemStatus || 'IN_USE'),
    item.favorite ? 'yêu thích=true' : 'yêu thích=false',
    'đã mặc=' + Number(item.wearCount || 0),
    item.imageUrl ? 'imageUrl=' + normalizeText(item.imageUrl, 220) : null,
  ].filter(Boolean).join('; ');
}

function buildPrompt(context) {
  var items = context.wardrobeItems || [];
  var recentIds = context.recentItemIds || [];
  return [
    'Bạn là AI stylist của Shelfy. Hãy chọn một outfit cho hôm nay từ danh sách item được phép.',
    '',
    'Luật bắt buộc:',
    '- Chỉ dùng itemId có trong danh sách wardrobe bên dưới.',
    '- Không bịa itemId, không bịa món đồ.',
    '- Ưu tiên item đang dùng, item yêu thích, ít bị mặc lặp trong 7 ngày gần nhất.',
    '- Không chọn item có trạng thái TO_SELL. Hạn chế chọn STORED nếu còn lựa chọn khác.',
    '- Phối đồ phải phù hợp thời tiết và lịch trình hôm nay.',
    '- Nếu chọn đầm/váy liền thì không bắt buộc có quần.',
    '- Trả JSON thuần, không markdown.',
    '',
    'Ngày hiện tại: ' + context.date,
    'Người dùng: ' + normalizeText(context.userName || context.userEmail || 'Shelfy user', 120),
    'Thời tiết: ' + weatherSummary(context.weather),
    'Lịch trình hôm nay:',
    eventSummary(context.events),
    'Item đã mặc gần đây: ' + (recentIds.length ? recentIds.join(', ') : 'không có'),
    '',
    'Wardrobe items được phép:',
    items.map(itemSummary).join('\n'),
    '',
    'JSON schema mong muốn:',
    '{',
    '  "title": "Tên outfit ngắn bằng tiếng Việt",',
    '  "occasion": "Dịp mặc/ngữ cảnh",',
    '  "summary": "Một câu tóm tắt outfit",',
    '  "reason": "Lý do phối đồ dựa trên thời tiết, lịch trình và tủ đồ",',
    '  "confidence": 0.85,',
    '  "tips": ["Lưu ý mặc đồ ngắn gọn"],',
    '  "items": [',
    '    { "itemId": 123, "slotName": "TOP", "reason": "Vì sao chọn item này" }',
    '  ]',
    '}',
  ].join('\n');
}

function suggestionResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      occasion: { type: 'STRING' },
      summary: { type: 'STRING' },
      reason: { type: 'STRING' },
      confidence: { type: 'NUMBER' },
      tips: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
      items: {
        type: 'ARRAY',
        minItems: 1,
        items: {
          type: 'OBJECT',
          properties: {
            itemId: { type: 'NUMBER' },
            slotName: {
              type: 'STRING',
              enum: ALLOWED_SLOTS,
            },
            reason: { type: 'STRING' },
          },
          required: ['itemId', 'slotName', 'reason'],
        },
      },
    },
    required: ['title', 'occasion', 'summary', 'reason', 'items'],
    propertyOrdering: ['title', 'occasion', 'summary', 'reason', 'confidence', 'tips', 'items'],
  };
}

function isAllowedImageUrl(value, allowedHosts) {
  if (!value) return false;
  try {
    var url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return allowedHosts.includes(url.hostname.toLowerCase());
  } catch (err) {
    return false;
  }
}

async function fetchInlineImage(item, config) {
  var imageUrl = item.imageUrl || item.thumbnailUrl || item.backgroundRemovedUrl;
  if (!isAllowedImageUrl(imageUrl, config.allowedImageHosts)) return null;

  var controller = new AbortController();
  var timer = setTimeout(function() {
    controller.abort();
  }, Math.min(config.timeoutMs, 10000));

  try {
    var response = await fetch(imageUrl, {
      headers: {
        Accept: ALLOWED_IMAGE_TYPES.join(', '),
        'User-Agent': 'Shelfy AI Stylist Service',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    var mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;

    var length = Number(response.headers.get('content-length') || 0);
    if (length && length > config.maxImageBytes) return null;

    var arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > config.maxImageBytes) return null;

    return {
      itemId: item.id,
      name: item.name,
      mimeType: mimeType,
      data: Buffer.from(arrayBuffer).toString('base64'),
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildParts(context, config) {
  var parts = [{ text: buildPrompt(context) }];
  if (!config.includeImages || !config.maxInlineImages) return parts;

  var candidates = (context.wardrobeItems || [])
    .filter(function(item) {
      return isAllowedImageUrl(item.imageUrl || item.thumbnailUrl || item.backgroundRemovedUrl, config.allowedImageHosts);
    })
    .slice(0, config.maxInlineImages);

  for (var i = 0; i < candidates.length; i += 1) {
    var image = await fetchInlineImage(candidates[i], config);
    if (image) {
      parts.push({ text: 'Ảnh tham chiếu cho itemId ' + image.itemId + ' - ' + normalizeText(image.name, 80) });
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }
  }

  return parts;
}

function stripJsonFence(text) {
  var raw = String(text || '').trim();
  if (!raw) return '';

  var fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) return fence[1].trim();
  return raw;
}

function firstBalancedJsonObject(text) {
  var raw = stripJsonFence(text);
  var start = raw.indexOf('{');
  if (start === -1) return raw;

  var depth = 0;
  var inString = false;
  var escaped = false;
  for (var i = start; i < raw.length; i += 1) {
    var char = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return raw.slice(start);
}

function parseJsonObjectFromText(text) {
  var raw = stripJsonFence(text);
  var candidates = [
    raw,
    firstBalancedJsonObject(raw),
  ].filter(Boolean);

  var lastError = null;
  for (var i = 0; i < candidates.length; i += 1) {
    try {
      var parsed = JSON.parse(candidates[i]);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new SyntaxError('Invalid JSON');
}

function normalizeGeminiSuggestion(parsed, validItemIds) {
  if (!parsed || typeof parsed !== 'object') {
    throw publicError('Gemini trả về dữ liệu gợi ý không đúng định dạng.', 502, 'GEMINI_BAD_RESPONSE');
  }

  var items = Array.isArray(parsed.items) ? parsed.items : [];
  var normalizedItems = [];
  var seen = new Set();

  for (var i = 0; i < items.length; i += 1) {
    var itemId = Number(items[i] && items[i].itemId);
    if (!Number.isInteger(itemId) || !validItemIds.has(itemId) || seen.has(itemId)) continue;
    seen.add(itemId);

    var slot = String(items[i].slotName || items[i].slot || '').toUpperCase();
    if (!ALLOWED_SLOTS.includes(slot)) slot = 'OTHER';

    normalizedItems.push({
      itemId: itemId,
      slotName: slot,
      reason: normalizeText(items[i].reason, 500),
    });
  }

  if (!normalizedItems.length) {
    throw publicError('Gemini chưa chọn được món đồ hợp lệ từ tủ đồ hiện tại.', 502, 'GEMINI_NO_VALID_ITEMS');
  }

  var confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = null;
  if (confidence != null) confidence = Math.max(0, Math.min(1, confidence));

  var tips = Array.isArray(parsed.tips)
    ? parsed.tips.map(function(tip) { return normalizeText(tip, 220); }).filter(Boolean).slice(0, 5)
    : [];

  return {
    title: normalizeText(parsed.title, 160) || 'Outfit gợi ý hôm nay',
    occasion: normalizeText(parsed.occasion, 100) || 'Hôm nay',
    summary: normalizeText(parsed.summary, 1000),
    reason: normalizeText(parsed.reason, 2000),
    confidence: confidence,
    tips: tips,
    items: normalizedItems,
  };
}

async function generateStylingSuggestion(context) {
  var config = requireConfig();
  var validItemIds = new Set((context.wardrobeItems || []).map(function(item) { return Number(item.id); }));
  if (!validItemIds.size) {
    throw publicError('Tủ đồ chưa có món hợp lệ để tạo gợi ý AI.', 409, 'WARDROBE_CONTEXT_EMPTY');
  }

  var controller = new AbortController();
  var timer = setTimeout(function() {
    controller.abort();
  }, config.timeoutMs);

  try {
    var url = config.baseUrl + '/' + modelResourcePath(config.model) + ':generateContent?key=' + encodeURIComponent(config.apiKey);
    var parts = await buildParts(context, config);
    var response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'Bạn là stylist cá nhân của Shelfy. Luôn trả lời bằng JSON hợp lệ theo schema người dùng yêu cầu.',
          }],
        },
        contents: [{
          role: 'user',
          parts: parts,
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: suggestionResponseSchema(),
          temperature: 0.35,
          maxOutputTokens: config.maxOutputTokens,
          candidateCount: 1,
        },
      }),
      signal: controller.signal,
    });

    var bodyText = await response.text();
    var body = bodyText ? JSON.parse(bodyText) : {};
    if (!response.ok) {
      var providerMessage = body.error && body.error.message ? ': ' + normalizeText(body.error.message, 180) : '';
      throw publicError('Gemini không tạo được gợi ý lúc này' + providerMessage, response.status >= 500 ? 502 : response.status, 'GEMINI_API_ERROR');
    }

    var candidate = (body.candidates || [])[0] || {};
    if (!candidate.content || !Array.isArray(candidate.content.parts)) {
      throw publicError('Gemini không trả nội dung gợi ý.', 502, 'GEMINI_EMPTY_RESPONSE');
    }
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw publicError('Gemini bị giới hạn output tokens trước khi hoàn tất JSON.', 502, 'GEMINI_OUTPUT_TRUNCATED');
    }

    var partsText = candidate.content.parts || [];
    var text = partsText.map(function(part) { return part.text || ''; }).join('\n');
    var parsed = parseJsonObjectFromText(text);
    var suggestion = normalizeGeminiSuggestion(parsed, validItemIds);

    return {
      modelName: config.model,
      suggestion: suggestion,
      rawResponse: parsed,
      inlineImagesEnabled: config.includeImages,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw publicError('Gemini phản hồi quá lâu.', 504, 'GEMINI_TIMEOUT');
    }
    if (err instanceof SyntaxError) {
      throw publicError('Gemini trả về JSON không hợp lệ.', 502, 'GEMINI_BAD_JSON');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generateStylingSuggestion: generateStylingSuggestion,
  isConfigured: isConfigured,
  getConfig: getConfig,
};
