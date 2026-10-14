import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { auth } from '../firebase/client';
import { isGooglePlayBuild } from '../constants/distribution';
import { googlePlayApi, playOffer } from '../api/googlePlayApi';

const BillingContext = createContext(null);

export function GooglePlayBillingProvider({ children }) {
  const { user } = useAuth();
  const uid = user ? auth.currentUser?.uid : null;
  const [catalog, setCatalog] = useState(null);
  const [offers, setOffers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const native = useRef(null);
  const context = useRef(null);
  const owner = useRef(null);
  const busyRef = useRef(false);
  const watchdog = useRef(null);

  useEffect(() => {
    if (!isGooglePlayBuild || !uid) return;
    let active = true;
    let iap;
    let updates;
    let errors;
    let resume;
    const inFlight = new Set();
    owner.current = uid;
    const finish = () => {
      clearTimeout(watchdog.current);
      busyRef.current = false;
      if (active) setBusy(false);
    };
    const sync = async (purchase, interactive = false) => {
      const token = purchase?.purchaseToken;
      if (!active || auth.currentUser?.uid !== uid || !token || inFlight.has(token)) return;
      if (!context.current?.plans.some((plan) => plan.productId === purchase.productId)) return;
      inFlight.add(token);
      try {
        const payment = await googlePlayApi.verify(purchase);
        if (!active) return;
        setRevision((value) => value + 1);
        setError('');
        if (interactive) Alert.alert(
          payment.status === 'PAID' ? 'Thanh toán thành công' : 'Đang kiểm tra thanh toán',
          payment.status === 'PAID' ? `Gói ${payment.planId} đã được kích hoạt.`
            : payment.status === 'PENDING' ? 'Google đang chờ thanh toán. Quyền lợi sẽ cập nhật sau khi Google xác nhận.'
              : 'Giao dịch chưa được kích hoạt. Vui lòng liên hệ hỗ trợ nếu đã thanh toán.',
        );
      } catch (failure) {
        if (active) setError(failure.message || 'Chưa xác minh được giao dịch. Hãy nhấn Kiểm tra giao dịch để thử lại.');
      } finally {
        inFlight.delete(token);
        finish();
      }
    };
    const recover = async () => {
      if (!iap || !active) return;
      for (const purchase of await iap.getAvailablePurchases()) await sync(purchase);
    };
    const connect = async () => {
      const next = await googlePlayApi.context();
      if (!active) return;
      context.current = next;
      setCatalog(next);
      if (!next.purchaseEnabled) {
        setError('Google Play chưa sẵn sàng thanh toán. Vui lòng thử lại sau.');
        return;
      }
      iap = await import('expo-iap');
      if (!active) return;
      updates = iap.purchaseUpdatedListener((purchase) => { void sync(purchase, busyRef.current); });
      errors = iap.purchaseErrorListener((failure) => {
        if (active && failure.code !== 'user-cancelled') setError(failure.message || 'Google không thể hoàn tất thanh toán.');
        finish();
      });
      if (!(await iap.initConnection())) throw new Error('Không thể kết nối Google Play.');
      if (!active) { await iap.endConnection(); return; }
      const products = await iap.fetchProducts({ skus: next.plans.map((plan) => plan.productId).filter(Boolean), type: 'in-app' });
      if (!active) return;
      const mapped = {};
      for (const plan of next.plans) {
        const offer = playOffer(products.find((product) => product.id === plan.productId));
        if (offer?.displayPrice) mapped[plan.id] = offer;
      }
      setOffers(mapped);
      setError('');
      native.current = { iap, recover };
      resume = AppState.addEventListener('change', (state) => {
        if (state === 'active') recover().catch(() => {});
      });
      await recover();
    };
    connect().catch((failure) => { if (active) setError(failure.message || 'Google Play chưa sẵn sàng.'); });
    return () => {
      active = false;
      native.current = null;
      context.current = null;
      owner.current = null;
      busyRef.current = false;
      clearTimeout(watchdog.current);
      updates?.remove(); errors?.remove(); resume?.remove();
      if (iap) iap.endConnection().catch(() => {});
    };
  }, [uid]);

  const buy = async (planId) => {
    const offer = offers[planId];
    if (busyRef.current) return;
    if (!native.current || !offer || !context.current?.purchaseEnabled || auth.currentUser?.uid !== owner.current) {
      throw new Error('Sản phẩm Google Play chưa sẵn sàng thanh toán.');
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    watchdog.current = setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
      setError('Chưa nhận được xác nhận. Hãy nhấn Kiểm tra giao dịch; không cần mua lại.');
    }, 90000);
    try {
      await native.current.iap.requestPurchase({
        type: 'in-app', request: { google: {
          skus: [offer.productId], offerToken: offer.offerToken,
          obfuscatedAccountId: context.current.accountId,
        } },
      });
    } catch (failure) {
      clearTimeout(watchdog.current);
      busyRef.current = false;
      setBusy(false);
      if (failure.code !== 'user-cancelled') throw failure;
    }
  };

  const recover = async () => {
    if (!native.current) throw new Error('Chưa kết nối được Google Play. Hãy mở lại ứng dụng sau khi cấu hình hoàn tất.');
    await native.current.recover();
  };

  return <BillingContext.Provider value={{ catalog, offers, busy, error, revision, buy, recover }}>{children}</BillingContext.Provider>;
}

export const useGooglePlayBilling = () => useContext(BillingContext);
