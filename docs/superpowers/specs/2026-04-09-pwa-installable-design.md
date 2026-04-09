# PWA Installable — Design Spec

**Date:** 2026-04-09  
**Status:** Approved  
**Goal:** Make the OPE Osakidetza Quiz app installable on Android as a home screen shortcut that opens without a browser bar.

## Scope

- Installable PWA (home screen shortcut, standalone display mode)
- No offline support — app requires network connection
- Deployment: Vercel (HTTPS already provided)

## Files to Create

### `ope-quiz/src/app/manifest.ts`
Next.js App Router built-in manifest route. Generates `/manifest.webmanifest` automatically.

Fields:
- `name`: "OPE Osakidetza Quiz"
- `short_name`: "OPE Quiz"
- `start_url`: "/"
- `display`: "standalone"
- `background_color`: "#f9fafb"
- `theme_color`: "#2563eb"
- `icons`: 192×192 and 512×512 PNG from `/icons/`

### `ope-quiz/public/sw.js`
Minimal service worker. Required by Chrome's PWA installability criteria. Does not cache anything.

```js
self.addEventListener('install', () => {});
self.addEventListener('fetch', () => {});
```

### `ope-quiz/src/app/pwa-register.tsx`
Client component (`"use client"`). Registers the service worker on page load via `navigator.serviceWorker.register('/sw.js')`. Rendered inside `<body>` in layout.

### `ope-quiz/public/icons/icon-192.png` and `icon-512.png`
Placeholder icons: solid blue (`#2563eb`) background with white "OPE" text. Generated once by `scripts/generate-icons.mjs` using raw PNG byte generation (no npm dependencies).

## Files to Modify

### `ope-quiz/src/app/layout.tsx`
Add `<PwaRegister />` at the end of `<body>`.

## Install Flow (Android)

1. User opens Chrome and navigates to the deployed app URL
2. Chrome shows install banner automatically after qualifying visits, OR
3. User taps menu (⋮) → "Añadir a pantalla de inicio"
4. App opens in standalone mode (no browser UI)

## Chrome PWA Installability Criteria (all met)

| Requirement | How it's met |
|---|---|
| HTTPS | Vercel automatic |
| `manifest.webmanifest` with required fields | `src/app/manifest.ts` |
| Icons 192×192 and 512×512 | `public/icons/` |
| Registered service worker | `pwa-register.tsx` + `public/sw.js` |

## Out of Scope

- Offline support (no caching strategy)
- iOS-specific meta tags (can be added later)
- Push notifications
- Background sync
