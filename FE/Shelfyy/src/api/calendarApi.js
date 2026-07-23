import { nodeApiRequest } from './nodeApiClient';

export const calendarApi = {
  status() {
    return nodeApiRequest('/calendar/status');
  },

  today() {
    return nodeApiRequest('/calendar/today');
  },

  connect() {
    return nodeApiRequest('/calendar/google/connect', {
      method: 'POST',
    });
  },

  disconnect() {
    return nodeApiRequest('/calendar/google/disconnect', {
      method: 'DELETE',
    });
  },
};
