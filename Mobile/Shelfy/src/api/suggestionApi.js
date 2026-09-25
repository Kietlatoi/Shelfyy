import { nodeApiRequest } from './nodeApiClient';

export const suggestionApi = {
  latestToday: async () => {
    const data = await nodeApiRequest('/suggestions/today/latest');
    return data?.suggestion ?? null;
  },
  generateToday: () => nodeApiRequest('/suggestions/today', { method: 'POST' }),
  markConfirmed: (id, payload = {}) =>
    nodeApiRequest(`/suggestions/${id}/confirm`, { method: 'POST', body: payload }),
};
