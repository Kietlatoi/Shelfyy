const catalog = {
  purchaseEnabled: false,
  provider: 'PAYOS_COMING_SOON',
  plans: [
    { id: 'FREE', name: 'Cơ bản', price: 0 },
    { id: 'PRO', name: 'PRO', price: 99000 },
    { id: 'PREMIUM', name: 'PREMIUM', price: 799000 },
  ],
};

const freeEntitlement = {
  planId: 'FREE',
  status: 'ACTIVE',
  wardrobeLimit: 100,
  quota: { used: 0, limit: 5 },
};

export const subscriptionApi = {
  getPlans: async () => catalog,
  getMyPlan: async () => freeEntitlement,
};
