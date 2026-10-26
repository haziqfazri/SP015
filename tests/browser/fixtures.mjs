import { test as base, expect } from '@playwright/test';

// Register before navigation so startup failures cannot disappear between tests.
export const test = base.extend({
  health: [async ({ page, baseURL }, use, testInfo) => {
    const health = { errors: [], responses: new Map() };
    const mount = new URL(baseURL);
    page.on('pageerror', (error) => health.errors.push(`Uncaught JavaScript: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') health.errors.push(`Console: ${message.text()}`);
    });
    page.on('requestfailed', (request) => health.errors.push(`Request failed: ${request.url()} (${request.failure()?.errorText})`));
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== mount.origin) health.errors.push(`Unexpected external request: ${url.href}`);
      else if (!url.pathname.startsWith(mount.pathname)) health.errors.push(`Request escaped hosting prefix ${mount.pathname}: ${url.href}`);
    });
    page.on('response', (response) => {
      health.responses.set(response.url(), { status: response.status(), type: response.headers()['content-type'] ?? '' });
      if (response.status() >= 400) health.errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await use(health);
    if (health.errors.length) await testInfo.attach('browser-health', { body: JSON.stringify(health.errors, null, 2), contentType: 'application/json' });
    expect(health.errors, 'No JavaScript, console, asset, or hosting-prefix errors').toEqual([]);
  }, { auto: true }],
});

export async function openPage(page, health, route, destination) {
  const response = await page.goto(route);
  expect(response?.status(), `Document ${route}`).toBe(200);
  if (destination) await page.waitForURL(destination, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.dependency-error')).toHaveCount(0);
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll((elements) => elements.map((element) => element.src || element.href));
  expect(assets.length).toBeGreaterThan(0);
  for (const url of assets) {
    const asset = health.responses.get(url);
    expect(asset?.status, `Loaded critical asset ${url}`).toBe(200);
    expect(asset?.type, `Asset MIME type ${url}`).toMatch(url.endsWith('.css') ? /text\/css/ : /(?:java|ecma)script/);
  }
  expect([...health.responses.keys()].some((url) => url.includes('/vendor/fonts/')), 'Local project fonts loaded').toBe(true);
}

export async function expectCanvas(page, selector = '#canvas-holder canvas') {
  const canvas = page.locator(selector);
  await expect(canvas).toBeVisible();
  // A canvas element alone can be blank. Look for actual non-uniform pixels.
  await expect.poll(() => canvas.evaluate((element) => {
    if (element.width < 100 || element.height < 80) return false;
    const context = element.getContext('2d');
    if (!context) return false;
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    for (let i = 4; i < pixels.length; i += 4) {
      if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2] || pixels[i + 3] !== pixels[3]) return true;
    }
    return false;
  }), { message: 'Initial canvas contains a rendered scene' }).toBe(true);
  return canvas;
}

export async function expectLayout(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'No horizontal page overflow').toBe(true);
  const duplicates = await page.locator('[id]').evaluateAll((elements) => {
    const seen = new Set();
    return elements.map((element) => element.id).filter((id) => seen.has(id) || !seen.add(id));
  });
  expect(duplicates, 'Static and dynamically generated IDs are unique').toEqual([]);
}
