# Shelfy Studio mobile UI

Updated 2026-11-01. Reference: https://shelfyy-jet.vercel.app/.

## Visual direction

| Role | Color |
| --- | --- |
| Canvas | `#F4F5F2` |
| Forest ink | `#18201D` |
| Primary action | `#2E483A` |
| Sage surface | `#DEE5DF` |
| Lime accent, paired with dark text | `#D6F268` |

The shared palette also reaches detail, history, registration, reset-password,
and purchase screens through their existing color tokens. Distinct error,
warning, and success colors retain their meaning.

Be Vietnam Pro is used for interface text and Lora for editorial headings.
Fonts are bundled locally; their OFL licenses are in `Mobile/Shelfy/assets/fonts`.
`expo-font` was already installed. No dependencies were added.

## Scope

- Redesigned home, wardrobe, suggestions, AI try-on, profile, and login.
- Shared section headings, clearer hierarchy, quieter cards, and lime active tabs.
- Bottom navigation accounts for the device's bottom safe area.
- Search/reset/retry and existing forms, account actions, billing, and API calls remain connected.
- The previous 1.0.1 wardrobe fix was already uncommitted when this work started;
  it is preserved in the working tree.

## Verification

- Mobile test suite, including palette contrast and font-startup failure recovery.
- ESLint for `app` and `src`.
- Android production JavaScript/Hermes export, including the four font assets.
- Browser inspection of the actual screen components with isolated API/auth fixtures
  at 390×844 and 360×640: navigation, search, clearing filters, empty/offline
  states, suggestion layout, try-on selection, and profile.
- Preview screenshots in `artifacts/ui-studio` use demonstration data. The preview
  harness lives in the system temporary directory and is not an application route.

The complete Expo web app currently fails in the existing native Firebase
persistence initialization (`getReactNativePersistence` on web). This UI change
does not modify that integration. The isolated preview is layout evidence, not
an end-to-end Firebase or Android device test.

## Release 1.0.2 — 2026-11-01

- APKPure: `artifacts/Shelfy-APKPure-1.0.2-v6.apk` (PAYOS channel).
- Google Play: `artifacts/Shelfy-GooglePlay-1.0.2-v7.aab` (Google Play channel).
- Both use `com.duongminhkiet.shelfy`, version 1.0.2, and the existing release key.
- EAS builds finished. APK signature and AAB bundletool validation passed.
- Embedded manifests, bundled brand fonts (content hashes), and compiled
  distribution flags were checked in the downloaded binaries.
- Automated suite: 54/54 passed; lint passed.
- The agent observed the redesigned login screen in Expo Go on Pixel 5 Android 15,
  but did not complete the native smoke test. The user reported testing manually
  and explicitly requested ending computer control and proceeding with builds.
- Final downloaded release binaries were not installed or device-tested.
- No store upload, commit, or push was made.

Before public release, test final binaries on a device, especially image
selection and each store's purchase flow.
