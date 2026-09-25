import { nodeApiRequest } from './nodeApiClient';

export const wardrobePreferenceApi = {
  getPreferences: (itemIds = []) => {
    if (!itemIds || itemIds.length === 0) return Promise.resolve([]);
    return nodeApiRequest('/wardrobe/preferences', {
      query: { itemIds: itemIds.join(',') },
    });
  },
  updatePreference: (itemId, payload) =>
    nodeApiRequest(`/wardrobe/items/${itemId}/preferences`, {
      method: 'PUT',
      body: payload,
    }),
};
