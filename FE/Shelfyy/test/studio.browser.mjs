import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

// Reuse a supplied Playwright installation instead of adding a runtime dependency.
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || new URL('../package.json', import.meta.url))
const { chromium } = require('playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const url = process.env.LANDING_URL || 'http://127.0.0.1:4173'
const output = process.env.LANDING_QA_OUTPUT || '../../temp/studio-qa/functional'
await mkdir(output, { recursive: true })
const results = []

async function context(options) {
  const ctx = await browser.newContext(options)
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new Error('Disabled during QA'))
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  })
  return ctx
}

try {
  const ctx = await context({ viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForSelector('.studio-motion-ready')
  assert.equal(await page.locator('h1').count(), 1)
  assert.equal(await page.getByText(/7 triệu|80%|30%/).count(), 0)
  assert.equal(await page.evaluate(() => window.ScrollCraft.instances.length), 1)
  await page.screenshot({ path: `${output}/desktop-hero.png` })

  const phone = page.locator('.studio-phone')
  await phone.getByRole('button', { name: 'Tủ đồ', exact: true }).click()
  await phone.getByRole('button', { name: 'Quần', exact: true }).click()
  assert.equal(await phone.locator('.studio-closet-grid button').count(), 2)
  await phone.getByRole('button', { name: 'Phụ kiện', exact: true }).click()
  assert.equal(await phone.locator('.studio-closet-grid button').count(), 0)
  await phone.getByRole('button', { name: '+ Thêm một chiếc túi mẫu', exact: true }).click()
  assert.equal(await phone.locator('.studio-closet-grid button').count(), 1)
  await phone.getByRole('button', { name: 'Phối Túi đeo vai', exact: true }).click()
  assert.equal(await phone.locator('.studio-phone-bag').count(), 1)
  await phone.getByRole('button', { name: 'Đi làm', exact: true }).click()
  assert.match(await phone.locator('.studio-phone-look img').nth(1).getAttribute('src'), /trousers/)
  assert.match(await phone.locator('.studio-phone-look img').nth(2).getAttribute('src'), /loafers/)
  await phone.getByRole('button', { name: '↻ Đổi quần', exact: true }).click()
  await phone.getByRole('button', { name: '↻ Đổi giày', exact: true }).click()
  assert.match(await phone.locator('.studio-phone-look img').nth(1).getAttribute('src'), /jeans/)
  assert.match(await phone.locator('.studio-phone-look img').nth(2).getAttribute('src'), /sneakers/)
  await phone.getByRole('button', { name: '♡ Giữ bộ phối này', exact: true }).click()
  assert.match(await page.locator('.studio-download-status').textContent(), /BẠN ĐÃ GIỮ/)
  assert.equal(await page.locator('.studio-chosen-look img').count(), 4)
  await phone.getByRole('button', { name: 'Tủ đồ', exact: true }).click()
  await phone.getByRole('button', { name: '− Bỏ túi mẫu', exact: true }).click()
  assert.equal(await page.locator('.studio-chosen-look img').count(), 3)
  await page.getByRole('button', { name: 'Ảnh app thật', exact: true }).click()
  for (const [label, file] of [['Trang chủ', 'app-home'], ['Tủ đồ', 'app-wardrobe'], ['Gợi ý', 'app-suggest'], ['Thử đồ', 'app-tryon']]) {
    await page.locator('.studio-screen-picker').getByRole('button', { name: label, exact: true }).click()
    assert.match(await phone.locator('img').getAttribute('src'), new RegExp(file))
  }
  await page.getByRole('button', { name: 'Dùng thử', exact: true }).click()
  await phone.getByRole('button', { name: 'Phối đồ', exact: true }).click()
  assert.match(await phone.locator('.studio-phone-look img').nth(1).getAttribute('src'), /jeans/)
  await page.getByRole('button', { name: '↻ Bắt đầu lại với tủ đồ mẫu', exact: true }).click()
  assert.equal(await phone.getByRole('button', { name: 'Trang chủ', exact: true }).getAttribute('aria-current'), 'page')
  await page.locator('#try-shelfy').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/desktop-demo.png` })
  results.push('Desktop demo: navigation, filters, add/remove, occasions, swaps, save, screen gallery, reset')

  const hero = page.locator('.studio-hero')
  await page.evaluate(() => window.scrollTo(0, 0))
  await hero.dispatchEvent('pointermove', { pointerType: 'mouse', clientX: 1000, clientY: 300 })
  const pointer = await hero.evaluate((el) => el.style.getPropertyValue('--px'))
  assert.notEqual(pointer, '0px')
  const initial = await page.locator('.studio-fashion-plane').evaluate((el) => getComputedStyle(el).transform)
  await page.evaluate(() => window.scrollTo(0, 350))
  await page.waitForTimeout(400)
  assert.notEqual(await page.locator('.studio-fashion-plane').evaluate((el) => getComputedStyle(el).transform), initial)
  results.push('Independent scroll and pointer depth respond')

  await page.locator('#questions summary').first().focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('#questions details').first().getAttribute('open'), '')
  assert.match(await page.locator('.studio-button--lime').getAttribute('href'), /^https:\/\//)
  for (const img of await page.locator('img').all()) await img.evaluate((el) => { el.loading = 'eager' })
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(errors, [])

  for (const [path, title] of [['/privacy', 'Chính sách quyền riêng tư Shelfy'], ['/account-deletion', 'Yêu cầu xóa tài khoản Shelfy']]) {
    await page.goto(`${url}${path}`)
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
  }
  await page.goto(`${url}/admin`)
  await page.getByRole('button', { name: /Đăng nhập/ }).waitFor()
  assert.equal(await page.locator('.shelfy-studio').count(), 0)
  results.push('Privacy, account deletion and unauthenticated admin still render')

  for (const [width, height, reducedMotion] of [[390, 844, 'no-preference'], [360, 640, 'no-preference'], [1440, 900, 'reduce']]) {
    const device = await context({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, reducedMotion })
    const p = await device.newPage()
    await p.goto(url)
    await p.evaluate(() => document.fonts.ready)
    await p.waitForSelector('.studio-motion-ready')
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    if (width < 500) {
      const toggle = p.locator('#studio-menu-toggle')
      await toggle.click()
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
      await p.keyboard.press('Escape')
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
      await toggle.click()
      await p.locator('#studio-navigation').getByRole('link', { name: 'Dùng thử', exact: true }).click()
      assert.equal(await p.locator('#studio-menu-toggle').getAttribute('aria-expanded'), 'false')
      await p.locator('.studio-phone').getByRole('button', { name: 'Phối đồ', exact: true }).click()
      await p.locator('.studio-phone').getByRole('button', { name: 'Đi làm', exact: true }).click()
      assert.match(await p.locator('.studio-phone-look img').nth(1).getAttribute('src'), /trousers/)
    } else {
      assert.equal(await p.locator('.studio-fashion-plane').evaluate((el) => getComputedStyle(el).transform), 'none')
    }
    await p.evaluate(() => window.scrollTo(0, 0))
    await p.screenshot({ path: `${output}/${width}-${reducedMotion}-hero.png` })
    await p.locator('.studio-phone').scrollIntoViewIfNeeded()
    await p.screenshot({ path: `${output}/${width}-${reducedMotion}-phone.png` })
    await device.close()
    results.push(`${width}x${height}, ${reducedMotion}: fit and interaction passed`)
  }

  const fallback = await context({ viewport: { width: 390, height: 844 } })
  await fallback.route('**/vendor/scrollcraft.js', (route) => route.abort())
  const f = await fallback.newPage()
  await f.goto(url)
  await f.locator('.studio-phone').getByRole('button', { name: 'Tủ đồ', exact: true }).click()
  assert.equal(await f.locator('.studio-closet-grid button').count(), 5)
  assert.equal(await f.locator('#discover-title').evaluate((el) => getComputedStyle(el).opacity), '1')
  results.push('Animation script unavailable: content visible and demo still usable')
  console.log(results.join('\n'))
} finally {
  await browser.close()
}
