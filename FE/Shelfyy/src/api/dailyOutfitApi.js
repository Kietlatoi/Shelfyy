import { nodeApiRequest } from './nodeApiClient';

export const dailyOutfitApi = {
  list: ({ page = 0, size = 12, from, to } = {}) =>
    nodeApiRequest('/daily-outfits', {
      query: { page, size, from, to },
    }),
  getToday: (date) =>
    nodeApiRequest('/daily-outfits/today', {
      query: { date },
    }),
  confirmToday: (payload) =>
    nodeApiRequest('/daily-outfits', {
      method: 'POST',
      body: payload,
    }),
};
