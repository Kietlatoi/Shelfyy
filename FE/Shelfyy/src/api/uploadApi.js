import { apiRequest } from './apiClient';

function toFormData(file) {
  if (!file) {
    throw new Error('File upload không hợp lệ. Vui lòng chọn ảnh trước.');
  }

  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const uploadApi = {
  uploadClothing: (file) => apiRequest('/upload/clothing', { method: 'POST', body: toFormData(file) }),
  uploadAvatar: (file) => apiRequest('/upload/avatar', { method: 'POST', body: toFormData(file) }),
};
