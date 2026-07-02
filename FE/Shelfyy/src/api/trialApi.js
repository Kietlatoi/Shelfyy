import { apiRequest } from './apiClient';

export const trialApi = {
  generate: ({ personImageUrl, clothingItemId }) =>
    apiRequest('/trial/generate', { method: 'POST', body: { personImageUrl, clothingItemId } }),
  getStatus: (jobId) => apiRequest(`/trial/${jobId}/status`),
  getHistory: ({ page = 0, size = 10 } = {}) => apiRequest('/trial/history', { query: { page, size } }),
  deleteHistory: (id) => apiRequest(`/trial/history/${id}`, { method: 'DELETE' }),
};
