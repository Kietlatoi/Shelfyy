const PAYMENT_RESULT_PATH = '/payment/result';

export function redirectSystemPath({ path }) {
  try {
    if (typeof path !== 'string') return path;

    const url = new URL(path, 'shelfy://app');
    const isPaymentResult = url.protocol === 'shelfy:'
      && ((url.hostname === 'payment' && url.pathname === '/result')
        || url.pathname === PAYMENT_RESULT_PATH);

    if (isPaymentResult) {
      return `${PAYMENT_RESULT_PATH}${url.search}${url.hash}`;
    }

    return path;
  } catch {
    return path;
  }
}
