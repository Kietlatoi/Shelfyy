import { auth } from '../firebase/adminClient';

const baseUrl = String(import.meta.env.VITE_EDGE_API_URL || '').replace(/\/+$/, '');

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function request(path, options = {}) {
  if (!baseUrl) throw new Error('Chưa cấu hình VITE_EDGE_API_URL.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Vui lòng đăng nhập lại.');
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (options.download && response.ok) return response;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.code === 'GA4_UNAVAILABLE'
    ? 'Chưa đọc được GA4. Kiểm tra Property ID, Google Analytics Data API và quyền Viewer của service account trong GA4.'
    : payload?.error?.message || 'Không thể kết nối máy chủ.');
  return payload?.data;
}

export const adminApi = {
  me: () => request('/v1/admin/me'),
  summary: (period) => request(`/v1/admin/summary${queryString({ period })}`),
  reviews: (params) => request(`/v1/admin/reviews${queryString(params)}`),
  analytics: (period) => request(`/v1/admin/analytics${queryString({ period })}`),
  users: (params) => request(`/v1/admin/users${queryString(params)}`),
  user: (uid) => request(`/v1/admin/users/${encodeURIComponent(uid)}`),
  updateAccess: (uid, status) => request(`/v1/admin/users/${encodeURIComponent(uid)}/access`, {
    method: 'PATCH', body: { status },
  }),
  payments: (params) => request(`/v1/admin/payments${queryString(params)}`),
  payment: (orderCode) => request(`/v1/admin/payments/${encodeURIComponent(orderCode)}`),
  reconcile: (orderCode) => request(`/v1/admin/payments/${encodeURIComponent(orderCode)}/reconcile`, { method: 'POST' }),
  async exportPayments(params) {
    const response = await request(`/v1/admin/payments/export.csv${queryString(params)}`, { download: true });
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'shelfy-payments.csv';
    link.click();
    URL.revokeObjectURL(url);
  },
};
