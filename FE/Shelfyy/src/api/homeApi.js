import { apiRequest } from './apiClient';

export const homeApi = {
  getHome: ({ lat, lon } = {}) => apiRequest('/home', { query: { lat, lon } }),
  getEvents: ({ from, to, page = 0, size = 20 } = {}) => apiRequest('/events', { query: { from, to, page, size } }),
  createEvent: (payload) => apiRequest('/events', { method: 'POST', body: payload }),
  updateEvent: (id, payload) => apiRequest(`/events/${id}`, { method: 'PUT', body: payload }),
  deleteEvent: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
};
