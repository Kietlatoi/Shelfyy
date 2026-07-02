import { apiRequest } from './apiClient';

export const outfitApi = {
  getMyOutfits: ({ page = 0, size = 10 } = {}) => apiRequest('/outfits', { query: { page, size } }),
  createOutfit: (payload) => apiRequest('/outfits', { method: 'POST', body: payload }),
  deleteOutfit: (id) => apiRequest(`/outfits/${id}`, { method: 'DELETE' }),
};
