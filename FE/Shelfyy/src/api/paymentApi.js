import { apiRequest } from './apiClient';

export const paymentApi = {
  /**
   * Tạo giao dịch VNPay cho gói `planType` (PRO | PREMIUM), trả về
   * { paymentUrl, transactionCode }. Gọi xong thì redirect trình duyệt sang
   * paymentUrl để người dùng thanh toán trên cổng VNPay Sandbox.
   */
  createVnpayPayment: (planType) =>
    apiRequest('/payments/vnpay/create', { method: 'POST', body: { planType } }),
};
