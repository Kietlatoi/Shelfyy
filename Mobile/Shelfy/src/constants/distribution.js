// Release profiles set this at build time; a file extension does not identify its store.
export const isGooglePlayBuild = process.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'GOOGLE_PLAY';

export function requireDirectPayments() {
  if (isGooglePlayBuild) {
    throw new Error('Thanh toán PayOS không được hỗ trợ trong bản Google Play.');
  }
}
