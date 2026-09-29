import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

async function uploadImage(intent, fileUri, fileName, mimeType) {
  const requestSignature = httpsCallable(functions, 'createCloudinaryUploadSignature');
  const { data: signedUpload } = await requestSignature({ intent });
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName || 'photo.jpg',
    type: mimeType || 'image/jpeg',
  });
  formData.append('api_key', signedUpload.apiKey);
  formData.append('timestamp', String(signedUpload.timestamp));
  formData.append('folder', signedUpload.folder);
  formData.append('public_id', signedUpload.public_id);
  if (signedUpload.type) formData.append('type', signedUpload.type);
  formData.append('signature', signedUpload.signature);
  formData.append('overwrite', String(signedUpload.overwrite ?? false));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signedUpload.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Không thể tải ảnh lên Cloudinary.');
  }
  const deliveryType = signedUpload.type || 'upload';
  const expectedCloudinaryUrl = `https://res.cloudinary.com/${signedUpload.cloudName}/image/${deliveryType}/`;
  if (!result.secure_url?.startsWith(expectedCloudinaryUrl)
    || result.public_id !== `${signedUpload.folder}/${signedUpload.public_id}`
    || result.type !== deliveryType) {
    throw new Error('Cloudinary trả về thông tin ảnh không khớp chữ ký.');
  }
  if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(result.format) || result.bytes > 10 * 1024 * 1024) {
    throw new Error('Ảnh cần ở định dạng JPG, PNG, WebP hoặc HEIC và nhỏ hơn 10 MB.');
  }
  const complete = httpsCallable(functions, 'completeCloudinaryUpload');
  const { data: verified } = await complete({ publicId: result.public_id });
  return { ...verified, originalUrl: verified.secureUrl, thumbnailUrl: verified.secureUrl, url: verified.secureUrl };
}

export const uploadApi = {
  uploadClothing: (fileUri, fileName, mimeType) => uploadImage('wardrobe', fileUri, fileName, mimeType),
  uploadAvatar: (fileUri, fileName, mimeType) => uploadImage('avatar', fileUri, fileName, mimeType),
  uploadTryOnInput: (fileUri, fileName, mimeType) => uploadImage('tryOnInput', fileUri, fileName, mimeType),
};
