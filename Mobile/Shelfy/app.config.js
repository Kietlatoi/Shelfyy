module.exports = ({ config }) => {
  const isGooglePlay = process.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'GOOGLE_PLAY';
  const usesRegisteredPackage = isGooglePlay || process.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'APKPURE';
  if (['preview', 'production', 'apkpure'].includes(process.env.EAS_BUILD_PROFILE)) {
    require('./scripts/check-build-env.cjs').checkBuildEnvironment(process.env);
  }
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'demo-shelfy';
  const configuredLinkDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN?.trim();
  const linkDomain = configuredLinkDomain
    ? configuredLinkDomain.replace(/^https?:\/\//, '').split('/')[0]
    : `${projectId}.firebaseapp.com`;
  const intentFilter = {
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host: linkDomain, pathPrefix: '/__/auth/links' }],
    category: ['BROWSABLE', 'DEFAULT'],
  };

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ...(isGooglePlay ? [['expo-iap', { android: { store: 'play' } }]] : []),
      ['expo-location', {
        locationWhenInUsePermission: 'Cho phép Shelfy dùng vị trí để lấy thời tiết tại nơi bạn đang ở.',
      }],
      ['expo-image-picker', {
        photosPermission: 'Cho phép Shelfy chọn ảnh trang phục và ảnh đại diện từ thư viện.',
        cameraPermission: 'Cho phép Shelfy chụp ảnh trang phục.',
        microphonePermission: false,
      }],
      'expo-web-browser',
    ],
    android: {
      ...config.android,
      package: usesRegisteredPackage ? 'com.duongminhkiet.shelfy' : 'com.shelfy.app',
      googleServicesFile: usesRegisteredPackage ? './google-services.play.json' : './google-services.json',
      permissions: [
        ...(config.android?.permissions || []),
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.CAMERA',
      ],
      blockedPermissions: [
        ...(config.android?.blockedPermissions || []),
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
      ],
      intentFilters: [...(config.android?.intentFilters || []), intentFilter],
    },
  };
};
