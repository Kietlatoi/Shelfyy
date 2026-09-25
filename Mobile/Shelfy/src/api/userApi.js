import { apiRequest } from './apiClient';

export const userApi = {
  me: () => apiRequest('/users/me'),
  updateMe: (payload) => apiRequest('/users/me', { method: 'PUT', body: payload }),
  changePassword: (payload) => apiRequest('/users/me/password', { method: 'PUT', body: payload }),
};
