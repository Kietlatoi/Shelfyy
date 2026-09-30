import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { edgeRequest } from './edgeApi';

const PENDING_PAYMENT_KEY = 'shelfy:pending-payment';

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

async function remember(payment) {
  if (!payment?.orderCode || !['CREATING', 'PENDING'].includes(payment.status)) {
    await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
    orderCode: String(payment.orderCode),
    planId: payment.planId,
    expiresAt: payment.expiresAt,
  }));
}

export const paymentApi = {
  async createPayment(planId, appReturnUrl) {
    const payment = await edgeRequest('/v1/billing/checkout', {
      body: { planId, requestId: requestId(), appReturnUrl },
    });
    await remember(payment);
    return payment;
  },

  async getPayment(orderCode) {
    const payment = await edgeRequest(`/v1/billing/payments/${encodeURIComponent(orderCode)}`, {
      method: 'GET',
    });
    await remember(payment);
    return payment;
  },

  async cancelPayment(orderCode) {
    const payment = await edgeRequest(`/v1/billing/payments/${encodeURIComponent(orderCode)}/cancel`, {
      method: 'POST',
      body: {},
    });
    await remember(payment);
    return payment;
  },

  async waitForFinalStatus(orderCode, { timeoutMs = 90_000, intervalMs = 2_500 } = {}) {
    const startedAt = Date.now();
    let payment;
    while (Date.now() - startedAt < timeoutMs) {
      payment = await this.getPayment(orderCode);
      if (!['CREATING', 'PENDING'].includes(payment.status)) return payment;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return payment || this.getPayment(orderCode);
  },

  async getPendingPayment() {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    try {
      const pending = JSON.parse(raw);
      if (!pending?.orderCode || (pending.expiresAt && Date.parse(pending.expiresAt) <= Date.now())) {
        await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
        return null;
      }
      return pending;
    } catch {
      await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
  },

  clearPendingPayment() {
    return AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
  },

  async listPayments(size = 50) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Vui lòng đăng nhập để xem lịch sử thanh toán.');
    const snapshot = await getDocs(query(
      collection(db, 'users', uid, 'payments'),
      orderBy('createdAt', 'desc'),
      limit(Math.min(Math.max(Number(size) || 50, 1), 100)),
    ));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  },

  createPayOsPayment(planId) {
    return this.createPayment(planId);
  },
};
