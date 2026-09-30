import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { edgeRequest } from './edgeApi';

const catalog = {
  purchaseEnabled: false,
  provider: 'PAYOS',
  plans: [
    { id: 'FREE', name: 'Cơ bản', price: 0, wardrobeLimit: 100, tryOnLimit: 5, quotaPeriod: 'DAY' },
    { id: 'PRO', name: 'PRO', price: 69000, wardrobeLimit: -1, tryOnLimit: 100, quotaPeriod: 'MONTH' },
    { id: 'PREMIUM', name: 'PREMIUM', price: 599000, wardrobeLimit: -1, tryOnLimit: 500, quotaPeriod: 'MONTH' },
  ],
};

const freeEntitlement = {
  planId: 'FREE',
  planName: 'Cơ bản',
  status: 'ACTIVE',
  startsAt: null,
  expiresAt: null,
  wardrobeLimit: 100,
  quota: { used: 0, limit: 5, period: 'DAY' },
};

function entitlementFallback(data) {
  const expiresAt = data?.expiresAt?.toDate?.()?.toISOString?.() || data?.expiresAt || null;
  const active = data?.status === 'ACTIVE' && Date.parse(expiresAt) > Date.now();
  if (!active || !['PRO', 'PREMIUM'].includes(data?.planId)) return freeEntitlement;
  const plan = catalog.plans.find((candidate) => candidate.id === data.planId);
  return {
    planId: plan.id,
    planName: plan.name,
    status: 'ACTIVE',
    startsAt: data.startsAt?.toDate?.()?.toISOString?.() || data.startsAt || null,
    expiresAt,
    wardrobeLimit: plan.wardrobeLimit,
    quota: { used: 0, limit: plan.tryOnLimit, period: plan.quotaPeriod },
  };
}

export const subscriptionApi = {
  async getPlans() {
    try {
      return await edgeRequest('/v1/billing/plans', { method: 'GET' });
    } catch {
      return catalog;
    }
  },
  async getMyPlan() {
    try {
      return await edgeRequest('/v1/billing/me', { method: 'GET' });
    } catch {
      const uid = auth.currentUser?.uid;
      if (!uid) return freeEntitlement;
      const snapshot = await getDoc(doc(db, 'users', uid, 'entitlements', 'current')).catch(() => null);
      return snapshot?.exists() ? entitlementFallback(snapshot.data()) : freeEntitlement;
    }
  },
};
