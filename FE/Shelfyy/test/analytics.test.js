import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsLocation, saveConsent, startAnalytics, trackDownload } from '../src/analytics.js';

test('analytics location retains campaign tags and strips personal query values, paths and fragments', () => {
  assert.equal(analyticsLocation('https://shelfy.test/?utm_source=facebook&utm_medium=social&utm_campaign=launch&email=a@example.com#token'), 'https://shelfy.test/?utm_source=facebook&utm_medium=social&utm_campaign=launch');
  assert.equal(analyticsLocation('https://shelfy.test/private?utm_source=a%40example.com'), 'https://shelfy.test/');
});

test('GA4 cannot start without consent or on admin routes; downloads respect consent', () => {
  let consent = null;
  let events = 0;
  globalThis.localStorage = { getItem: () => consent };
  globalThis.window = { location: { pathname: '/' }, gtag: () => { events++; } };
  assert.equal(startAnalytics('G-TEST'), false);
  trackDownload(true);
  assert.equal(events, 0);
  consent = 'accepted';
  window.location.pathname = '/admin';
  assert.equal(startAnalytics('G-TEST'), false);
  trackDownload(true);
  assert.equal(events, 0);
  window.location.pathname = '/';
  trackDownload(true);
  assert.equal(events, 1);
  assert.equal(startAnalytics('bad-id'), false);
  delete globalThis.window;
  delete globalThis.localStorage;
});

test('GA4 starts once with sanitized page data and permits opting back in after declining', () => {
  let consent = 'accepted';
  let script;
  let reloads = 0;
  globalThis.localStorage = { getItem: () => consent, setItem: (_, value) => { consent = value; } };
  globalThis.window = { location: { pathname: '/', hostname: 'shelfy.test', href: 'https://shelfy.test/?email=private@example.com&utm_source=tiktok#secret', reload: () => { reloads++; } } };
  globalThis.document = { referrer: 'https://source.test/path?private=hidden', cookie: '_ga=existing', getElementById: () => script, createElement: () => ({}), head: { appendChild: (value) => { script = value; } } };
  assert.equal(startAnalytics('G-TEST'), true);
  assert.equal(script.src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST');
  const page = window.dataLayer.find((args) => args[0] === 'event' && args[1] === 'page_view')[2];
  assert.equal(page.page_location, 'https://shelfy.test/?utm_source=tiktok');
  assert.equal(page.page_referrer, 'https://source.test');
  const length = window.dataLayer.length;
  startAnalytics('G-TEST');
  assert.equal(window.dataLayer.length, length);
  saveConsent('declined', 'G-TEST');
  assert.equal(window['ga-disable-G-TEST'], true);
  assert.equal(reloads, 1);
  saveConsent('accepted', 'G-TEST');
  assert.equal(window['ga-disable-G-TEST'], false);
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.localStorage;
});
