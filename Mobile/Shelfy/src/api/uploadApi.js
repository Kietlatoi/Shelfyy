import { File, UploadType } from 'expo-file-system';
import { edgeRequest } from './edgeApi';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;

async function uploadImage(intent, fileUri, fileName, mimeType) {
  const signedUpload = await edgeRequest('/v1/uploads/signatures', { body: { intent } });
  const file = new File(fileUri);
  if (!file.exists) {
    throw new Error('Không đọc được ảnh đã chọn. Vui lòng chọn lại ảnh.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh phải nhỏ hơn 10 MB.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let response;
  try {
    response = await file.upload(
      `https://api.cloudinary.com/v1_1/${signedUpload.cloudName}/image/upload`,
      {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType || file.type || (fileName?.toLowerCase().endsWith('.png')
          ? 'image/png'
          : 'image/jpeg'),
        parameters: {
          api_key: signedUpload.apiKey,
          timestamp: String(signedUpload.timestamp),
          folder: signedUpload.folder,
          public_id: signedUpload.public_id,
          signature: signedUpload.signature,
          overwrite: String(signedUpload.overwrite ?? false),
        },
        signal: controller.signal,
      }
    );
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tải ảnh quá thời gian. Hãy kiểm tra mạng rồi thử lại.');
    }
    throw new Error('Không thể tải ảnh lên Cloudinary. Hãy kiểm tra mạng rồi thử lại.');
  } finally {
    clearTimeout(timeout);
  }

  let result = null;
  try {
    result = JSON.parse(response.body);
  } catch {
    // Cloudinary normally returns JSON, including for validation errors.
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(result?.error?.message || 'Không thể tải ảnh lên Cloudinary.');
  }
  const deliveryType = 'upload';
  const expectedCloudinaryUrl = `https://res.cloudinary.com/${signedUpload.cloudName}/image/${deliveryType}/`;
  if (!result.secure_url?.startsWith(expectedCloudinaryUrl)
    || result.public_id !== `${signedUpload.folder}/${signedUpload.public_id}`
    || result.type !== deliveryType) {
    throw new Error('Cloudinary trả về thông tin ảnh không khớp chữ ký.');
  }
  if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(result.format) || result.bytes > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh cần ở định dạng JPG, PNG, WebP hoặc HEIC và nhỏ hơn 10 MB.');
  }
  const verified = {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    deliveryType,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    version: result.version,
  };
  return { ...verified, originalUrl: verified.secureUrl, thumbnailUrl: verified.secureUrl, url: verified.secureUrl };
}

export const uploadApi = {
  uploadClothing: (fileUri, fileName, mimeType) => uploadImage('wardrobe', fileUri, fileName, mimeType),
  uploadAvatar: (fileUri, fileName, mimeType) => uploadImage('avatar', fileUri, fileName, mimeType),
  uploadTryOnInput: (fileUri, fileName, mimeType) => uploadImage('tryOnInput', fileUri, fileName, mimeType),
};
