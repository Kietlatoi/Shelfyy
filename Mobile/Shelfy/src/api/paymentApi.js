import { nodeApiRequest } from './nodeApiClient';

export const paymentApi = {
  createVnpayPayment: (planType) =>
    nodeApiRequest('/payments/vnpay/create', {
      method: 'POST',
      body: { planType },
    }),
};
