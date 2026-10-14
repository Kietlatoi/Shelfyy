import { edgeRequest } from './edgeApi';

export function playOffer(product) {
  if (!product || product.currency !== 'VND') return null;
  const offers = product.discountOffers || [];
  const offer = offers.find((item) => item.currency === 'VND'
    && !item.rentalDetailsAndroid && !item.preorderDetailsAndroid);
  if (offers.length && !offer) return null;
  return {
    productId: product.id,
    displayPrice: offer?.displayPrice || product.displayPrice,
    offerToken: offer?.offerTokenAndroid || undefined,
  };
}

export const googlePlayApi = {
  context: () => edgeRequest('/v1/billing/google-play/context', { method: 'GET' }),
  verify: (purchase) => {
    if (!purchase?.purchaseToken || !purchase.productId) throw new Error('Google chưa trả đủ thông tin giao dịch.');
    return edgeRequest('/v1/billing/google-play/verify', {
      body: { productId: purchase.productId, purchaseToken: purchase.purchaseToken },
    });
  },
};
