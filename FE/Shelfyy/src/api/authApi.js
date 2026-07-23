import { apiRequest, refreshAccessToken } from './apiClient';
import { clearAuth, getRefreshToken, saveAuth } from './tokenStore';

export async function login({ email, password, rememberMe = false }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, rememberMe },
  });
  saveAuth(data);
  return data;
}

export async function register({ email, password, fullName }) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, fullName },
  });
  saveAuth(data);
  return data;
}

export async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

export async function resetPassword({ token, newPassword }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, newPassword },
  });
}

export async function refresh() {
  return refreshAccessToken();
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        auth: false,
        body: { refreshToken },
      });
    }
  } finally {
    clearAuth();
  }
}
