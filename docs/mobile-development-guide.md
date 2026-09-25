# Shelfy Mobile — Hướng Dẫn Xây Dựng Giao Diện Toàn Bộ

## Mục Đích

Tài liệu này hướng dẫn chi tiết cách tạo **toàn bộ giao diện mobile** cho ứng dụng Shelfy, sử dụng **React Native + Expo** (SDK 57). Backend đã có đầy đủ API — tài liệu sẽ map từng màn hình tới endpoint tương ứng, mô tả layout, luồng tương tác, và cung cấp code mẫu cho từng phần.

> **Quy ước trong tài liệu:**
>
> - `CORE_API` = URL của Core API Service (Spring Boot), ví dụ `https://shelfyy-production-4f6e.up.railway.app/api`
> - `NODE_API` = URL của Nodejs Service, ví dụ `http://localhost:3000/api`
> - Tất cả endpoint có Auth = Có đều cần header `Authorization: Bearer <accessToken>`

---

## Mục Lục

1. [Khởi Tạo Dự Án](#1-khởi-tạo-dự-án)
2. [Cấu Trúc Thư Mục](#2-cấu-trúc-thư-mục)
3. [Cài Đặt Dependencies](#3-cài-đặt-dependencies)
4. [Cấu Hình Môi Trường](#4-cấu-hình-môi-trường)
5. [Design System & Theme](#5-design-system--theme)
6. [API Layer](#6-api-layer)
7. [Authentication & Token Management](#7-authentication--token-management)
8. [Navigation & Routing](#8-navigation--routing)
9. [Danh Sách Màn Hình](#9-danh-sách-màn-hình)
   - 9.1 [Onboarding / Landing](#91-onboarding--landing)
   - 9.2 [Login](#92-login)
   - 9.3 [Register](#93-register)
   - 9.4 [Forgot Password](#94-forgot-password)
   - 9.5 [Reset Password](#95-reset-password)
   - 9.6 [Home (Trang Chủ)](#96-home-trang-chủ)
   - 9.7 [Wardrobe (Tủ Đồ)](#97-wardrobe-tủ-đồ)
   - 9.8 [Wardrobe Item Detail](#98-wardrobe-item-detail)
   - 9.9 [Add / Edit Wardrobe Item](#99-add--edit-wardrobe-item)
   - 9.10 [Favorites (Yêu Thích)](#910-favorites-yêu-thích)
   - 9.11 [Wear History (Lịch Sử Mặc)](#911-wear-history-lịch-sử-mặc)
   - 9.12 [Suggest (Gợi Ý Hôm Nay)](#912-suggest-gợi-ý-hôm-nay)
   - 9.13 [Trial / AI Try-On (Thử Đồ Ảo)](#913-trial--ai-try-on-thử-đồ-ảo)
   - 9.14 [Profile (Hồ Sơ Cá Nhân)](#914-profile-hồ-sơ-cá-nhân)
   - 9.15 [Premium (Nâng Cấp Gói)](#915-premium-nâng-cấp-gói)
10. [Xử Lý Đặc Thù Mobile](#10-xử-lý-đặc-thù-mobile)
11. [Testing & Chạy Thử](#11-testing--chạy-thử)

---

## 1. Khởi Tạo Dự Án

Dự án mobile đã được khởi tạo tại `Mobile/Shelfy` với Expo SDK 57. Cần chuyển sang dùng **Expo Router** cho navigation theo file-based routing.

```bash
cd Mobile/Shelfy

# Cài Expo Router và các dependencies bắt buộc
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens expo-splash-screen react-native-gesture-handler

# Cài thêm các thư viện cần thiết
npx expo install @expo/vector-icons expo-image-picker expo-location expo-secure-store expo-web-browser react-native-reanimated expo-image
```

Cập nhật `package.json`, thêm `main`:

```json
{
  "main": "expo-router/entry"
}
```

Cập nhật `app.json`, thêm scheme cho deep linking:

```json
{
  "expo": {
    "scheme": "shelfy",
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## 2. Cấu Trúc Thư Mục

```
Mobile/Shelfy/
├── app/                          # Expo Router — mỗi file = 1 route
│   ├── _layout.jsx               # Root layout (auth guard, providers)
│   ├── index.jsx                 # Landing / redirect
│   ├── (auth)/                   # Auth group (không có tab bar)
│   │   ├── _layout.jsx
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── forgot-password.jsx
│   │   └── reset-password.jsx
│   └── (tabs)/                   # Tab group (có bottom tab bar)
│       ├── _layout.jsx           # Bottom Tab Navigator config
│       ├── home.jsx
│       ├── wardrobe/
│       │   ├── _layout.jsx       # Stack navigator cho wardrobe
│       │   ├── index.jsx         # Danh sách tủ đồ
│       │   ├── [id].jsx          # Chi tiết món đồ
│       │   ├── add.jsx           # Thêm món đồ
│       │   └── edit/[id].jsx     # Sửa món đồ
│       ├── suggest.jsx
│       ├── trial.jsx
│       └── profile/
│           ├── _layout.jsx
│           ├── index.jsx
│           ├── favorites.jsx
│           ├── wear-history.jsx
│           └── premium.jsx
├── src/
│   ├── api/                      # API clients
│   │   ├── apiClient.js          # Core API fetch wrapper
│   │   ├── nodeApiClient.js      # Nodejs Service fetch wrapper
│   │   ├── tokenStore.js         # SecureStore cho JWT
│   │   ├── authApi.js
│   │   ├── userApi.js
│   │   ├── wardrobeApi.js
│   │   ├── wardrobePreferenceApi.js
│   │   ├── weatherApi.js
│   │   ├── calendarApi.js
│   │   ├── dailyOutfitApi.js
│   │   ├── suggestionApi.js
│   │   ├── uploadApi.js
│   │   ├── trialApi.js
│   │   ├── subscriptionApi.js
│   │   ├── paymentApi.js
│   │   └── adapters.js
│   ├── components/               # Reusable UI components
│   │   ├── common/
│   │   │   ├── AppButton.jsx
│   │   │   ├── AppInput.jsx
│   │   │   ├── AppCard.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorBanner.jsx
│   │   │   ├── LoadingOverlay.jsx
│   │   │   ├── LoadingSkeleton.jsx
│   │   │   └── BottomSheet.jsx
│   │   ├── home/
│   │   │   ├── WeatherCard.jsx
│   │   │   ├── CalendarCard.jsx
│   │   │   └── TodayOutfitPanel.jsx
│   │   ├── wardrobe/
│   │   │   ├── WardrobeGrid.jsx
│   │   │   ├── WardrobeCard.jsx
│   │   │   ├── WardrobeFilters.jsx
│   │   │   ├── WardrobeStats.jsx
│   │   │   ├── ItemDetailSheet.jsx
│   │   │   ├── ItemEditForm.jsx
│   │   │   ├── DeleteConfirmDialog.jsx
│   │   │   └── UploadModal.jsx
│   │   ├── suggest/
│   │   │   ├── SuggestHero.jsx
│   │   │   ├── OutfitCarousel.jsx
│   │   │   └── InsightsCard.jsx
│   │   ├── trial/
│   │   │   ├── TrialControls.jsx
│   │   │   └── TrialShowcase.jsx
│   │   └── premium/
│   │       ├── PricingCard.jsx
│   │       └── FeatureComparison.jsx
│   ├── constants/                # Static data, enums, config
│   │   ├── colors.js
│   │   ├── typography.js
│   │   ├── spacing.js
│   │   ├── categories.js
│   │   └── itemStatus.js
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useWeather.js
│   │   ├── useWardrobe.js
│   │   └── useLocation.js
│   └── utils/
│       ├── format.js             # Currency, date formatting
│       └── geolocation.js
├── assets/
│   ├── icon.png
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── images/                   # Static images
├── app.json
└── package.json
```

---

## 3. Cài Đặt Dependencies

```bash
# Navigation & UI
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install expo-splash-screen

# Image handling
npx expo install expo-image expo-image-picker expo-image-manipulator

# Storage & Security
npx expo install expo-secure-store

# Location
npx expo install expo-location

# Browser (cho OAuth Google Calendar & VNPay)
npx expo install expo-web-browser

# Icons
npx expo install @expo/vector-icons

# Optional: Bottom Sheet
npm install @gorhom/bottom-sheet
```

---

## 4. Cấu Hình Môi Trường

Tạo file `.env` trong `Mobile/Shelfy/`:

```env
EXPO_PUBLIC_CORE_API_URL=https://shelfyy-production-4f6e.up.railway.app/api
EXPO_PUBLIC_NODE_API_URL=http://localhost:3000/api
```

> **Lưu ý:** Expo sử dụng prefix `EXPO_PUBLIC_` thay vì `VITE_`. Truy cập qua `process.env.EXPO_PUBLIC_CORE_API_URL`.

Tạo file `src/api/config.js`:

```javascript
export const CORE_API_URL = process.env.EXPO_PUBLIC_CORE_API_URL || 'http://localhost:8080/api';
export const NODE_API_URL = process.env.EXPO_PUBLIC_NODE_API_URL || 'http://localhost:3000/api';
```

---

## 5. Design System & Theme

### 5.1 Bảng Màu

Dựa trên design system của web FE, tạo `src/constants/colors.js`:

```javascript
export const colors = {
  // Primary
  primary: '#6366f1',        // Indigo
  primaryContainer: '#312e81',
  onPrimary: '#ffffff',

  // Secondary
  secondary: '#8b5cf6',      // Violet
  secondaryContainer: '#4c1d95',

  // Surface
  surface: '#ffffff',
  surfaceDim: '#1e1b4b',
  surfaceContainerLow: '#f5f3ff',
  surfaceContainerHigh: '#ede9fe',

  // Text
  onSurface: '#1e1b4b',
  onSurfaceVariant: '#6b7280',

  // Status
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Border
  borderSubtle: '#e5e7eb',
  outlineVariant: '#374151',

  // Background
  background: '#f9fafb',
  backgroundDark: '#0f0d23',
};

export const darkColors = {
  surface: '#1e1b4b',
  background: '#0f0d23',
  onSurface: '#f5f3ff',
  onSurfaceVariant: '#a5b4fc',
  borderSubtle: '#374151',
  // ... override tương ứng
};
```

### 5.2 Typography

Tạo `src/constants/typography.js`:

```javascript
export const typography = {
  headlineLg: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  headlineMd: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  headlineSm: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  titleLg:    { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  titleMd:    { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  bodyLg:     { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd:     { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm:     { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  labelLg:    { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  labelMd:    { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  labelSm:    { fontSize: 10, fontWeight: '600', lineHeight: 14 },
};
```

### 5.3 Spacing

```javascript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
```

---

## 6. API Layer

### 6.1 Token Store (dùng SecureStore thay localStorage)

Tạo `src/api/tokenStore.js`:

```javascript
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'shelfy_access_token';
const REFRESH_TOKEN_KEY = 'shelfy_refresh_token';
const USER_KEY = 'shelfy_user';

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
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
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function isAuthenticated() {
  const token = await getAccessToken();
  return Boolean(token);
}
```

### 6.2 Core API Client

Tạo `src/api/apiClient.js`:

```javascript
import { CORE_API_URL } from './config';
import { clearAuth, getAccessToken, getRefreshToken, saveAuth } from './tokenStore';
import { router } from 'expo-router';

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;
let refreshPromise = null;

function buildUrl(path, query) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${CORE_API_URL}${cleanPath}`;
  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const [, payload] = String(token).split('.');
  if (!payload) return null;
  try {
    // React Native hỗ trợ atob
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

export function handleAuthExpired() {
  clearAuth();
  // Redirect về login
  router.replace('/(auth)/login');
}

async function performRefreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    handleAuthExpired();
    return null;
  }

  const data = await response.json();
  if (!data?.accessToken || !data?.refreshToken) {
    handleAuthExpired();
    return null;
  }

  await saveAuth(data);
  return data.accessToken;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function getValidAccessToken() {
  const token = await getAccessToken();
  if (!token) {
    const hasRefresh = await getRefreshToken();
    return hasRefresh ? refreshAccessToken() : null;
  }
  if (shouldRefreshAccessToken(token)) {
    return refreshAccessToken();
  }
  return token;
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error) return typeof data.error === 'string' ? data.error : data.error.message;
  if (data.errors && typeof data.errors === 'object') {
    return Object.values(data.errors).filter(Boolean).join('\n') || fallback;
  }
  return fallback;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    headers = {},
    retryOnUnauthorized = true,
  } = options;

  const isFormData = body instanceof FormData;
  const requestHeaders = { ...headers };

  if (!isFormData && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = auth ? await getValidAccessToken() : null;
  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: body === undefined
      ? undefined
      : isFormData
        ? body
        : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest(path, { ...options, retryOnUnauthorized: false });
    }
    handleAuthExpired();
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `HTTP ${response.status}`));
  }

  return data;
}

export function pageContent(pageResponse) {
  if (!pageResponse) return [];
  if (Array.isArray(pageResponse)) return pageResponse;
  return pageResponse.content || pageResponse.items || [];
}
```

### 6.3 Node API Client

Tạo `src/api/nodeApiClient.js` — cấu trúc tương tự `apiClient.js` nhưng trỏ sang `NODE_API_URL`:

```javascript
import { NODE_API_URL } from './config';
import { getValidAccessToken, handleAuthExpired, refreshAccessToken } from './apiClient';

function buildUrl(path, query) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${NODE_API_URL}${cleanPath}`;
  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function nodeApiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    headers = {},
    retryOnUnauthorized = true,
  } = options;

  const requestHeaders = { ...headers };
  if (body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = auth ? await getValidAccessToken() : null;
  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return nodeApiRequest(path, { ...options, retryOnUnauthorized: false });
    }
    handleAuthExpired();
  }

  if (response.status === 204) return null;
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}
```

### 6.4 Các API Module

Mỗi module copy y hệt logic từ web FE, chỉ đổi import path. Dưới đây là danh sách đầy đủ:

#### `src/api/authApi.js`

```javascript
import { apiRequest, refreshAccessToken } from './apiClient';
import { clearAuth, getRefreshToken, saveAuth } from './tokenStore';

export async function login({ email, password, rememberMe = false }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST', auth: false,
    body: { email, password, rememberMe },
  });
  await saveAuth(data);
  return data;
}

export async function register({ email, password, fullName }) {
  const data = await apiRequest('/auth/register', {
    method: 'POST', auth: false,
    body: { email, password, fullName },
  });
  await saveAuth(data);
  return data;
}

export async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST', auth: false, body: { email },
  });
}

export async function resetPassword({ token, newPassword }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST', auth: false, body: { token, newPassword },
  });
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST', auth: false,
        body: { refreshToken },
      });
    }
  } finally {
    await clearAuth();
  }
}
```

#### `src/api/userApi.js`

```javascript
import { apiRequest } from './apiClient';

export const userApi = {
  me: () => apiRequest('/users/me'),
  updateMe: (payload) => apiRequest('/users/me', { method: 'PUT', body: payload }),
  changePassword: (payload) => apiRequest('/users/me/password', { method: 'PUT', body: payload }),
};
```

#### `src/api/wardrobeApi.js`

```javascript
import { apiRequest } from './apiClient';

export const wardrobeApi = {
  getItems: ({ category, season, color, q, page = 0, size = 20 } = {}) =>
    apiRequest('/wardrobe/items', { query: { category, season, color, q, page, size } }),
  createItem: (payload) =>
    apiRequest('/wardrobe/items', { method: 'POST', body: payload }),
  getItem: (id) => apiRequest(`/wardrobe/items/${id}`),
  updateItem: (id, payload) =>
    apiRequest(`/wardrobe/items/${id}`, { method: 'PUT', body: payload }),
  deleteItem: (id) =>
    apiRequest(`/wardrobe/items/${id}`, { method: 'DELETE' }),
  getPairings: (id) => apiRequest(`/wardrobe/items/${id}/pairings`),
  markWorn: (id) =>
    apiRequest(`/wardrobe/items/${id}/wear`, { method: 'PATCH' }),
  getStats: () => apiRequest('/wardrobe/stats'),
};
```

#### `src/api/wardrobePreferenceApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const wardrobePreferenceApi = {
  getPreferences: (itemIds = []) =>
    nodeApiRequest('/wardrobe/preferences', {
      query: { itemIds: itemIds.join(',') },
    }),
  updatePreference: (itemId, payload) =>
    nodeApiRequest(`/wardrobe/items/${itemId}/preferences`, {
      method: 'PUT', body: payload,
    }),
};
```

#### `src/api/uploadApi.js`

```javascript
import { apiRequest } from './apiClient';

export const uploadApi = {
  uploadClothing: (fileUri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || 'photo.jpg',
      type: mimeType || 'image/jpeg',
    });
    return apiRequest('/upload/clothing', { method: 'POST', body: formData });
  },
  uploadAvatar: (fileUri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || 'avatar.jpg',
      type: mimeType || 'image/jpeg',
    });
    return apiRequest('/upload/avatar', { method: 'POST', body: formData });
  },
};
```

> **Lưu ý quan trọng:** Trên React Native, FormData append nhận object `{ uri, name, type }` thay vì File object như web.

#### `src/api/weatherApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const weatherApi = {
  createSnapshot: ({ lat, lon }) =>
    nodeApiRequest('/weather/snapshots', { method: 'POST', body: { lat, lon } }),
  latestSnapshot: () =>
    nodeApiRequest('/weather/snapshots/latest'),
};
```

#### `src/api/calendarApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const calendarApi = {
  status: () => nodeApiRequest('/calendar/status'),
  today: () => nodeApiRequest('/calendar/today'),
  connect: () => nodeApiRequest('/calendar/google/connect', { method: 'POST' }),
  disconnect: () => nodeApiRequest('/calendar/google/disconnect', { method: 'DELETE' }),
};
```

#### `src/api/dailyOutfitApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const dailyOutfitApi = {
  list: ({ page = 0, size = 12, from, to } = {}) =>
    nodeApiRequest('/daily-outfits', { query: { page, size, from, to } }),
  getToday: (date) =>
    nodeApiRequest('/daily-outfits/today', { query: { date } }),
  confirmToday: (payload) =>
    nodeApiRequest('/daily-outfits', { method: 'POST', body: payload }),
};
```

#### `src/api/suggestionApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const suggestionApi = {
  latestToday: () => nodeApiRequest('/suggestions/today/latest'),
  generateToday: () => nodeApiRequest('/suggestions/today', { method: 'POST' }),
  markConfirmed: (id, payload = {}) =>
    nodeApiRequest(`/suggestions/${id}/confirm`, { method: 'POST', body: payload }),
};
```

#### `src/api/trialApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const trialApi = {
  generate: ({ personImageUrl, personImageDataUrl, clothingItemId }) =>
    nodeApiRequest('/trial/generate', {
      method: 'POST',
      body: { personImageUrl, personImageDataUrl, clothingItemId },
    }),
  getStatus: (jobId) => nodeApiRequest(`/trial/${jobId}/status`),
  getHistory: ({ page = 0, size = 10, saved } = {}) =>
    nodeApiRequest('/trial/history', { query: { page, size, saved } }),
  setSaved: (jobId, saved = true) =>
    nodeApiRequest(`/trial/${jobId}/saved`, { method: 'PATCH', body: { saved } }),
  deleteHistory: (id) =>
    nodeApiRequest(`/trial/history/${id}`, { method: 'DELETE' }),
};
```

#### `src/api/subscriptionApi.js`

```javascript
import { apiRequest } from './apiClient';

export const subscriptionApi = {
  getPlans: () => apiRequest('/subscription/plans', { auth: false }),
  getMyPlan: () => apiRequest('/subscription/me'),
  upgrade: (planType) => apiRequest('/subscription/upgrade', { method: 'POST', body: { planType } }),
  cancel: () => apiRequest('/subscription/cancel', { method: 'POST' }),
};
```

#### `src/api/paymentApi.js`

```javascript
import { nodeApiRequest } from './nodeApiClient';

export const paymentApi = {
  createVnpayPayment: (planType) =>
    nodeApiRequest('/payments/vnpay/create', { method: 'POST', body: { planType } }),
};
```

---

## 7. Authentication & Token Management

### 7.1 Auth Context

Tạo `src/contexts/AuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router, useSegments } from 'expo-router';
import { getStoredUser, isAuthenticated, clearAuth, saveAuth } from '../api/tokenStore';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Kiểm tra auth state khi app khởi động
  useEffect(() => {
    async function checkAuth() {
      try {
        const authed = await isAuthenticated();
        if (authed) {
          const storedUser = await getStoredUser();
          setUser(storedUser);
        }
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Auth guard: redirect dựa trên auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Chưa đăng nhập, chuyển về login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Đã đăng nhập, chuyển về home
      router.replace('/(tabs)/home');
    }
  }, [user, segments, isLoading]);

  const signIn = useCallback(async ({ email, password, rememberMe }) => {
    const data = await authApi.login({ email, password, rememberMe });
    setUser(data.user);
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const data = await authApi.register({ email, password, fullName });
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (userData) => {
    setUser(userData);
    if (userData) {
      await saveAuth({ user: userData });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải dùng trong AuthProvider');
  return context;
}
```

---

## 8. Navigation & Routing

### 8.1 Root Layout

`app/_layout.jsx`:

```jsx
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### 8.2 Auth Group Layout

`app/(auth)/_layout.jsx`:

```jsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
```

### 8.3 Bottom Tab Layout

`app/(tabs)/_layout.jsx`:

```jsx
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Tủ đồ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="suggest"
        options={{
          title: 'Gợi ý',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="auto-awesome" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trial"
        options={{
          title: 'Thử đồ',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="camera-alt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 8.4 Sơ Đồ Navigation

```
Root (_layout.jsx — AuthProvider)
├── (auth)/                  ← Stack Navigator, không tab bar
│   ├── login
│   ├── register
│   ├── forgot-password
│   └── reset-password
└── (tabs)/                  ← Bottom Tab Navigator
    ├── home                 ← Tab 1: Trang chủ
    ├── wardrobe/            ← Tab 2: Tủ đồ (Stack bên trong)
    │   ├── index            ← Grid tủ đồ
    │   ├── [id]             ← Chi tiết item
    │   ├── add              ← Thêm item
    │   └── edit/[id]        ← Sửa item
    ├── suggest              ← Tab 3: Gợi ý hôm nay
    ├── trial                ← Tab 4: Thử đồ AI
    └── profile/             ← Tab 5: Cá nhân (Stack bên trong)
        ├── index            ← Profile chính
        ├── favorites        ← Yêu thích
        ├── wear-history     ← Lịch sử mặc
        └── premium          ← Nâng cấp gói
```

---

## 9. Danh Sách Màn Hình

### 9.1 Onboarding / Landing

**File:** `app/index.jsx`

**Mô tả:** Màn hình đầu tiên khi mở app. Kiểm tra auth state:
- Nếu đã đăng nhập → chuyển tới `/(tabs)/home`
- Nếu chưa → chuyển tới `/(auth)/login`

```jsx
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/(auth)/login" />;
}
```

**Tùy chọn mở rộng:** Nếu muốn có onboarding slides cho user mới lần đầu cài app, dùng `AsyncStorage` lưu flag `hasSeenOnboarding`, và hiện carousel giới thiệu tính năng trước khi vào login.

---

### 9.2 Login

**File:** `app/(auth)/login.jsx`

**API:** `POST CORE_API/auth/login` (auth: không)

**Request body:**
```json
{ "email": "string", "password": "string", "rememberMe": false }
```

**Response:** `AuthResponse` chứa `accessToken`, `refreshToken`, `expiresIn`, `user`.

**Layout mobile:**
- Logo Shelfy phía trên
- Input email (keyboard type: email-address)
- Input password (secureTextEntry)
- Switch "Ghi nhớ đăng nhập"
- Nút "Đăng nhập" (primary, full width)
- Link "Quên mật khẩu?" → navigate `/(auth)/forgot-password`
- Link "Chưa có tài khoản? Đăng ký" → navigate `/(auth)/register`

**Xử lý:**
```jsx
const { signIn } = useAuth();

async function handleLogin() {
  setLoading(true);
  setError('');
  try {
    await signIn({ email, password, rememberMe });
    // AuthProvider tự redirect về /(tabs)/home
  } catch (err) {
    setError(err.message || 'Đăng nhập thất bại');
  } finally {
    setLoading(false);
  }
}
```

---

### 9.3 Register

**File:** `app/(auth)/register.jsx`

**API:** `POST CORE_API/auth/register` (auth: không)

**Request body:**
```json
{ "email": "string", "password": "string", "fullName": "string" }
```

**Layout mobile:**
- Logo Shelfy
- Input họ tên
- Input email
- Input mật khẩu
- Input xác nhận mật khẩu (validate client-side)
- Nút "Đăng ký" (primary)
- Link "Đã có tài khoản? Đăng nhập" → navigate back

**Validation:**
- Email format
- Password tối thiểu 6 ký tự
- Confirm password phải khớp
- Họ tên không được trống

---

### 9.4 Forgot Password

**File:** `app/(auth)/forgot-password.jsx`

**API:** `POST CORE_API/auth/forgot-password` (auth: không)

**Request body:**
```json
{ "email": "string" }
```

**Layout:**
- Tiêu đề "Quên mật khẩu"
- Mô tả: "Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu"
- Input email
- Nút "Gửi link đặt lại"
- Link quay lại login

**Sau khi gửi thành công:** Hiển thị thông báo "Vui lòng kiểm tra email" với icon ✉️.

---

### 9.5 Reset Password

**File:** `app/(auth)/reset-password.jsx`

**API:** `POST CORE_API/auth/reset-password` (auth: không)

**Request body:**
```json
{ "token": "string", "newPassword": "string" }
```

**Mô tả:** Màn hình này được mở khi user click link reset password từ email. Trên mobile, cần xử lý deep link:

```json
// app.json
{
  "expo": {
    "scheme": "shelfy"
  }
}
```

Link reset password từ email sẽ có dạng: `shelfy://reset-password?token=xxx`

**Layout:**
- Input mật khẩu mới
- Input xác nhận mật khẩu mới
- Nút "Đặt lại mật khẩu"

---

### 9.6 Home (Trang Chủ)

**File:** `app/(tabs)/home.jsx`

**Đây là trang chính sau khi đăng nhập.** Gồm 3 khu vực chính:

#### Khu vực 1: Weather Card (Thời tiết)

**API:**
- `POST NODE_API/weather/snapshots` (body: `{ lat, lon }`) — tạo snapshot mới
- `GET NODE_API/weather/snapshots/latest` — lấy snapshot gần nhất

**Luồng:**
1. Dùng `expo-location` xin quyền vị trí
2. Lấy tọa độ hiện tại
3. Gọi `POST /weather/snapshots` với tọa độ
4. Hiển thị kết quả

**Layout component `WeatherCard`:**
```
┌──────────────────────────────┐
│ 📍 Hồ Chí Minh              │
│                              │
│        26°C                  │
│    ☀️ Trời quang              │
│   Cảm giác như 28°C          │
│                              │
│  Độ ẩm: 87%  Gió: 4.8km/h   │
│  Mây: 20%                   │
└──────────────────────────────┘
```

**Response shape (`WeatherSnapshotResponse`):**
```json
{
  "id": 1,
  "provider": "OPEN_METEO",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "location": "Hồ Chí Minh",
  "temperature": 26.1,
  "feelsLike": 28.3,
  "humidity": 87,
  "condition": "Trời quang",
  "icon": "light_mode",
  "cloudCover": 20,
  "windSpeed": 4.8,
  "isDay": false
}
```

#### Khu vực 2: Calendar Card (Lịch trình hôm nay)

**API:**
- `GET NODE_API/calendar/status` — kiểm tra đã kết nối Google Calendar chưa
- `POST NODE_API/calendar/google/connect` — lấy URL OAuth để kết nối
- `GET NODE_API/calendar/today` — lấy lịch trình hôm nay

**Luồng kết nối Google Calendar trên mobile:**
1. Gọi `POST /calendar/google/connect`
2. Nhận `authorizationUrl`
3. Mở bằng `expo-web-browser`:
   ```javascript
   import * as WebBrowser from 'expo-web-browser';
   const result = await WebBrowser.openAuthSessionAsync(
     authorizationUrl,
     'shelfy://calendar-callback'  // redirect URI
   );
   ```
4. Sau callback, gọi lại `GET /calendar/today` để lấy dữ liệu

> **Lưu ý:** Cần cập nhật `GOOGLE_CALENDAR_REDIRECT_URI` trong Nodejs service để hỗ trợ mobile redirect scheme.

**Layout component `CalendarCard`:**
```
Chưa kết nối:
┌──────────────────────────────┐
│ 📅 Lịch trình hôm nay       │
│                              │
│  Chưa kết nối Google Calendar│
│                              │
│  [Kết nối Google Calendar]   │
└──────────────────────────────┘

Đã kết nối:
┌──────────────────────────────┐
│ 📅 Lịch trình hôm nay       │
│ user@gmail.com               │
│                              │
│ 09:00-10:00  Meeting         │
│              📍 Office       │
│ 14:00-15:00  Design Review   │
│                              │
│ [Mở Google Calendar]         │
└──────────────────────────────┘
```

#### Khu vực 3: Today Outfit Panel (Outfit hôm nay)

**API:**
- `GET NODE_API/daily-outfits/today` — outfit đã xác nhận hôm nay
- `GET NODE_API/trial/history?page=0&size=1&saved=true` — ảnh try-on mới nhất đã lưu

**Layout:**
```
┌──────────────────────────────┐
│ 👕 Outfit hôm nay            │
│                              │
│  Nếu chưa có:               │
│  "Bạn chưa chọn outfit"     │
│  [Chọn từ tủ đồ]            │
│  [Xem gợi ý hôm nay]        │
│                              │
│  Nếu đã có:                 │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │ 👕 │ │ 👖 │ │ 👟 │       │
│  └────┘ └────┘ └────┘       │
│  Outfit hôm nay - 22/09     │
│  3 món đồ                   │
│  [Đổi outfit]               │
└──────────────────────────────┘
```

**Xử lý vị trí (Location):**

Tạo `src/utils/geolocation.js`:

```javascript
import * as Location from 'expo-location';

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Cần cấp quyền vị trí để lấy thời tiết');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: location.coords.latitude,
    lon: location.coords.longitude,
  };
}
```

---

### 9.7 Wardrobe (Tủ Đồ)

**File:** `app/(tabs)/wardrobe/index.jsx`

**API:**
- `GET CORE_API/wardrobe/items?category=&season=&color=&q=&page=0&size=20` — danh sách món đồ (phân trang)
- `GET CORE_API/wardrobe/stats` — thống kê tủ đồ
- `GET NODE_API/wardrobe/preferences?itemIds=1,2,3` — preference (yêu thích, trạng thái)

**Layout:**

```
┌──────────────────────────────┐
│ 🔍 Tìm kiếm trang phục...   │
│                              │
│ [Tất cả] [Áo] [Quần] [Váy]  │  ← FilterChips (category)
│ [Mùa ▾] [Màu ▾]             │  ← Dropdown filters
│                              │
│ Tổng: 128 món | Đã mặc: 45  │  ← Stats bar
│                              │
│ ┌────────┐ ┌────────┐       │
│ │  📷    │ │  📷    │       │  ← 2-column grid
│ │ Áo thun│ │ Quần   │       │
│ │ Size M │ │ jean   │       │
│ │ ❤️     │ │        │       │
│ └────────┘ └────────┘       │
│ ┌────────┐ ┌────────┐       │
│ │  ...   │ │  ...   │       │
│ └────────┘ └────────┘       │
│                              │
│         [+ Thêm đồ]         │  ← FAB button
└──────────────────────────────┘
```

**Xử lý:**
1. Khi mount, gọi `wardrobeApi.getItems()` và `wardrobeApi.getStats()`
2. Từ kết quả items, thu thập tất cả `id` rồi gọi `wardrobePreferenceApi.getPreferences(ids)` để merge `favorite` và `itemStatus` vào mỗi card
3. Infinite scroll: khi user cuộn gần cuối, gọi thêm page tiếp theo
4. Pull-to-refresh để reload
5. Nhấn vào card → navigate tới `/(tabs)/wardrobe/[id]`
6. FAB "+" → navigate tới `/(tabs)/wardrobe/add`

**Wardrobe Card component:**

```jsx
function WardrobeCard({ item, onPress }) {
  return (
    <Pressable onPress={() => onPress(item.id)} style={styles.card}>
      <Image source={{ uri: item.thumbnailUrl || item.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.brand}>{item.brand || 'Khác'}</Text>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>Size: {item.size || '-'} | {item.material || '-'}</Text>
      </View>
      {item.favorite && (
        <View style={styles.favBadge}>
          <MaterialIcons name="favorite" size={16} color="#ef4444" />
        </View>
      )}
    </Pressable>
  );
}
```

**Categories để filter:**
```
TOP, BOTTOM, DRESS, SHOES, BAG, ACCESSORY, OUTERWEAR, OTHER
```

Hiển thị tiếng Việt:
```javascript
const CATEGORY_LABELS = {
  TOP: 'Áo',
  BOTTOM: 'Quần',
  DRESS: 'Váy',
  SHOES: 'Giày',
  BAG: 'Túi',
  ACCESSORY: 'Phụ kiện',
  OUTERWEAR: 'Áo khoác',
  OTHER: 'Khác',
};
```

---

### 9.8 Wardrobe Item Detail

**File:** `app/(tabs)/wardrobe/[id].jsx`

**API:**
- `GET CORE_API/wardrobe/items/{id}` — chi tiết món đồ
- `GET CORE_API/wardrobe/items/{id}/pairings` — gợi ý phối đồ
- `PUT NODE_API/wardrobe/items/{id}/preferences` — cập nhật yêu thích/trạng thái
- `DELETE CORE_API/wardrobe/items/{id}` — xóa món đồ
- `PATCH CORE_API/wardrobe/items/{id}/wear` — đánh dấu đã mặc

**Layout:**

```
┌──────────────────────────────┐
│ ← Quay lại          ⋮ Menu  │
│                              │
│ ┌────────────────────────┐   │
│ │                        │   │
│ │    📷 Ảnh lớn item     │   │  ← Full width image
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ Áo thun trắng           ❤️  │  ← Tên + nút yêu thích
│ Brand: Uniqlo                │
│                              │
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ TOP  │ │ M    │ │Cotton│  │  ← Chips: category, size, material
│ └──────┘ └──────┘ └──────┘  │
│                              │
│ Màu sắc: ⬜ Trắng           │
│ Mùa:     Bốn mùa            │
│ Họa tiết: Trơn               │
│ Số lần mặc: 12              │
│ Lần mặc gần nhất: 15/09     │
│ Ngày thêm: 21/07/2026       │
│                              │
│ Trạng thái: [Đang dùng ▾]   │  ← Dropdown đổi status
│                              │
│ ── Thông tin mua sắm ──     │
│ Giá: 350.000đ               │
│ Ngày mua: 10/06/2026        │
│                              │
│ [Chọn mặc hôm nay]          │  ← Primary action
│ [Sửa]  [Xóa]                │  ← Secondary actions
└──────────────────────────────┘
```

**ClothingItemResponse đầy đủ:**
```json
{
  "id": 1,
  "name": "Áo thun trắng",
  "brand": "Khác",
  "category": "TOP",
  "subCategory": null,
  "color": "Trắng",
  "colorHex": "#ffffff",
  "season": "Bốn mùa",
  "pattern": "Trơn",
  "size": "M",
  "material": "Cotton",
  "imageUrl": "https://...",
  "thumbnailUrl": "https://...",
  "backgroundRemovedUrl": null,
  "tags": [],
  "wearCount": 0,
  "lastWornAt": null,
  "purchasePrice": null,
  "purchaseDate": null,
  "sourceUrl": null,
  "favorite": false,
  "createdAt": "2026-07-21T00:00:00"
}
```

**Actions:**

| Hành động | API | Ghi chú |
|---|---|---|
| Yêu thích | `PUT NODE_API/wardrobe/items/{id}/preferences` body: `{ favorite: true }` | Toggle |
| Đổi trạng thái | `PUT NODE_API/wardrobe/items/{id}/preferences` body: `{ status: "TO_SELL" }` | 4 giá trị: `IN_USE`, `RARELY_USED`, `STORED`, `TO_SELL` |
| Sửa | Navigate → `/(tabs)/wardrobe/edit/[id]` | |
| Xóa | `DELETE CORE_API/wardrobe/items/{id}` | Hiển thị dialog xác nhận trước |
| Chọn mặc hôm nay | `POST NODE_API/daily-outfits` body: `{ itemIds: [id], wornDate, name, occasion }` | |

---

### 9.9 Add / Edit Wardrobe Item

**File thêm:** `app/(tabs)/wardrobe/add.jsx`
**File sửa:** `app/(tabs)/wardrobe/edit/[id].jsx`

**API thêm:**
1. `POST CORE_API/upload/clothing` (multipart form-data) → `ImageUploadResult`
2. `POST CORE_API/wardrobe/items` (JSON body) → `ClothingItemResponse`

**API sửa:**
1. `PUT CORE_API/wardrobe/items/{id}` (JSON body) → `ClothingItemResponse`

**Luồng thêm món đồ:**
1. User chọn ảnh từ thư viện hoặc chụp camera
2. Upload ảnh lên Cloudinary qua `uploadApi.uploadClothing()`
3. Nhận `ImageUploadResult` chứa `originalUrl`, `thumbnailUrl`
4. User điền form metadata
5. Gọi `wardrobeApi.createItem()` với payload

**Upload ảnh trên mobile:**
```javascript
import * as ImagePicker from 'expo-image-picker';

async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    return uploadApi.uploadClothing(
      asset.uri,
      asset.fileName || 'photo.jpg',
      asset.mimeType || 'image/jpeg'
    );
  }
}

async function takePhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Cần quyền camera');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    return uploadApi.uploadClothing(asset.uri, 'photo.jpg', 'image/jpeg');
  }
}
```

**Form fields:**

| Field | Type | Required | Options |
|---|---|---|---|
| name | Text input | Có | |
| brand | Text input | Không | |
| category | Picker/Dropdown | Có | `TOP`, `BOTTOM`, `DRESS`, `SHOES`, `BAG`, `ACCESSORY`, `OUTERWEAR`, `OTHER` |
| color | Text input | Không | |
| colorHex | Color picker | Không | |
| season | Picker | Không | Xuân, Hạ, Thu, Đông, Bốn mùa |
| pattern | Text input | Không | Trơn, Kẻ sọc, Hoa, Chấm bi, v.v. |
| size | Picker | Không | XS, S, M, L, XL, XXL |
| material | Text input | Không | Cotton, Polyester, Lụa, Jean, v.v. |
| tags | Tag input | Không | Mảng string |
| purchasePrice | Number input | Không | |
| purchaseDate | Date picker | Không | |
| sourceUrl | Text input | Không | URL mua |

**Layout form:**

```
┌──────────────────────────────┐
│ ← Quay lại    Thêm đồ mới   │
│                              │
│ ┌────────────────────────┐   │
│ │                        │   │
│ │   📷 Chọn / Chụp ảnh  │   │  ← Vùng upload, tappable
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ Tên món đồ *                 │
│ [________________________]   │
│                              │
│ Thương hiệu                 │
│ [________________________]   │
│                              │
│ Phân loại *                  │
│ [Áo ▾]                      │
│                              │
│ Màu sắc        Kích cỡ      │
│ [Trắng   ]     [M ▾]        │
│                              │
│ Chất liệu      Mùa         │
│ [Cotton  ]     [Bốn mùa ▾]  │
│                              │
│ Họa tiết                     │
│ [Trơn          ]             │
│                              │
│ ── Thông tin mua (tùy) ──   │
│ Giá mua         Ngày mua    │
│ [_________]     [__/__/____] │
│                              │
│    [Lưu món đồ]             │
└──────────────────────────────┘
```

---

### 9.10 Favorites (Yêu Thích)

**File:** `app/(tabs)/profile/favorites.jsx`

**API:**
- `GET CORE_API/wardrobe/items` — lấy tất cả items
- `GET NODE_API/wardrobe/preferences?itemIds=...` — merge favorite
- `PUT NODE_API/wardrobe/items/{id}/preferences` — bỏ yêu thích

**Luồng:**
1. Lấy wardrobe items từ Core API
2. Lấy preferences từ Nodejs
3. Lọc client-side: chỉ hiển thị item có `favorite === true`
4. Hiển thị dưới dạng grid giống wardrobe
5. Swipe-to-action hoặc nhấn giữ: bỏ yêu thích
6. Nhấn vào card: navigate tới chi tiết item

**Layout:** Grid 2 cột tương tự Wardrobe nhưng có thể lọc theo trạng thái item.

---

### 9.11 Wear History (Lịch Sử Mặc)

**File:** `app/(tabs)/profile/wear-history.jsx`

**API:**
- `GET NODE_API/daily-outfits?page=0&size=12&from=&to=` — lịch sử outfit phân trang

**Response shape:**
```json
{
  "content": [
    {
      "id": 1,
      "confirmed": true,
      "wornDate": "2026-07-22",
      "confirmedAt": "2026-07-22T08:00:00.000Z",
      "outfit": {
        "id": 10,
        "name": "Outfit hôm nay - 22/07/2026",
        "itemIds": [1, 2, 3],
        "items": [
          { "id": 1, "name": "Áo thun", "imageUrl": "...", "category": "TOP" }
        ]
      }
    }
  ],
  "page": 0,
  "size": 12,
  "totalElements": 5,
  "totalPages": 1
}
```

**Layout:**

```
┌──────────────────────────────┐
│ ← Quay lại     Lịch sử mặc  │
│                              │
│ [Từ ngày ▾]  [Đến ngày ▾]   │  ← Date range filter
│                              │
│ ── 22/09/2026 ──             │
│ ┌──────────────────────────┐ │
│ │ Outfit hôm nay - 22/09   │ │
│ │ ┌──┐ ┌──┐ ┌──┐           │ │  ← Row of item thumbnails
│ │ │👕│ │👖│ │👟│           │ │
│ │ └──┘ └──┘ └──┘           │ │
│ │ 3 món đồ                 │ │
│ └──────────────────────────┘ │
│                              │
│ ── 21/09/2026 ──             │
│ ┌──────────────────────────┐ │
│ │ ...                      │ │
│ └──────────────────────────┘ │
│                              │
│       [Tải thêm...]         │  ← Infinite scroll
└──────────────────────────────┘
```

---

### 9.12 Suggest (Gợi Ý Hôm Nay)

**File:** `app/(tabs)/suggest.jsx`

**API:**
- `GET NODE_API/suggestions/today/latest` — gợi ý mới nhất hôm nay
- `POST NODE_API/suggestions/today` — tạo gợi ý mới (rule-based)
- `POST NODE_API/suggestions/{id}/confirm` — đánh dấu gợi ý đã xác nhận
- `POST NODE_API/weather/snapshots` — tạo weather snapshot (cần cho suggestion)
- `POST NODE_API/daily-outfits` — xác nhận outfit mặc hôm nay

**Luồng:**
1. Vào màn hình: gọi `suggestionApi.latestToday()`
2. Nếu chưa có gợi ý: hiển thị nút "Tạo gợi ý"
3. Khi user bấm "Tạo gợi ý":
   - Tạo weather snapshot từ vị trí hiện tại
   - Gọi `suggestionApi.generateToday()`
4. Hiển thị kết quả gợi ý
5. User bấm "Xác nhận mặc hôm nay":
   - Gọi `dailyOutfitApi.confirmToday()` với `itemIds` từ suggestion
   - Gọi `suggestionApi.markConfirmed(id, { dailyOutfitId })`

**Lỗi nghiệp vụ:**
- `WARDROBE_CONTEXT_EMPTY`: user chưa có món đồ trong tủ → hiển thị empty state kèm nút "Thêm đồ vào tủ"

**Layout:**

```
┌──────────────────────────────┐
│        Gợi ý hôm nay        │
│                              │
│ 📍 Hồ Chí Minh, 32°C        │  ← Weather context
│ ☀️ Trời nắng                 │
│                              │
│ ── Trước khi có gợi ý ──    │
│                              │
│  ✨ Shelfy sẽ phân tích tủ   │
│  đồ, thời tiết và lịch      │
│  trình để chọn outfit phù   │
│  hợp nhất cho bạn hôm nay.  │
│                              │
│  [🎨 Tạo gợi ý mới]         │
│                              │
│ ── Sau khi có gợi ý ──      │
│                              │
│ "Outfit thanh lịch cho       │
│  ngày nắng đẹp"              │
│ Độ tin cậy: 85%              │
│                              │
│ ┌────┐ ┌────┐ ┌────┐        │
│ │ 👕 │ │ 👖 │ │ 👟 │        │  ← Item images carousel
│ │Áo  │ │Quần│ │Giày│        │
│ └────┘ └────┘ └────┘        │
│                              │
│ 💡 Tips: Mang thêm nón vì   │
│    chỉ số UV cao hôm nay.   │
│                              │
│ [✅ Xác nhận mặc hôm nay]   │
│ [🔄 Tạo gợi ý khác]         │
└──────────────────────────────┘
```

---

### 9.13 Trial / AI Try-On (Thử Đồ Ảo)

**File:** `app/(tabs)/trial.jsx`

**API:**
- `POST NODE_API/trial/generate` — tạo job try-on
- `GET NODE_API/trial/{jobId}/status` — kiểm tra trạng thái job
- `GET NODE_API/trial/history` — lịch sử try-on
- `PATCH NODE_API/trial/{jobId}/saved` — lưu/bỏ lưu kết quả
- `DELETE NODE_API/trial/history/{id}` — xóa lịch sử

**Luồng try-on:**
1. User chọn/chụp ảnh chân dung → `personImageDataUrl` (base64) hoặc `personImageUrl`
2. User chọn món đồ từ tủ → `clothingItemId`
3. Gọi `trialApi.generate({ personImageDataUrl, clothingItemId })`
4. Nhận `jobId` và `status: "PENDING"`
5. Poll `trialApi.getStatus(jobId)` mỗi 3 giây
6. Khi `status === "DONE"` → hiển thị `resultImageUrl`

**Request body:**
```json
{
  "personImageUrl": "https://... (hoặc null)",
  "personImageDataUrl": "data:image/jpeg;base64,... (hoặc null)",
  "clothingItemId": 1
}
```

**Response khi DONE:**
```json
{
  "jobId": 1,
  "status": "DONE",
  "resultImageUrl": "https://...",
  "processingTimeMs": 4200,
  "accuracy": "98.4%",
  "createdAt": "2026-07-21T00:00:00"
}
```

**Layout:**

```
┌──────────────────────────────┐
│           Thử đồ ảo         │
│                              │
│  ┌───────────┐ ┌──────────┐ │
│  │           │ │          │ │
│  │  📷 Ảnh  │ │ 👕 Chọn  │ │
│  │ chân dung│ │ trang    │ │
│  │          │ │ phục     │ │
│  └───────────┘ └──────────┘ │
│                              │
│  [📸 Chụp ảnh] [🖼 Thư viện]│
│  [👕 Chọn từ tủ đồ]         │
│                              │
│  [🪄 Bắt đầu thử đồ]       │
│                              │
│ ── Kết quả ──               │
│ ┌────────────────────────┐   │
│ │                        │   │
│ │   📷 Ảnh kết quả      │   │
│ │   try-on AI            │   │
│ │                        │   │
│ └────────────────────────┘   │
│ ⏱ 4.2s | 📊 98.4%          │
│ [💾 Lưu] [📤 Chia sẻ]      │
│                              │
│ ── Lịch sử thử đồ ──       │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │  ← Horizontal scroll
│ └──┘ └──┘ └──┘ └──┘        │
└──────────────────────────────┘
```

**Lưu ý:**
- Hiển thị loading animation khi đang xử lý (progress indicator + skeleton)
- Quota try-on: user FREE có 5 lượt/ngày → hiển thị `tryOnCountToday / tryOnLimit` từ user profile

---

### 9.14 Profile (Hồ Sơ Cá Nhân)

**File:** `app/(tabs)/profile/index.jsx`

**API:**
- `GET CORE_API/users/me` — lấy profile
- `PUT CORE_API/users/me` — cập nhật profile (fullName, avatarUrl)
- `PUT CORE_API/users/me/password` — đổi mật khẩu
- `POST CORE_API/upload/avatar` — upload ảnh avatar
- `GET CORE_API/wardrobe/stats` — stats tủ đồ
- `GET CORE_API/subscription/me` — gói hiện tại

**UserProfileResponse:**
```json
{
  "id": 1,
  "publicId": "uuid",
  "email": "user@example.com",
  "fullName": "User Name",
  "avatarUrl": null,
  "status": "ACTIVE",
  "plan": "FREE",
  "planExpiresAt": null,
  "storageUsed": 0,
  "storageLimit": 100,
  "tryOnCountToday": 0,
  "tryOnLimit": 5
}
```

**Layout:**

```
┌──────────────────────────────┐
│          Cá nhân             │
│                              │
│        ┌────────┐            │
│        │  👤    │            │  ← Avatar (tappable để đổi)
│        │ Avatar │            │
│        └────────┘            │
│     Duong Minh Kiet          │
│     user@example.com         │
│     Gói FREE                 │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📊 Thống kê              │ │
│ │ Tủ đồ: 128 món           │ │
│ │ Lưu trữ: 128/100         │ │
│ │ Thử đồ hôm nay: 2/5     │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ❤️ Yêu thích          →  │ │  ← Navigate favorites
│ │ 📅 Lịch sử mặc        →  │ │  ← Navigate wear-history
│ │ ⭐ Nâng cấp Premium   →  │ │  ← Navigate premium
│ │ 📅 Google Calendar     →  │ │  ← Connect/disconnect
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ✏️ Đổi tên hiển thị      │ │
│ │ 🔒 Đổi mật khẩu          │ │
│ └──────────────────────────┘ │
│                              │
│     [🚪 Đăng xuất]          │
└──────────────────────────────┘
```

**Đổi avatar:**
```javascript
async function changeAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const uploadResult = await uploadApi.uploadAvatar(asset.uri, 'avatar.jpg', 'image/jpeg');
    // Update profile với avatarUrl mới
    await userApi.updateMe({ avatarUrl: uploadResult.originalUrl });
  }
}
```

**Đổi mật khẩu (Modal/Sheet):**
- Input mật khẩu cũ
- Input mật khẩu mới
- Input xác nhận mật khẩu mới
- API: `PUT /users/me/password` body: `{ currentPassword, newPassword }`

---

### 9.15 Premium (Nâng Cấp Gói)

**File:** `app/(tabs)/profile/premium.jsx`

**API:**
- `GET CORE_API/subscription/plans` (auth: không) — danh sách gói
- `GET CORE_API/subscription/me` — gói hiện tại
- `POST NODE_API/payments/vnpay/create` body: `{ planType }` — tạo URL thanh toán VNPay

**Luồng thanh toán:**
1. Hiển thị danh sách gói: FREE, PRO, PREMIUM
2. User chọn gói → gọi `paymentApi.createVnpayPayment(planType)`
3. Nhận `{ paymentUrl, transactionCode }`
4. Mở `paymentUrl` bằng `expo-web-browser`:
   ```javascript
   await WebBrowser.openBrowserAsync(paymentUrl);
   ```
5. Sau khi thanh toán, VNPay redirect callback → backend xử lý

**Layout:**

```
┌──────────────────────────────┐
│ ← Quay lại    Nâng cấp gói  │
│                              │
│    ✨ Trải nghiệm Shelfy     │
│    không giới hạn            │
│                              │
│ ┌──────────────────────────┐ │
│ │ Gói Cơ Bản (FREE)       │ │
│ │ Miễn phí                 │ │
│ │ • Thử đồ: 5 lượt/ngày   │ │
│ │ • Lưu trữ: 100 món      │ │
│ │ [Đang sử dụng]           │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ⭐ Gói PRO          HOT  │ │  ← Badge "Phổ biến nhất"
│ │ 99.000đ/tháng            │ │
│ │ • Thử đồ: 100 lượt/tháng│ │
│ │ • Lưu trữ không giới hạn│ │
│ │ [Nâng cấp PRO]           │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 💎 Gói PREMIUM           │ │
│ │ 799.000đ/năm             │ │
│ │ • Mọi tính năng PRO      │ │
│ │ • Tiết kiệm 33%          │ │
│ │ [Nâng cấp PREMIUM]       │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

> **Lưu ý:** Module payment chưa chốt flow production. Có thể ẩn nút thanh toán thật và hiển thị "Sắp ra mắt" nếu chưa sẵn sàng.

---

## 10. Xử Lý Đặc Thù Mobile

### 10.1 Upload ảnh khác Web

Web dùng `File` object, React Native dùng `{ uri, name, type }`:

```javascript
// ✅ React Native
const formData = new FormData();
formData.append('file', {
  uri: 'file:///path/to/image.jpg',  // URI từ ImagePicker
  name: 'photo.jpg',
  type: 'image/jpeg',
});
```

### 10.2 Token Storage

| Platform | Web | Mobile |
|---|---|---|
| Lưu token | `localStorage` | `expo-secure-store` |
| Đặc điểm | Synchronous | **Asynchronous** (tất cả hàm trả Promise) |

### 10.3 OAuth / WebBrowser

Google Calendar OAuth và VNPay payment cần mở trình duyệt:

```javascript
import * as WebBrowser from 'expo-web-browser';

// OAuth (có redirect về app)
const result = await WebBrowser.openAuthSessionAsync(
  authorizationUrl,
  'shelfy://callback'
);

// Payment (chỉ mở browser)
await WebBrowser.openBrowserAsync(paymentUrl);
```

### 10.4 Location

```javascript
import * as Location from 'expo-location';

// Xin quyền
const { status } = await Location.requestForegroundPermissionsAsync();

// Lấy vị trí
const location = await Location.getCurrentPositionAsync({});
const { latitude, longitude } = location.coords;
```

### 10.5 Navigation thay cho `window.location`

| Web | Mobile |
|---|---|
| `window.location.hash = '#/home'` | `router.push('/(tabs)/home')` |
| `window.location.href = url` | `WebBrowser.openBrowserAsync(url)` |
| `window.history.back()` | `router.back()` |
| `window.alert(msg)` | `Alert.alert('Thông báo', msg)` |

### 10.6 Pull-to-Refresh

```jsx
import { FlatList, RefreshControl } from 'react-native';

<FlatList
  data={items}
  renderItem={renderItem}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
    />
  }
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

### 10.7 Keyboard Handling

```jsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* Form content */}
</KeyboardAvoidingView>
```

### 10.8 Deep Linking

Cấu hình trong `app.json` cho reset password link:

```json
{
  "expo": {
    "scheme": "shelfy",
    "plugins": [
      ["expo-router", {
        "origin": "https://shelfy.app"
      }]
    ]
  }
}
```

---

## 11. Testing & Chạy Thử

### 11.1 Chạy Dev Server

```bash
cd Mobile/Shelfy
npx expo start
```

- Nhấn `a` để mở Android emulator
- Nhấn `i` để mở iOS simulator
- Quét QR code bằng Expo Go trên thiết bị thật

### 11.2 Môi Trường Local

Đảm bảo Core API Service và Nodejs Service đang chạy:

```bash
# Terminal 1: Core API Service (Java)
cd BE/Shelfy
.\run-local.ps1        # Chạy trên port 8080

# Terminal 2: Nodejs Service
cd Nodejs
.\run-local.ps1        # Chạy trên port 3000
```

Cập nhật `.env` của mobile:

```env
# Nếu test trên thiết bị thật, dùng IP local thay localhost
EXPO_PUBLIC_CORE_API_URL=http://192.168.x.x:8080/api
EXPO_PUBLIC_NODE_API_URL=http://192.168.x.x:3000/api
```

> **Lưu ý:** Emulator Android dùng `10.0.2.2` thay cho `localhost`.

### 11.3 Lint & Type Check

```bash
npx expo lint
npx tsc --noEmit           # Nếu dùng TypeScript
npx expo-doctor            # Kiểm tra dependency
```

### 11.4 Build Production

```bash
# Cài EAS CLI
npm install -g eas-cli

# Đăng nhập Expo
eas login

# Build cho Android
eas build --platform android --profile preview

# Build cho iOS
eas build --platform ios --profile preview
```

---

## Bảng Tổng Hợp API Theo Màn Hình

| Màn hình | API Service | Endpoints | Auth |
|---|---|---|---|
| **Login** | Core | `POST /auth/login` | Không |
| **Register** | Core | `POST /auth/register` | Không |
| **Forgot Password** | Core | `POST /auth/forgot-password` | Không |
| **Reset Password** | Core | `POST /auth/reset-password` | Không |
| **Home** | Core + Node | `GET /users/me`, `POST /weather/snapshots`, `GET /calendar/today`, `GET /daily-outfits/today` | Có |
| **Wardrobe** | Core + Node | `GET /wardrobe/items`, `GET /wardrobe/stats`, `GET /wardrobe/preferences` | Có |
| **Item Detail** | Core + Node | `GET /wardrobe/items/{id}`, `PUT /wardrobe/items/{id}/preferences`, `DELETE /wardrobe/items/{id}` | Có |
| **Add Item** | Core | `POST /upload/clothing`, `POST /wardrobe/items` | Có |
| **Edit Item** | Core | `PUT /wardrobe/items/{id}` | Có |
| **Favorites** | Core + Node | `GET /wardrobe/items`, `GET /wardrobe/preferences` | Có |
| **Wear History** | Node | `GET /daily-outfits` | Có |
| **Suggest** | Node | `GET /suggestions/today/latest`, `POST /suggestions/today`, `POST /suggestions/{id}/confirm`, `POST /daily-outfits` | Có |
| **Trial** | Node | `POST /trial/generate`, `GET /trial/{jobId}/status`, `GET /trial/history` | Có |
| **Profile** | Core | `GET /users/me`, `PUT /users/me`, `PUT /users/me/password`, `POST /upload/avatar`, `GET /wardrobe/stats` | Có |
| **Premium** | Core + Node | `GET /subscription/plans`, `GET /subscription/me`, `POST /payments/vnpay/create` | Có/Không |

---

## Thứ Tự Triển Khai Đề Xuất

| Giai đoạn | Screens | Ước lượng |
|---|---|---|
| **Phase 1: Nền tảng** | Project setup, Design system, API layer, Auth (Login/Register), Root layout | 3-4 ngày |
| **Phase 2: Core** | Home (Weather + Calendar + Today Outfit), Wardrobe (Grid + Detail + Add/Edit) | 5-7 ngày |
| **Phase 3: Engagement** | Suggest, Favorites, Wear History | 3-4 ngày |
| **Phase 4: Premium** | Trial/AI Try-On, Profile, Premium/Payment | 3-4 ngày |
| **Phase 5: Polish** | Animations, Error states, Empty states, Skeleton loading, Pull-to-refresh, Accessibility | 2-3 ngày |

**Tổng ước lượng: 16-22 ngày** cho một developer.

---

## Lưu Ý Quan Trọng

1. **Không tạo API mới.** Backend đã đủ endpoint — chỉ cần gọi đúng.
2. **Token luôn async.** Mọi hàm trong `tokenStore.js` trả Promise vì dùng `expo-secure-store`.
3. **Upload ảnh khác web.** Dùng `{ uri, name, type }` thay vì `File`.
4. **Không dùng `window`** — thay bằng API tương ứng của React Native / Expo.
5. **Test trên thiết bị thật** càng sớm càng tốt — emulator không hoàn toàn phản ánh UX thật.
6. **CORS không ảnh hưởng mobile** — React Native fetch không bị CORS policy. Tuy nhiên cần đảm bảo Nodejs CORS config cho phép origin từ mobile nếu có custom headers.
7. **Google Calendar OAuth redirect URI** cần thêm scheme `shelfy://` trong Google Cloud Console và Nodejs `.env`.
