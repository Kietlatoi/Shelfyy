const DEFAULT_MODEL_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
const DEFAULT_TIMEOUT_MILLIS = 20_000;

function createReplicateClient({ apiToken, modelVersion = DEFAULT_MODEL_VERSION, fetchImpl = fetch, timeoutMillis = DEFAULT_TIMEOUT_MILLIS }) {
  function tokenValue() {
    return typeof apiToken === 'function' ? apiToken() : apiToken;
  }

  function versionValue() {
    return typeof modelVersion === 'function' ? modelVersion() : modelVersion;
  }

  function requireConfiguration() {
    const token = tokenValue();
    const version = versionValue();
    if (typeof token !== 'string' || !token || typeof version !== 'string' || !version) {
      const error = new Error('Tính năng thử đồ hiện chưa được cấu hình.');
      error.code = 'failed-precondition';
      throw error;
    }
    return { token, version };
  }

  async function request(path, { method = 'GET', body } = {}) {
    const { token } = requireConfiguration();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMillis);
    try {
      const response = await fetchImpl(`https://api.replicate.com/v1${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(response.status === 429
          ? 'Dịch vụ thử đồ đang bận. Vui lòng thử lại sau.'
          : 'Nhà cung cấp thử đồ chưa thể xử lý yêu cầu.');
        error.code = response.status === 429 ? 'resource-exhausted' : 'unavailable';
        throw error;
      }
      return result;
    } catch (error) {
      if (error?.code) throw error;
      const mapped = new Error(error?.name === 'AbortError'
        ? 'Dịch vụ thử đồ phản hồi quá lâu.'
        : 'Không thể kết nối dịch vụ thử đồ.');
      mapped.code = error?.name === 'AbortError' ? 'deadline-exceeded' : 'unavailable';
      throw mapped;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function createPrediction({ personImageUrl, garmentImageUrl, garmentDescription, category }) {
    const { version } = requireConfiguration();
    const categoryMap = { TOP: 'upper_body', OUTERWEAR: 'upper_body', BOTTOM: 'lower_body', DRESS: 'dresses' };
    const modelCategory = categoryMap[String(category || '').toUpperCase()];
    if (!modelCategory) {
      const error = new Error('Món đồ này chưa phù hợp để thử đồ.');
      error.code = 'failed-precondition';
      throw error;
    }
    const prediction = await request('/predictions', {
      method: 'POST',
      body: {
        version,
        input: {
          garm_img: garmentImageUrl,
          human_img: personImageUrl,
          garment_des: String(garmentDescription || 'clothing item').slice(0, 200),
          category: modelCategory,
          crop: true,
          force_dc: modelCategory === 'dresses',
          mask_only: false,
          steps: 30,
        },
      },
    });
    if (typeof prediction.id !== 'string' || !prediction.id) {
      const error = new Error('Nhà cung cấp thử đồ không trả mã tiến trình.');
      error.code = 'unavailable';
      throw error;
    }
    return prediction;
  }

  function getPrediction(predictionId) {
    if (typeof predictionId !== 'string' || !predictionId || predictionId.length > 128 || predictionId.includes('/')) {
      const error = new Error('Mã tiến trình thử đồ không hợp lệ.');
      error.code = 'invalid-argument';
      throw error;
    }
    return request(`/predictions/${encodeURIComponent(predictionId)}`);
  }

  function cancelPrediction(predictionId) {
    if (typeof predictionId !== 'string' || !predictionId || predictionId.length > 128 || predictionId.includes('/')) return Promise.resolve(null);
    return request(`/predictions/${encodeURIComponent(predictionId)}/cancel`, { method: 'POST' });
  }

  return { createPrediction, getPrediction, cancelPrediction, isConfigured: () => Boolean(tokenValue() && versionValue()) };
}

module.exports = { DEFAULT_MODEL_VERSION, DEFAULT_TIMEOUT_MILLIS, createReplicateClient };
