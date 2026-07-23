import { nodeApiRequest } from './nodeApiClient';

export const weatherApi = {
  createSnapshot: ({ lat, lon }) => nodeApiRequest('/weather/snapshots', {
    method: 'POST',
    body: { lat, lon },
  }),
  latestSnapshot: () => nodeApiRequest('/weather/snapshots/latest'),
};
