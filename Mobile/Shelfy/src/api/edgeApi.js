import { auth } from '../firebase/client';

function baseUrl() {
  const value = process.env.EXPO_PUBLIC_EDGE_API_URL?.trim().replace(/\/+$/, '');
  if (!value) {
    throw new Error('Chưa cấu hình EXPO_PUBLIC_EDGE_API_URL cho Cloudflare Worker.');
  }
  if (!value.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_EDGE_API_URL phải là địa chỉ HTTPS.');
  }
  return value;
}

export async function edgeRequest(path, { method = 'POST', body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Vui lòng đăng nhập để tiếp tục.');
  const idToken = await user.getIdToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Không thể kết nối dịch vụ Shelfy.');
    error.code = result?.error?.code || `HTTP_${response.status}`;
    throw error;
  }
  return result?.data;
}
