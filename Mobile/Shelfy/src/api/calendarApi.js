import { nodeApiRequest } from './nodeApiClient';

export const calendarApi = {
  status: () => nodeApiRequest('/calendar/status'),
  today: () => nodeApiRequest('/calendar/today'),
  connect: () => nodeApiRequest('/calendar/google/connect', {
    method: 'POST',
    body: { client: 'mobile' },
  }),
  disconnect: () => nodeApiRequest('/calendar/google/disconnect', { method: 'DELETE' }),
};
