module.exports = ({ config }) => {
  if (['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE)) {
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
      ['expo-calendar', {
        calendarPermission: 'Cho phép Shelfy đọc lịch để gợi ý trang phục phù hợp với sự kiện trong ngày.',
      }],
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
      package: 'com.shelfy.app',
      googleServicesFile: './google-services.json',
      permissions: [
        ...(config.android?.permissions || []),
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
      ],
      intentFilters: [...(config.android?.intentFilters || []), intentFilter],
    },
  };
};
