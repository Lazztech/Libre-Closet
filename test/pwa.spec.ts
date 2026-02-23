import { test, expect } from '@playwright/test';

/**
 * PWA (Progressive Web App) tests.
 *
 * Tests verify:
 *  - manifest.json availability and shape
 *  - PWA install prompt element and trigger button (pwaEnabled view-context)
 *  - Service worker registration via Workbox
 *  - Service worker caching behaviour (Cache Storage API)
 *
 * Tests that depend on the server running with PWA_ENABLED=true are
 * conditionally skipped when that env-var is absent.  The .env file is
 * loaded by playwright.config.ts so the value is available at test-collection
 * time as well as server-start time.
 *
 * Run the full suite:
 *   PWA_ENABLED=true npm run test:e2e:pwa
 */

const PWA_ENABLED = process.env.PWA_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Manifest & meta tags
// These assets are always served regardless of PWA_ENABLED, so no skip guard.
// ---------------------------------------------------------------------------
test.describe('PWA: manifest and static assets', () => {
  test('manifest.json is accessible and has required PWA fields', async ({
    page,
  }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display', 'standalone');
    expect(manifest).toHaveProperty('scope');
    expect(manifest).toHaveProperty('icons');
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('every page includes <link rel="manifest"> pointing to /manifest.json', async ({
    page,
  }) => {
    await page.goto('/');
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('sw.js service-worker file is accessible', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('javascript');
  });

  test('offline fallback page /offline.html is accessible', async ({
    page,
  }) => {
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('assets warmed by service worker are accessible', async ({ page }) => {
    // These URLs are listed in warmStrategyCache inside src-sw.ts.
    // They must be reachable so the SW can populate its runtime cache.
    const warmUrls = [
      '/offline.html',
      '/modules/htmx.min.js',
      '/modules/_hyperscript.min.js',
      '/modules/sse.js',
    ];

    for (const url of warmUrls) {
      const response = await page.request.get(url);
      expect(
        response.status(),
        `Expected ${url} to be accessible for SW warm cache`,
      ).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// PWA install prompt
// These depend on pwaEnabled being true in the view context.
// ---------------------------------------------------------------------------
test.describe('PWA: install prompt (requires PWA_ENABLED=true)', () => {
  test('pwa-install.bundle.js module script tag is present in <head>', async ({
    page,
  }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');
    const scriptTag = page.locator(
      'script[type="module"][src="/modules/pwa-install.bundle.js"]',
    );
    await expect(scriptTag).toBeAttached();
  });

  test('<pwa-install> custom element is present in the DOM', async ({
    page,
  }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');
    await expect(page.locator('pwa-install#pwa-install')).toBeAttached();
  });

  test('<pwa-install> element has manifest-url attribute', async ({ page }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');
    await expect(page.locator('pwa-install#pwa-install')).toHaveAttribute(
      'manifest-url',
      '/manifest.json',
    );
  });

  test('PWA install trigger button is visible on the homepage', async ({
    page,
  }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');
    const installButton = page.locator(
      'button[onclick="pwaInstall.showDialog(true)"]',
    );
    await expect(installButton).toBeVisible();
  });

  test('clicking the PWA install button does not produce a JS error', async ({
    page,
  }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');

    // Wait for the custom element to be upgraded before clicking.
    await page.waitForFunction(
      () =>
        typeof customElements !== 'undefined' &&
        !!customElements.get('pwa-install'),
      { timeout: 10_000 },
    );

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.locator('button[onclick="pwaInstall.showDialog(true)"]').click();

    // Give event loop a tick for any synchronous errors to surface.
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });

  test('pwaInstall global variable is defined after page load', async ({
    page,
  }) => {
    test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

    await page.goto('/');

    const pwaInstallDefined = await page.evaluate(
      () => typeof (window as any).pwaInstall !== 'undefined',
    );
    expect(pwaInstallDefined).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Service worker registration
// ---------------------------------------------------------------------------
test.describe('PWA: service worker registration (requires PWA_ENABLED=true)', () => {
  // Only Chromium reliably exposes the 'serviceworker' BrowserContext event
  // in a way Playwright can observe; run these in chromium only.
  test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

  test('workbox-window production module is served', async ({ page }) => {
    const response = await page.goto('/modules/workbox-window.prod.mjs');
    expect(response?.status()).toBe(200);
  });

  test('service worker registers after navigating to the homepage', async ({
    context,
    page,
  }) => {
    // Playwright surfaces each new SW as a 'serviceworker' event.
    const swEventPromise = context.waitForEvent('serviceworker', {
      timeout: 20_000,
    });

    await page.goto('/');

    const sw = await swEventPromise;
    expect(sw.url()).toContain('/sw.js');
  });

  test('navigator.serviceWorker.getRegistration resolves to a registration', async ({
    context,
    page,
  }) => {
    // Ensure the service worker is registered first.
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {
      /* best-effort; assertion below will surface any failure */
    });

    await page.goto('/');

    // Allow time for registration to complete.
    const registration = await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return reg ?? null;
      },
      { timeout: 20_000 },
    );

    expect(registration).not.toBeNull();
  });

  test('registered service worker scope covers the app root', async ({
    context,
    page,
  }) => {
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

    await page.goto('/');

    const scope = await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return reg?.scope ?? null;
      },
      { timeout: 20_000 },
    );

    const scopeValue = await scope.jsonValue();
    expect(scopeValue).toContain('localhost');
  });
});

// ---------------------------------------------------------------------------
// Service worker caching
// ---------------------------------------------------------------------------
test.describe('PWA: service worker caching (requires PWA_ENABLED=true)', () => {
  test.skip(!PWA_ENABLED, 'Requires PWA_ENABLED=true');

  test('Cache Storage is populated after the service worker activates', async ({
    context,
    page,
  }) => {
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

    await page.goto('/');

    // Wait for the SW to move to the 'activated' state.
    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return reg?.active !== null && reg?.active !== undefined;
      },
      { timeout: 20_000 },
    );

    // Give Workbox a moment to populate the precache and warm caches.
    await page.waitForTimeout(2_000);

    const cachedPaths: string[] = await page.evaluate(async () => {
      const names = await caches.keys();
      const paths: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        paths.push(...keys.map((r) => new URL(r.url).pathname));
      }
      return paths;
    });

    // The Workbox precache should have captured files from public/
    // that match the workbox-config.js globPatterns.
    expect(cachedPaths.length).toBeGreaterThan(0);
  });

  test('the precache contains key static assets', async ({ context, page }) => {
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

    await page.goto('/');

    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return reg?.active !== null && reg?.active !== undefined;
      },
      { timeout: 20_000 },
    );

    await page.waitForTimeout(2_000);

    const cachedPaths: string[] = await page.evaluate(async () => {
      const names = await caches.keys();
      const paths: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        paths.push(...keys.map((r) => new URL(r.url).pathname));
      }
      return paths;
    });

    // bundle.css and manifest.json are matched by workbox-config.js
    // globPatterns and should always appear in the precache.
    expect(cachedPaths).toContain('/bundle.css');
    expect(cachedPaths).toContain('/manifest.json');
  });

  test('the NetworkFirst strategy caches the homepage after a fetch', async ({
    context,
    page,
  }) => {
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

    await page.goto('/');

    // Wait until the SW is both active AND controlling this page.
    // navigator.serviceWorker.controller is only non-null once clientsClaim()
    // has run and the SW is intercepting fetches for this client.
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 20_000 },
    );

    // Issue a fetch through the controlled SW so its
    // registerRoute(() => true, CACHE_STRATEGY) handler stores the response.
    await page.evaluate(() => fetch('/').then((r) => r.text()));

    // Poll Cache Storage until the homepage entry appears (up to 15 s).
    await page.waitForFunction(
      async () => {
        const names = await caches.keys();
        for (const name of names) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          if (keys.some((r) => new URL(r.url).pathname === '/')) return true;
        }
        return false;
      },
      { timeout: 15_000 },
    );
  });

  test('offline page is served from cache when network is unavailable', async ({
    context,
    page,
  }) => {
    context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

    // Prime the cache: the SW warmStrategyCache call fetches /offline.html.
    await page.goto('/');

    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return reg?.active !== null && reg?.active !== undefined;
      },
      { timeout: 20_000 },
    );

    await page.waitForTimeout(2_000);

    // Simulate going offline.
    await context.setOffline(true);

    try {
      // The offline page should be served from the SW catch-handler cache.
      await page.goto('/offline.html', { timeout: 10_000 });
      await expect(page.locator('body')).toBeVisible();
    } finally {
      // Always restore network so other tests are not affected.
      await context.setOffline(false);
    }
  });
});
