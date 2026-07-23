import { nodeApiRequest } from './nodeApiClient';

export const wardrobePreferenceApi = {
  getPreferences: (itemIds = []) =>
    nodeApiRequest('/wardrobe/preferences', {
      query: { itemIds: itemIds.join(',') },
    }),
  updatePreference: (itemId, payload) =>
    nodeApiRequest(`/wardrobe/items/${itemId}/preferences`, {
      method: 'PUT',
      body: payload,
    }),
};
