export function resolveFirebaseConfig(environment) {
  const projectId = environment.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = environment.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  const apiKey = environment.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const isUsingEmulator = environment.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  const missing = [];

  if (!projectId) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  if (!apiKey && !isUsingEmulator) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Thiếu cấu hình Firebase: ${missing.join(', ')}. Sao chép .env.example và điền giá trị phù hợp.`);
  }

  return {
    apiKey: apiKey || 'demo-api-key',
    authDomain: environment.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    projectId,
    appId,
  };
}

export function resolveEmulatorHost(environment, platform) {
  const configuredHost = environment.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (configuredHost) return configuredHost;
  return platform === 'android' ? '10.0.2.2' : '127.0.0.1';
}
