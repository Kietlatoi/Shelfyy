/* eslint-disable no-var */
var MODEL_NAME = 'rule-based-v1';
var SLOT_ORDER = ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'BAG', 'ACCESSORY', 'OTHER'];
var LIGHT_MATERIALS = ['cotton', 'linen', 'viscose', 'rayon', 'modal', 'silk', 'lụa', 'lanh'];
var HEAVY_MATERIALS = ['wool', 'len', 'fleece', 'leather', 'da', 'denim', 'nỉ'];
var NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'navy', 'brown', 'đen', 'trắng', 'xám', 'kem', 'nâu'];
var LIGHT_COLORS = ['white', 'cream', 'beige', 'pastel', 'trắng', 'kem', 'be', 'xanh nhạt'];

function normalizeText(value, maxLength) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, maxLength || 500);
}

function itemText(item) {
  return [
    item.name,
    item.brand,
    item.category,
    item.color,
    item.season,
    item.pattern,
    item.material,
    item.tags,
    item.size,
  ].filter(Boolean).join(' ').toLowerCase();
}

function includesAny(text, words) {
  var raw = String(text || '').toLowerCase();
  return words.some(function(word) {
    return raw.indexOf(word.toLowerCase()) !== -1;
  });
}

function addScore(state, value, reason) {
  state.score += value;
  if (reason) state.reasons.push(reason);
}

function weatherTraits(weather) {
  var temp = weather && weather.feelsLike != null ? Number(weather.feelsLike) : Number(weather && weather.temperature);
  if (!Number.isFinite(temp)) temp = null;
  var code = Number(weather && weather.weatherCode);
  var precipitation = Number(weather && weather.precipitation || 0) + Number(weather && weather.rain || 0);

  return {
    hasWeather: Boolean(weather),
    temp: temp,
    hot: temp != null && temp >= 30,
    warm: temp != null && temp >= 26 && temp < 30,
    cool: temp != null && temp <= 21,
    cold: temp != null && temp <= 18,
    humid: Number(weather && weather.humidity || 0) >= 75,
    rainy: precipitation > 0 || (Number.isFinite(code) && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95)),
    windy: Number(weather && weather.windSpeed || 0) >= 22,
  };
}

function categoryOf(item) {
  var category = String(item.category || 'OTHER').toUpperCase();
  return SLOT_ORDER.includes(category) ? category : 'OTHER';
}

function seasonMatchesHot(text) {
  return includesAny(text, ['xuân', 'hè', 'summer', 'bốn mùa']);
}

function scoreItem(item, context) {
  var weather = weatherTraits(context.weather);
  var recentIds = new Set((context.recentItemIds || []).map(String));
  var previousSuggestionIds = new Set((context.previousSuggestionItemIds || []).map(String));
  var text = itemText(item);
  var category = categoryOf(item);
  var state = { item: item, category: category, score: 50, reasons: [] };

  if (item.favorite) addScore(state, 8, 'món yêu thích');
  if (item.itemStatus === 'IN_USE') addScore(state, 6, 'đang dùng thường xuyên');
  if (item.itemStatus === 'RARELY_USED') addScore(state, 3, 'giúp xoay vòng món ít dùng');
  if (item.itemStatus === 'STORED') addScore(state, -12, 'đang cất nên giảm ưu tiên');

  var wearCount = Number(item.wearCount || 0);
  if (wearCount <= 1) addScore(state, 5, 'ít bị mặc lặp');
  if (wearCount >= 5) addScore(state, -4, 'đã mặc khá nhiều');
  if (wearCount >= 10) addScore(state, -4, 'nên giảm lặp lại');
  if (recentIds.has(String(item.id))) addScore(state, -10, 'đã xuất hiện gần đây');
  if (previousSuggestionIds.has(String(item.id))) addScore(state, -28, 'đã nằm trong gợi ý gần nhất');

  if (weather.hot || weather.warm) {
    if (includesAny(text, LIGHT_MATERIALS)) addScore(state, 14, 'chất liệu thoáng cho thời tiết nóng');
    if (seasonMatchesHot(text)) addScore(state, 7, 'hợp mùa nóng');
    if (includesAny(text, LIGHT_COLORS)) addScore(state, 4, 'màu sáng dễ chịu dưới nắng');
    if (includesAny(text, HEAVY_MATERIALS) && category !== 'SHOES' && category !== 'BAG') {
      addScore(state, -8, 'chất liệu hơi dày cho ngày nóng');
    }
    if (category === 'OUTERWEAR') addScore(state, -18, 'áo khoác không cần thiết khi nóng');
  }

  if (weather.humid) {
    if (includesAny(text, LIGHT_MATERIALS)) addScore(state, 8, 'thoáng khi độ ẩm cao');
    if (includesAny(text, HEAVY_MATERIALS) && category !== 'BAG') addScore(state, -5, 'dễ bí khi độ ẩm cao');
  }

  if (weather.rainy) {
    if (category === 'OUTERWEAR') addScore(state, 12, 'hữu ích khi có mưa');
    if (category === 'SHOES' && includesAny(text, ['leather', 'da', 'boot', 'boots', 'kín'])) {
      addScore(state, 8, 'giày kín hợp khi có mưa');
    }
    if (category === 'SHOES' && includesAny(text, ['trắng', 'white', 'canvas', 'vải'])) {
      addScore(state, -5, 'dễ bẩn khi trời mưa');
    }
  }

  if (weather.cool || weather.cold) {
    if (category === 'OUTERWEAR') addScore(state, 18, 'giữ ấm khi trời mát/lạnh');
    if (includesAny(text, HEAVY_MATERIALS)) addScore(state, 6, 'chất liệu ấm hơn');
    if (includesAny(text, LIGHT_MATERIALS) && category !== 'TOP') addScore(state, -3, 'hơi mỏng khi trời mát');
  }

  if (includesAny(text, NEUTRAL_COLORS)) addScore(state, 4, 'màu trung tính dễ phối');

  return state;
}

function bestByCategory(scoredItems, category) {
  return scoredItems
    .filter(function(entry) { return entry.category === category; })
    .sort(function(a, b) { return b.score - a.score; })[0] || null;
}

function uniqueEntries(entries) {
  var seen = new Set();
  return entries.filter(function(entry) {
    if (!entry || seen.has(String(entry.item.id))) return false;
    seen.add(String(entry.item.id));
    return true;
  });
}

function shouldUseOuterwear(weather) {
  return weather.cold || weather.cool || weather.rainy;
}

function buildLook(scoredItems, context, type) {
  var weather = weatherTraits(context.weather);
  var entries = [];
  var requiredScore = 0;

  if (type === 'dress') {
    var dress = bestByCategory(scoredItems, 'DRESS');
    if (!dress) return null;
    entries.push(dress);
    requiredScore += dress.score;
  } else {
    var top = bestByCategory(scoredItems, 'TOP');
    var bottom = bestByCategory(scoredItems, 'BOTTOM');
    if (!top || !bottom) return null;
    entries.push(top, bottom);
    requiredScore += top.score + bottom.score;
  }

  var shoes = bestByCategory(scoredItems, 'SHOES');
  var bag = bestByCategory(scoredItems, 'BAG');
  var accessory = bestByCategory(scoredItems, 'ACCESSORY');
  var outerwear = bestByCategory(scoredItems, 'OUTERWEAR');

  if (shouldUseOuterwear(weather) && outerwear) entries.push(outerwear);
  if (shoes) entries.push(shoes);
  if (bag && bag.score >= 54) entries.push(bag);
  if (accessory && accessory.score >= 54) entries.push(accessory);

  entries = uniqueEntries(entries);
  return {
    type: type,
    score: entries.reduce(function(total, entry) { return total + entry.score; }, 0) + requiredScore,
    entries: entries,
  };
}

function fallbackLook(scoredItems) {
  var entries = scoredItems
    .slice()
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5);

  return {
    type: 'fallback',
    score: entries.reduce(function(total, entry) { return total + entry.score; }, 0),
    entries: entries,
  };
}

function chooseLook(scoredItems, context) {
  var candidates = [
    buildLook(scoredItems, context, 'separates'),
    buildLook(scoredItems, context, 'dress'),
  ].filter(Boolean);

  if (!candidates.length) return fallbackLook(scoredItems);
  return candidates.sort(function(a, b) { return b.score - a.score; })[0];
}

function weatherReason(weather) {
  if (!weather) return 'Chưa có snapshot thời tiết, nên ưu tiên các món dễ mặc và an toàn.';
  var traits = weatherTraits(weather);
  var parts = [];
  if (weather.location) parts.push('thời tiết tại ' + weather.location);
  if (traits.temp != null) parts.push('cảm giác khoảng ' + Math.round(traits.temp) + '°C');
  if (traits.humid) parts.push('độ ẩm cao');
  if (traits.rainy) parts.push('có khả năng mưa');
  if (traits.windy) parts.push('gió khá mạnh');
  if (!parts.length) return 'Dựa trên snapshot thời tiết mới nhất.';
  return 'Dựa trên ' + parts.join(', ') + '.';
}

function titleFor(context, look) {
  var weather = weatherTraits(context.weather);
  if (weather.rainy) return 'Linh hoạt cho ngày có mưa';
  if (weather.hot || weather.warm) return 'Mát nhẹ cho ngày nóng';
  if (look.type === 'dress') return 'Tối giản với đầm liền';
  return 'Outfit cân bằng cho hôm nay';
}

function confidenceFor(context, look) {
  var weather = weatherTraits(context.weather);
  var confidence = 0.56;
  confidence += Math.min(look.entries.length, 5) * 0.055;
  if (weather.hasWeather) confidence += 0.08;
  if (look.type === 'dress' || look.entries.some(function(entry) { return entry.category === 'TOP'; })) confidence += 0.04;
  if (look.entries.some(function(entry) { return entry.category === 'SHOES'; })) confidence += 0.04;
  return Math.min(0.94, Number(confidence.toFixed(3)));
}

function tipsFor(context) {
  var weather = weatherTraits(context.weather);
  var tips = [];

  if (weather.hot || weather.humid) tips.push('Ưu tiên mặc thoáng, hạn chế layer dày nếu phải di chuyển nhiều.');
  if (weather.rainy) tips.push('Nên chuẩn bị thêm ô hoặc áo khoác nhẹ chống mưa.');
  if (!tips.length) tips.push('Có thể đổi phụ kiện nếu muốn outfit nổi bật hơn.');

  return tips.slice(0, 4);
}

function itemSelectionReason(entry) {
  var reasons = entry.reasons.filter(function(reason) {
    return !includesAny(reason, ['giảm', 'không cần', 'hơi', 'dễ bí', 'dễ bẩn', 'kém', 'đã xuất hiện', 'đã mặc khá nhiều', 'gợi ý gần nhất']);
  }).slice(0, 3);
  if (!reasons.length) reasons.push('điểm phối đồ tổng thể ổn');
  return normalizeText(entry.item.name, 80) + ' được chọn vì ' + reasons.join(', ') + '.';
}

function normalizeSuggestion(context, look) {
  var selected = look.entries.slice().sort(function(a, b) {
    return SLOT_ORDER.indexOf(a.category) - SLOT_ORDER.indexOf(b.category);
  });
  var categoryNames = selected.map(function(entry) { return entry.category; }).join(', ');
  return {
    title: titleFor(context, look),
    occasion: 'Hôm nay',
    summary: 'Set đồ được chọn bằng luật phối dựa trên thời tiết và dữ liệu tủ đồ hiện tại.',
    reason: weatherReason(context.weather) + ' ' +
      'Hệ thống cũng giảm điểm các món đã mặc gần đây và ưu tiên món đang dùng/yêu thích. Nhóm item đã chọn: ' + categoryNames + '.',
    confidence: confidenceFor(context, look),
    tips: tipsFor(context),
    items: selected.map(function(entry) {
      return {
        itemId: String(entry.item.id),
        slotName: entry.category,
        reason: itemSelectionReason(entry),
      };
    }),
  };
}

function generateStylingSuggestion(context) {
  var items = (context.wardrobeItems || []).filter(function(item) {
    return item && item.id && item.itemStatus !== 'TO_SELL';
  });

  if (!items.length) {
    var error = new Error('Tủ đồ chưa có món hợp lệ để tạo gợi ý.');
    error.status = 409;
    error.code = 'WARDROBE_CONTEXT_EMPTY';
    error.publicMessage = error.message;
    throw error;
  }

  var scoredItems = items.map(function(item) {
    return scoreItem(item, context);
  });
  var look = chooseLook(scoredItems, context);
  var suggestion = normalizeSuggestion(context, look);

  return {
    modelName: MODEL_NAME,
    suggestion: suggestion,
    rawResponse: {
      engine: MODEL_NAME,
      selectedItemIds: suggestion.items.map(function(item) { return item.itemId; }),
      scores: look.entries.map(function(entry) {
        return {
          itemId: String(entry.item.id),
          category: entry.category,
          score: Number(entry.score.toFixed(2)),
          reasons: entry.reasons.slice(0, 6),
        };
      }),
    },
  };
}

function isConfigured() {
  return true;
}

function getConfig() {
  return {
    model: MODEL_NAME,
  };
}

export { generateStylingSuggestion, getConfig, isConfigured };
