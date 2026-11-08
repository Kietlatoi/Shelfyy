export const consentKey = 'shelfy:analytics-consent';

export function analyticsLocation(href) {
  const url = new URL(href);
  const clean = new URL('/', url.origin);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = url.searchParams.get(key);
    if (value && /^[a-z0-9_-]{1,80}$/i.test(value)) clean.searchParams.set(key, value);
  }
  return clean.href;
}

export function readConsent() {
  try { return localStorage.getItem(consentKey); } catch { return null; }
}

export function startAnalytics(id) {
  if (!/^G-[A-Z0-9]+$/.test(id || '') || window.location.pathname !== '/' || readConsent() !== 'accepted') return false;
  window[`ga-disable-${id}`] = false;
  if (document.getElementById('shelfy-ga4')) return true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  const location = analyticsLocation(window.location.href);
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch { /* No external referrer. */ }
  window.gtag('set', { page_location: location, page_referrer: referrer });
  window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  window.gtag('event', 'page_view', { page_location: location, page_referrer: referrer, page_title: 'Shelfy' });
  const script = document.createElement('script');
  script.id = 'shelfy-ga4';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  return true;
}

export function trackDownload(available) {
  if (window.location.pathname === '/' && readConsent() === 'accepted') {
    window.gtag?.('event', available ? 'download_click' : 'download_unavailable', { transport_type: 'beacon' });
  }
}

export function saveConsent(value, id) {
  try { localStorage.setItem(consentKey, value); } catch { return false; }
  if (value === 'accepted') startAnalytics(id);
  else {
    window[`ga-disable-${id}`] = true;
    // Removing the loaded tag requires a reload; also remove its first-party cookies.
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', `; domain=${window.location.hostname}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`;
      }
    }
    if (document.getElementById('shelfy-ga4')) window.location.reload();
  }
  return true;
}
