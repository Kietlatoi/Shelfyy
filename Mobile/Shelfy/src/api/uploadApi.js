import { apiRequest } from './apiClient';

export const uploadApi = {
  uploadClothing: (fileUri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || 'photo.jpg',
      type: mimeType || 'image/jpeg',
    });
    return apiRequest('/upload/clothing', { method: 'POST', body: formData });
  },
  uploadAvatar: (fileUri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || 'avatar.jpg',
      type: mimeType || 'image/jpeg',
    });
    return apiRequest('/upload/avatar', { method: 'POST', body: formData });
  },
};
