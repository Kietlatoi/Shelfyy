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
    android: {
      ...config.android,
      package: 'com.shelfy.app',
      intentFilters: [...(config.android?.intentFilters || []), intentFilter],
    },
  };
};
