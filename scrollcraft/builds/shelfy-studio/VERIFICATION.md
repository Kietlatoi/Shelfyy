# Shelfy Studio: local delivery

Completed local implementation and verification on 2026-10-29. Not deployed or pushed.

## Result

- Replaced the old landing with a fashion-studio composition in cold white, charcoal and lime.
- Reused existing React/Vite, download configuration and consent-based analytics. No new npm dependencies, API integrations or paid asset generation.
- Removed the old unused landing components and data, including fabricated user totals and percentages.
- Interactive HTML phone: three app tabs, category filtering, sample accessory add/remove, three occasions, trouser/shoe swaps, session-only save, full reset.
- Separate actual-app gallery uses four supplied `temp` screenshots, optimized to WebP while preserving aspect ratio.
- Selected garments stay synchronized with the download scene. The demo runs locally with labeled sample data and does not pretend to call AI or save to an account.
- Decorative photograph credited on the page and documented in BRIEF.md. Engine JS/CSS copied unchanged, with upstream MIT license. The JS runtime is used; page styles are scoped to avoid applying the engine's global reset to admin/legal pages.

## Verification

- `npm run build`: pass.
- `npm run lint`: pass.
- `node --test test/*.test.js`: 9/9 pass, including sample-asset integrity and safe download URLs.
- `node test/studio.browser.mjs`: pass against both Vite development and the final production preview.
- Browser assertions cover all demo controls, state transfer, mode switching, full reset, keyboard FAQ, menu/Escape, HTTPS download, images, single active engine instance, scroll/pointer response, overflow, and animation-script failure.
- Production browser checks: 1440px desktop, 390x844 touch viewport, compact 360x640, and reduced motion at 1440x900.
- Privacy, account-deletion and unauthenticated admin routes render. Authenticated admin and cloud operations were outside this change.
- Scrollcraft harness: 16 positions each on desktop, mobile and reduced motion. All settled; no console errors, failed requests, or dead scroll detected. Reports and frame images are in `temp/studio-qa/{desktop,mobile,reduced}`.
- FFmpeg is unavailable, so contact sheets were composed from the captured frames with Pillow and visually inspected. No videos were used. The harness did not sample contrast for this page's always-visible copy; it is not evidence of a full automated contrast audit.
- Visual review: independent hero planes, readable Vietnamese diacritics, mobile composition, phone screens, screenshot evidence, and final download scene. Moved the mobile lime label away from the model's face after the first pass.
- Feeling check: curiosity → recognition → agency → trust → resolve. Interactive phone is the longest content scene and the high point. No forced pinning or blank scroll space. Close retains the selected outfit.
- Final screenshots: `temp/studio-qa/production/desktop-hero.png`, `desktop-demo.png`, phone/mobile/reduced variants; full-page `temp/studio-final-desktop.png`.

## Reproduce browser checks

Start `npm run preview -- --host 127.0.0.1 --port 4174` after building. The test supports an existing Playwright installation, so it does not add a package to the app:

```powershell
$env:PLAYWRIGHT_PACKAGE_JSON = '<existing Playwright installation parent>/package.json'
$env:CHROME_PATH = '<installed Chrome executable>'
$env:LANDING_URL = 'http://127.0.0.1:4174'
node test/studio.browser.mjs
```

Without `PLAYWRIGHT_PACKAGE_JSON`, it resolves Playwright from the project normally. Without `CHROME_PATH`, it uses Playwright's installed browser.

## Limits

Soft display revision (2026-10-29): user rejected the rigid condensed Archivo titles. Replaced display headings with regular-weight Lora, using same-family italics sparingly in the hero and demo payoff. Removed condensed font stretching; retained Be Vietnam Pro for body/UI and wordmark. Confirmed Vietnamese font subset loads and inspected hero, persona and demo screenshots. Build passes; heading/page fit checked at 360/390/768/1024/1440px. Evidence in `temp/studio-soft-type-*.png`. No behavior or content changes.

About addition (2026-10-29): added a brand-authored letter before FAQ under `#about-shelfy`, plus a navigation link on desktop/mobile. User explicitly authorized creating the story. The copy introduces Shelfy's purpose, respect for individual style and a contact email, without inventing named founders, credentials, milestones or social proof. Build and lint pass. Browser checks cover menu closure, anchor navigation, contact destination and overflow at 360/390/768/820/1024/1440px. Desktop and mobile section screenshots were visually inspected: `temp/studio-about-{desktop,mobile}.png`.

Persona addition (2026-10-29): added a clearly labeled fictional persona, Linh, with a morning-to-evening pain-point narrative between hero and wardrobe discovery. Three chronological beats cover outfit indecision, repeating a safe outfit, and buying without noticing existing clothes. New locally stored Unsplash wardrobe image has inline attribution. The main discovery link now enters this story; its CTA reaches the working phone demo. Build and lint pass. Chrome checks confirm three revealed beats, loaded image, desktop/390px/compact360px fit, reduced-motion readability and successful demo handoff. Evidence: `temp/studio-persona-{desktop,mobile,compact-reduced}.png`. This narrative is illustrative and not based on customer interviews.

Typography revision (2026-10-29): Archivo at 90% width for display headings and wordmark, Be Vietnam Pro for body/UI. Relaxed headline tracking, increased body/FAQ/demo text sizes and primary phone controls. Production build and browser regression checks rerun; desktop/mobile screenshots in `temp/studio-font-{desktop,mobile}.png` and `temp/studio-qa/typography`. Vietnamese diacritics checked visually.

No real-device touch/GPU test, authenticated admin test, live AI call, APK download/install, or public deployment was performed. Demo state intentionally resets on reload. Existing Tailwind CDN and Google Fonts connectivity remain dependencies; this task did not replace the shared admin styling pipeline. Page remains readable and the demo works if the optional animation script fails. As with the existing React app, JavaScript is required for the application itself.
