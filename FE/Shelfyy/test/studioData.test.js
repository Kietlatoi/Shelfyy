import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { appScreens, defaultDownloadUrl, occasions, safeDownloadUrl, studioItems } from '../src/const/studioData.js'

test('demo outfits reference real sample items and bundled images', () => {
  const ids = new Set(studioItems.map((item) => item.id))
  assert.equal(ids.size, studioItems.length)
  for (const look of occasions) {
    assert.ok(ids.has(look.bottom))
    assert.ok(ids.has(look.shoes))
    assert.equal(studioItems.find((item) => item.id === look.bottom).category, 'Quần')
    assert.equal(studioItems.find((item) => item.id === look.shoes).category, 'Giày')
  }
  for (const item of [...studioItems, ...appScreens]) {
    assert.ok(existsSync(new URL(`../public/studio/${item.image}`, import.meta.url)), item.image)
  }
})

test('download uses the existing default and accepts only HTTPS without embedded credentials', () => {
  assert.equal(safeDownloadUrl(), defaultDownloadUrl)
  assert.equal(safeDownloadUrl('  '), defaultDownloadUrl)
  assert.equal(safeDownloadUrl(' https://example.com/app.apk '), 'https://example.com/app.apk')
  for (const value of ['javascript:alert(1)', 'http://example.com', '//example.com', 'https://', 'https://user:password@example.com', 'not a url']) assert.equal(safeDownloadUrl(value), null)
})
