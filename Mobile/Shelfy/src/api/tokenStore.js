import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'shelfy_access_token';
const REFRESH_TOKEN_KEY = 'shelfy_refresh_token';
const USER_KEY = 'shelfy_user';

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredUser() {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveAuth(authResponse) {
  if (!authResponse) return;
  const promises = [];
  if (authResponse.accessToken) {
    promises.push(SecureStore.setItemAsync(ACCESS_TOKEN_KEY, authResponse.accessToken));
  }
  if (authResponse.refreshToken) {
    promises.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, authResponse.refreshToken));
  }
  if (authResponse.user) {
    promises.push(SecureStore.setItemAsync(USER_KEY, JSON.stringify(authResponse.user)));
  }
  await Promise.all(promises);
}

export async function clearAuth() {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  } catch {
    // Ignore error if keys do not exist
  }
}

export async function isAuthenticated() {
  const token = await getAccessToken();
  return Boolean(token);
}
