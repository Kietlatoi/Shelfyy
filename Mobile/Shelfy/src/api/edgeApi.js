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

async function request(path, { method = 'POST', body, idToken } = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
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

export async function edgePublicRequest(path, options = {}) {
  return request(path, options);
}

export async function edgeRequest(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Vui lòng đăng nhập để tiếp tục.');
  return request(path, { ...options, idToken: await user.getIdToken() });
}
