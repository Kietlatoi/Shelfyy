import { nodeApiRequest } from './nodeApiClient';

export const adminApi = {
  me: () => nodeApiRequest('/admin/me'),
  overview: () => nodeApiRequest('/admin/overview'),
  analytics: ({ days = 30 } = {}) =>
    nodeApiRequest('/admin/analytics', {
      query: { days },
    }),
  users: ({ page = 0, size = 20, q, status, plan, role } = {}) =>
    nodeApiRequest('/admin/users', {
      query: { page, size, q, status, plan, role },
    }),
  userDetail: (id) => nodeApiRequest(`/admin/users/${id}`),
  updateUserStatus: (id, status) =>
    nodeApiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  updateUserPlan: (id, payload) =>
    nodeApiRequest(`/admin/users/${id}/plan`, {
      method: 'PATCH',
      body: payload,
    }),
  wardrobeItems: ({ page = 0, size = 20, q, category } = {}) =>
    nodeApiRequest('/admin/wardrobe-items', {
      query: { page, size, q, category },
    }),
  deleteWardrobeItem: (id) =>
    nodeApiRequest(`/admin/wardrobe-items/${id}`, {
      method: 'DELETE',
    }),
  payments: ({ page = 0, size = 20, q, status } = {}) =>
    nodeApiRequest('/admin/payments', {
      query: { page, size, q, status },
    }),
  subscriptions: ({ page = 0, size = 20, q, status, plan } = {}) =>
    nodeApiRequest('/admin/subscriptions', {
      query: { page, size, q, status, plan },
    }),
  auditLogs: ({ page = 0, size = 20, q } = {}) =>
    nodeApiRequest('/admin/audit-logs', {
      query: { page, size, q },
    }),
};
