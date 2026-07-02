import { apiRequest } from './apiClient';

export const wardrobeApi = {
  getItems: ({ category, season, color, q, page = 0, size = 20 } = {}) =>
    apiRequest('/wardrobe/items', { query: { category, season, color, q, page, size } }),
  createItem: (payload) => apiRequest('/wardrobe/items', { method: 'POST', body: payload }),
  getItem: (id) => apiRequest(`/wardrobe/items/${id}`),
  updateItem: (id, payload) => apiRequest(`/wardrobe/items/${id}`, { method: 'PUT', body: payload }),
  deleteItem: (id) => apiRequest(`/wardrobe/items/${id}`, { method: 'DELETE' }),
  getPairings: (id) => apiRequest(`/wardrobe/items/${id}/pairings`),
  markWorn: (id) => apiRequest(`/wardrobe/items/${id}/wear`, { method: 'PATCH' }),
  getStats: () => apiRequest('/wardrobe/stats'),
};
