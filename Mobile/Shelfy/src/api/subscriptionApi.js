import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

export function createSubscriptionApi(callable) {
  return {
    async getPlans() {
      const result = await callable('getSubscriptionPlans')({});
      return result.data;
    },
    async getMyPlan() {
      const result = await callable('getMyEntitlement')({});
      return result.data;
    },
  };
}

const callable = (name) => httpsCallable(functions, name);
export const subscriptionApi = createSubscriptionApi(callable);
