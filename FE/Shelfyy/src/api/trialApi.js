import { nodeApiRequest } from './nodeApiClient';

export const trialApi = {
  generate: ({ personImageUrl, personImageDataUrl, clothingItemId }) =>
    nodeApiRequest('/trial/generate', {
      method: 'POST',
      body: { personImageUrl, personImageDataUrl, clothingItemId },
    }),
  getStatus: (jobId) => nodeApiRequest(`/trial/${jobId}/status`),
  getHistory: ({ page = 0, size = 10, saved } = {}) => nodeApiRequest('/trial/history', { query: { page, size, saved } }),
  setSaved: (jobId, saved = true) =>
    nodeApiRequest(`/trial/${jobId}/saved`, {
      method: 'PATCH',
      body: { saved },
    }),
  deleteHistory: (id) => nodeApiRequest(`/trial/history/${id}`, { method: 'DELETE' }),
};
