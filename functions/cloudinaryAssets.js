const { createCloudinarySignature } = require('./cloudinarySignature');

function createCloudinaryAssets({ cloudName, apiKey, apiSecret, fetchImpl = fetch, now = Date.now }) {
  function configuration() {
    const current = {
      cloudName: typeof cloudName === 'function' ? cloudName() : cloudName,
      apiKey: typeof apiKey === 'function' ? apiKey() : apiKey,
      apiSecret: typeof apiSecret === 'function' ? apiSecret() : apiSecret,
    };
    if (!current.cloudName || !current.apiKey || !current.apiSecret
      || current.cloudName === 'demo-cloud' || current.apiKey === 'demo-api-key') {
      const error = new Error('Chưa cấu hình Cloudinary cho môi trường này.');
      error.code = 'failed-precondition';
      throw error;
    }
    return current;
  }

  async function signedPost(action, parameters) {
    const current = configuration();
    const signedParameters = { ...parameters, timestamp: Math.floor(now() / 1000) };
    const signatureParameters = Object.fromEntries(
      Object.entries(signedParameters).filter(([key]) => key !== 'file')
    );
    const body = new URLSearchParams({
      ...Object.fromEntries(Object.entries(signedParameters).map(([key, value]) => [key, String(value)])),
      api_key: current.apiKey,
      signature: createCloudinarySignature(signatureParameters, current.apiSecret),
    });
    const response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(current.cloudName)}/image/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
      const error = new Error('Cloudinary chưa thể xử lý ảnh thử đồ.');
      error.code = 'unavailable';
      throw error;
    }
    return { result, cloudName: current.cloudName };
  }

  async function uploadResultFromUrl(sourceUrl, { uid, jobId }) {
    const current = configuration();
    const folder = `${uid}/tryon-results`;
    const publicId = String(jobId);
    const uploaded = await signedPost('upload', {
      file: sourceUrl,
      folder,
      public_id: publicId,
      overwrite: true,
    });
    const expectedUrlPrefix = `https://res.cloudinary.com/${current.cloudName}/image/upload/`;
    const expectedPublicId = `${folder}/${publicId}`;
    if (typeof uploaded.result.secure_url !== 'string'
      || !uploaded.result.secure_url.startsWith(expectedUrlPrefix)
      || uploaded.result.public_id !== expectedPublicId) {
      const error = new Error('Cloudinary trả về thông tin ảnh thử đồ không hợp lệ.');
      error.code = 'data-loss';
      throw error;
    }
    return { secureUrl: uploaded.result.secure_url, publicId: uploaded.result.public_id };
  }

  function createTemporaryInputUrl({ publicId, format }) {
    const current = configuration();
    if (typeof publicId !== 'string' || !publicId || typeof format !== 'string'
      || !['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(format.toLowerCase())) {
      const error = new Error('Thông tin ảnh riêng tư không hợp lệ.');
      error.code = 'invalid-argument';
      throw error;
    }
    const timestamp = Math.floor(now() / 1000);
    const parameters = {
      expires_at: timestamp + 60 * 60,
      format: format.toLowerCase(),
      public_id: publicId,
      timestamp,
      type: 'authenticated',
    };
    const query = new URLSearchParams({
      ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
      api_key: current.apiKey,
      signature: createCloudinarySignature(parameters, current.apiSecret),
    });
    return `https://api.cloudinary.com/v1_1/${encodeURIComponent(current.cloudName)}/image/download?${query}`;
  }

  async function verifyUpload({ publicId, deliveryType = 'upload' }) {
    const current = configuration();
    if (!['upload', 'authenticated'].includes(deliveryType) || typeof publicId !== 'string' || !publicId) {
      throw Object.assign(new Error('Thông tin ảnh không hợp lệ.'), { code: 'invalid-argument' });
    }
    const response = await fetchImpl(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(current.cloudName)}/resources/image/${deliveryType}/${encodeURIComponent(publicId)}`,
      { method: 'GET', headers: { Authorization: `Basic ${Buffer.from(`${current.apiKey}:${current.apiSecret}`).toString('base64')}` }, signal: AbortSignal.timeout(20_000) }
    );
    if (!response.ok) throw Object.assign(new Error('Chưa xác minh được ảnh Cloudinary.'), { code: 'unavailable' });
    const result = await response.json();
    if (result.public_id !== publicId || result.resource_type !== 'image' || result.type !== deliveryType
      || !['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(result.format)
      || !Number.isFinite(result.bytes) || result.bytes <= 0 || result.bytes > 10 * 1024 * 1024
      || !result.secure_url?.startsWith(`https://res.cloudinary.com/${current.cloudName}/image/${deliveryType}/`)) {
      throw Object.assign(new Error('Ảnh Cloudinary không hợp lệ hoặc vượt quá 10 MB.'), { code: 'invalid-argument' });
    }
    return { secureUrl: result.secure_url, publicId, format: result.format, deliveryType,
      bytes: result.bytes, width: result.width || null, height: result.height || null };
  }

  async function deleteImage(publicId, deliveryType = publicId?.includes('/tryon-input/') ? 'authenticated' : 'upload') {
    if (typeof publicId !== 'string' || !publicId) return;
    const { result } = await signedPost('destroy', { public_id: publicId, type: deliveryType, invalidate: true });
    if (!['ok', 'not found'].includes(result.result)) {
      const error = new Error('Cloudinary chưa thể xóa ảnh thử đồ.');
      error.code = 'unavailable';
      throw error;
    }
  }

  return { uploadResultFromUrl, createTemporaryInputUrl, deleteImage, verifyUpload };
}

module.exports = { createCloudinaryAssets };
