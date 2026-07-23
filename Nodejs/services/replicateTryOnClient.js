var DEFAULT_API_BASE_URL = 'https://api.replicate.com/v1';
var DEFAULT_MODEL_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
var DEFAULT_TIMEOUT_MS = 20000;
var Replicate = require('replicate');

function publicError(message, status, code) {
  var error = new Error(message);
  error.status = status || 500;
  error.code = code || 'TRY_ON_PROVIDER_ERROR';
  error.publicMessage = message;
  return error;
}

function config() {
  return {
    apiToken: process.env.REPLICATE_API_TOKEN || '',
    apiBaseUrl: String(process.env.REPLICATE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, ''),
    modelVersion: process.env.REPLICATE_IDM_VTON_VERSION || process.env.REPLICATE_MODEL_VERSION || DEFAULT_MODEL_VERSION,
    timeoutMs: Number(process.env.REPLICATE_TIMEOUT_MS || process.env.TRY_ON_REPLICATE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    steps: Number(process.env.REPLICATE_IDM_VTON_STEPS || process.env.TRY_ON_REPLICATE_STEPS || 30),
    crop: String(process.env.REPLICATE_IDM_VTON_CROP || process.env.TRY_ON_REPLICATE_CROP || 'true').toLowerCase() !== 'false',
  };
}

function isConfigured() {
  var current = config();
  return Boolean(current.apiToken && current.modelVersion);
}

function configuredOrThrow() {
  var current = config();
  if (!current.apiToken) {
    throw publicError('Chưa cấu hình REPLICATE_API_TOKEN cho tính năng thử đồ.', 503, 'TRY_ON_PROVIDER_NOT_CONFIGURED');
  }
  if (!current.modelVersion) {
    throw publicError('Chưa cấu hình Replicate model version cho tính năng thử đồ.', 503, 'TRY_ON_PROVIDER_NOT_CONFIGURED');
  }
  return current;
}

function withTimeout(ms) {
  var controller = new AbortController();
  var timer = setTimeout(function() {
    controller.abort();
  }, Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_TIMEOUT_MS);

  return {
    signal: controller.signal,
    clear: function() { clearTimeout(timer); },
  };
}

function replicateClient(current) {
  return new Replicate({
    auth: current.apiToken,
    baseUrl: current.apiBaseUrl,
    fileEncodingStrategy: 'upload',
  });
}

async function requestJson(url, options) {
  var current = configuredOrThrow();
  var timeout = withTimeout(current.timeoutMs);
  try {
    var response = await fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign({
        Authorization: 'Bearer ' + current.apiToken,
        'Content-Type': 'application/json',
      }, options.headers || {}),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: timeout.signal,
    });

    var text = await response.text();
    var data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { error: text };
      }
    }

    if (!response.ok) {
      var message = data && (data.detail || data.error || data.message);
      throw publicError(
        message ? 'Replicate từ chối request: ' + String(message) : 'Replicate trả lỗi HTTP ' + response.status + '.',
        response.status >= 500 ? 502 : 400,
        'TRY_ON_PROVIDER_ERROR'
      );
    }

    return data || {};
  } catch (err) {
    if (err.name === 'AbortError') {
      throw publicError('Replicate phản hồi quá lâu. Vui lòng thử lại sau.', 504, 'TRY_ON_PROVIDER_TIMEOUT');
    }
    if (err.status) throw err;
    throw publicError('Không gọi được Replicate: ' + (err.message || 'Unknown error'), 502, 'TRY_ON_PROVIDER_ERROR');
  } finally {
    timeout.clear();
  }
}

function createPredictionInput(payload) {
  var current = config();
  return {
    garm_img: payload.garmentImageUrl,
    human_img: payload.personImageUrl,
    garment_des: payload.garmentDescription || 'clothing item',
    category: payload.category || 'upper_body',
    crop: current.crop,
    force_dc: payload.category === 'dresses',
    mask_only: false,
    steps: Number.isInteger(current.steps) && current.steps > 0 ? Math.min(current.steps, 40) : 30,
  };
}

async function createPrediction(payload) {
  var current = configuredOrThrow();
  var timeout = withTimeout(current.timeoutMs);
  try {
    return replicateClient(current).predictions.create({
      version: current.modelVersion,
      input: createPredictionInput(payload),
      signal: timeout.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw publicError('Replicate phản hồi quá lâu. Vui lòng thử lại sau.', 504, 'TRY_ON_PROVIDER_TIMEOUT');
    }
    if (err.status) throw err;
    var status = err.response && err.response.status;
    var message = err.detail || err.message || 'Unknown error';
    throw publicError(
      status ? 'Replicate từ chối request: ' + message : 'Không gọi được Replicate: ' + message,
      status && status < 500 ? 400 : 502,
      'TRY_ON_PROVIDER_ERROR'
    );
  } finally {
    timeout.clear();
  }
}

async function getPrediction(predictionId) {
  var current = configuredOrThrow();
  return requestJson(current.apiBaseUrl + '/predictions/' + encodeURIComponent(predictionId), {
    method: 'GET',
  });
}

function extractOutputUrl(prediction) {
  var output = prediction && prediction.output;
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    for (var i = 0; i < output.length; i += 1) {
      if (typeof output[i] === 'string') return output[i];
    }
  }
  if (typeof output === 'object') {
    var keys = Object.keys(output);
    for (var j = 0; j < keys.length; j += 1) {
      if (typeof output[keys[j]] === 'string') return output[keys[j]];
    }
  }
  return null;
}

module.exports = {
  createPrediction: createPrediction,
  extractOutputUrl: extractOutputUrl,
  getConfig: config,
  getPrediction: getPrediction,
  isConfigured: isConfigured,
};
