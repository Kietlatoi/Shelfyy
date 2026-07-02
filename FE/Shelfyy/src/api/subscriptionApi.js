import { apiRequest } from './apiClient';

export const subscriptionApi = {
  getPlans: () => apiRequest('/subscription/plans', { auth: false }),
  getMyPlan: () => apiRequest('/subscription/me'),
  upgrade: (planType) => apiRequest('/subscription/upgrade', { method: 'POST', body: { planType } }),
  cancel: () => apiRequest('/subscription/cancel', { method: 'POST' }),
};
