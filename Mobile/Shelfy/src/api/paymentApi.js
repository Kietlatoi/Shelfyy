import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

export function createPaymentApi(callable) {
  return {
    async createVnpayPayment(planId) {
      const result = await callable('createVnpayPayment')({ planId });
      return result.data;
    },
  };
}

const callable = (name) => httpsCallable(functions, name);
export const paymentApi = createPaymentApi(callable);
