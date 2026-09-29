import { wardrobeApi } from './wardrobeApi';

export const wardrobePreferenceApi = {
  getPreferences: (itemIds = []) => {
    return Promise.resolve([]);
  },
  updatePreference: (itemId, payload) => wardrobeApi.updatePreference(itemId, payload),
};
