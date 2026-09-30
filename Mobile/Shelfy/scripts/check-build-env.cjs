function checkBuildEnvironment(env) {
  const keys = [
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_EDGE_API_URL',
  ];
  const missing = keys.filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Thiếu cấu hình EAS: ${missing.join(', ')}. Đặt trong environment preview/production trước khi build.`);
  if (env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR !== 'false' || env.EXPO_PUBLIC_FIREBASE_PROJECT_ID.startsWith('demo-')
    || env.EXPO_PUBLIC_FIREBASE_API_KEY.startsWith('demo-')) {
    throw new Error('APK phát hành phải dùng Firebase project thật và EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false.');
  }
  if (!env.EXPO_PUBLIC_EDGE_API_URL.startsWith('https://')
    || env.EXPO_PUBLIC_EDGE_API_URL.includes('your-subdomain')) {
    throw new Error('EXPO_PUBLIC_EDGE_API_URL phải là URL HTTPS thật của Cloudflare Worker.');
  }
}
if (require.main === module) checkBuildEnvironment(process.env);
module.exports = { checkBuildEnvironment };
