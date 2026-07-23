import { nodeApiRequest } from './nodeApiClient';

export const paymentApi = {
  /**
   * Tạo giao dịch VNPay qua Nodejs service cho gói `planType` (PRO | PREMIUM),
   * trả về { paymentUrl, transactionCode } để redirect sang VNPay Sandbox.
   */
  createVnpayPayment: (planType) =>
    nodeApiRequest('/payments/vnpay/create', { method: 'POST', body: { planType } }),
};
