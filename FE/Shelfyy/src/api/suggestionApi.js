import { nodeApiRequest } from './nodeApiClient';

export const suggestionApi = {
  latestToday: () => nodeApiRequest('/suggestions/today/latest'),
  generateToday: () =>
    nodeApiRequest('/suggestions/today', {
      method: 'POST',
    }),
  markConfirmed: (id, payload = {}) =>
    nodeApiRequest(`/suggestions/${id}/confirm`, {
      method: 'POST',
      body: payload,
    }),
};
