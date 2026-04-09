# PWA Installable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the OPE Osakidetza Quiz app installable on Android as a home screen shortcut that opens without a browser bar.

**Architecture:** Add a `manifest.ts` (Next.js App Router built-in), a minimal service worker (`public/sw.js`), and a client component (`pwa-register.tsx`) that registers it. No external dependencies. No caching — app stays network-only.

**Tech Stack:** Next.js App Router, Vitest + jsdom for tests, Node.js built-in `zlib` for icon generation.

---

### Task 1: Generate placeholder icons

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png` (generated)
- Create: `public/icons/icon-512.png` (generated)

No unit test for this task — it's a one-time generation script verified by file existence.

- [ ] **Step 1: Create the icon generator script**

Create `ope-quiz/scripts/generate-icons.mjs`:

```js
#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB color type
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter: none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
// Blue: #2563eb = rgb(37, 99, 235)
writeFileSync('public/icons/icon-192.png', makePNG(192, [37, 99, 235]));
writeFileSync('public/icons/icon-512.png', makePNG(512, [37, 99, 235]));
console.log('✓ public/icons/icon-192.png');
console.log('✓ public/icons/icon-512.png');
```

- [ ] **Step 2: Run the script from the `ope-quiz/` directory**

```bash
cd ope-quiz
node scripts/generate-icons.mjs
```

Expected output:
```
✓ public/icons/icon-192.png
✓ public/icons/icon-512.png
```

- [ ] **Step 3: Verify files exist**

```bash
ls -lh public/icons/
```

Expected: two PNG files, each several KB in size.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-icons.mjs public/icons/
git commit -m "feat: add placeholder PWA icons (192x192, 512x512)"
```

---

### Task 2: Create the Web App Manifest

**Files:**
- Create: `ope-quiz/src/app/manifest.ts`
- Create: `ope-quiz/src/__tests__/app/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `ope-quiz/src/__tests__/app/manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  it("returns required PWA fields", () => {
    const m = manifest();
    expect(m.name).toBe("OPE Osakidetza Quiz");
    expect(m.short_name).toBe("OPE Quiz");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#2563eb");
    expect(m.background_color).toBe("#f9fafb");
  });

  it("includes 192x192 and 512x512 PNG icons", () => {
    const m = manifest();
    const sizes = m.icons!.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    m.icons!.forEach((icon) => {
      expect(icon.type).toBe("image/png");
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ope-quiz
npx vitest run src/__tests__/app/manifest.test.ts
```

Expected: FAIL — "Cannot find module '@/app/manifest'"

- [ ] **Step 3: Implement the manifest**

Create `ope-quiz/src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OPE Osakidetza Quiz",
    short_name: "OPE Quiz",
    description: "Aplicacion de preparacion para OPE Osakidetza - Temario Comun",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run src/__tests__/app/manifest.test.ts
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts src/__tests__/app/manifest.test.ts
git commit -m "feat: add PWA web app manifest"
```

---

### Task 3: Create the minimal service worker

**Files:**
- Create: `ope-quiz/public/sw.js`

No unit test — this is a static asset, correct behavior is verified by browser DevTools.

- [ ] **Step 1: Create the service worker**

Create `ope-quiz/public/sw.js`:

```js
// Minimal service worker — required by Chrome's PWA installability criteria.
// No caching: the app remains fully network-dependent.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass through all requests — no caching.
});
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add minimal service worker for PWA installability"
```

---

### Task 4: Create the PwaRegister client component

**Files:**
- Create: `ope-quiz/src/app/pwa-register.tsx`
- Create: `ope-quiz/src/__tests__/app/pwa-register.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `ope-quiz/src/__tests__/app/pwa-register.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PwaRegister from "@/app/pwa-register";

describe("PwaRegister", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("renders nothing", () => {
    const { container } = render(<PwaRegister />);
    expect(container.firstChild).toBeNull();
  });

  it("registers /sw.js on mount", () => {
    render(<PwaRegister />);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ope-quiz
npx vitest run src/__tests__/app/pwa-register.test.tsx
```

Expected: FAIL — "Cannot find module '@/app/pwa-register'"

- [ ] **Step 3: Implement the component**

Create `ope-quiz/src/app/pwa-register.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run src/__tests__/app/pwa-register.test.tsx
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/pwa-register.tsx src/__tests__/app/pwa-register.test.tsx
git commit -m "feat: add PwaRegister client component"
```

---

### Task 5: Wire PwaRegister into layout

**Files:**
- Modify: `ope-quiz/src/app/layout.tsx`

- [ ] **Step 1: Add PwaRegister to layout.tsx**

Open `ope-quiz/src/app/layout.tsx`. The current file is:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPE Osakidetza Quiz",
  description: "Aplicacion de preparacion para OPE Osakidetza - Temario Comun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

Replace it with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import PwaRegister from "./pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPE Osakidetza Quiz",
  description: "Aplicacion de preparacion para OPE Osakidetza - Temario Comun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
cd ope-quiz
npx vitest run
```

Expected: all tests pass (including the 4 pre-existing tests + 4 new ones).

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: successful build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire PwaRegister into root layout"
```

---

### Task 6: Manual verification after deploy

After pushing to Vercel and the deploy completes:

- [ ] **Step 1: Open Chrome on Android, navigate to the app URL**

- [ ] **Step 2: Check PWA criteria in DevTools (desktop Chrome)**

Open DevTools → Application → Manifest. Confirm:
- Name: "OPE Osakidetza Quiz"
- Icons visible (192, 512)
- Start URL: `/`
- Display: standalone

Open DevTools → Application → Service Workers. Confirm:
- `/sw.js` appears as "Activated and is running"

- [ ] **Step 3: Install on Android**

In Chrome Android:
- Option A: Tap menu (⋮) → "Añadir a pantalla de inicio"
- Option B: Chrome shows install banner automatically

The app should open fullscreen without the browser address bar.
