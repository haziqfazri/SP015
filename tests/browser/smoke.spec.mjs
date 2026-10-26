import { test as base, expect } from '@playwright/test';

const projectilePath = 'simulations/sp015/02-kinematics-of-linear-motion/2.3-projectile-motion/index.html';
const circularPath = 'simulations/sp015/05-circular-motion/5-uniform-circular-motion/index.html';

// Register before navigation so startup failures cannot disappear between tests.
const test = base.extend({
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

async function openPage(page, health, route) {
  const response = await page.goto(route);
  expect(response?.status(), `Document ${route}`).toBe(200);
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

async function expectCanvas(page) {
  const canvas = page.locator('#canvas-holder canvas');
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

async function expectLayout(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'No horizontal page overflow').toBe(true);
  const duplicates = await page.locator('[id]').evaluateAll((elements) => {
    const seen = new Set();
    return elements.map((element) => element.id).filter((id) => seen.has(id) || !seen.add(id));
  });
  expect(duplicates, 'Static and dynamically generated IDs are unique').toEqual([]);
}

test('landing search, chapter filters, and migrated launch destinations', async ({ page, health, baseURL }) => {
  await openPage(page, health, 'landing/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Launch Projectile Motion simulation', exact: true })).toHaveAttribute('href', `../${projectilePath}`);
  await expect(page.getByRole('link', { name: 'Launch Uniform Circular Motion simulation', exact: true })).toHaveAttribute('href', `../${circularPath}`);
  const search = page.getByRole('searchbox', { name: 'Search simulations' });
  const cards = page.locator('#simulation-groups .sim-card');
  await search.fill('projectile');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Projectile Motion');
  await search.fill('');
  await page.getByRole('button', { name: '05 Circular', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Uniform Circular Motion');
  await expect(page.locator('[data-chapter="5"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-chapter="all"]').click();
  await search.fill('this-query-has-no-matches');
  await expect(page.locator('#empty-state')).toBeVisible();
  await search.fill('');
  await expectLayout(page);
  await page.getByRole('link', { name: 'Launch Projectile Motion simulation', exact: true }).click();
  await expect(page).toHaveURL(new URL(projectilePath, baseURL).href);
  await expectCanvas(page);
});

test('Projectile Motion initial scene, presets, slider, playback, step, and reset', async ({ page, health }) => {
  await openPage(page, health, projectilePath);
  await expect(page.getByRole('heading', { name: 'Projectile Motion', exact: true })).toBeVisible();
  const canvas = await expectCanvas(page);
  await expect(page.locator('#time-label')).toHaveText('t = 0.00 s');
  await expect(page.locator('#btn-play')).toContainText('Play');
  await page.getByRole('button', { name: /^Horizontal/ }).click();
  await expect(page.locator('#angle-live')).toHaveText('0°');
  await page.locator('#speed-slider').press('End');
  await expect(page.locator('#speed-live')).toHaveText('45 m/s');
  await page.locator('#btn-step').click();
  await expect(page.locator('#time-label')).toHaveText('t = 0.02 s');
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Pause');
  await expect.poll(async () => Number((await page.locator('#time-label').textContent()).match(/[\d.]+/)[0])).toBeGreaterThan(0.02);
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Play');
  await page.locator('#btn-reset').click();
  await expect(page.locator('#time-label')).toHaveText('t = 0.00 s');
  const withVectors = await canvas.evaluate((element) => element.toDataURL());
  await page.getByRole('checkbox', { name: 'Show velocity and acceleration', exact: true }).uncheck();
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL()), { message: 'Vector control redraws the paused scene' }).not.toBe(withVectors);
  await expectLayout(page);
});

test('Circular Motion initial scene, slider, direction, compare, playback, and reset', async ({ page, health }) => {
  await openPage(page, health, circularPath);
  await expect(page.getByRole('heading', { name: 'Uniform Circular Motion', exact: true })).toBeVisible();
  await expectCanvas(page);
  await expect(page.locator('#val-time')).toHaveText('0.0 s');
  await page.locator('#a-radius-slider').press('End');
  await expect(page.locator('#a-radius-live')).toHaveText('1.40 m');
  await expect(page.locator('#val-radius')).toHaveText('1.40 m');
  await page.locator('#a-dir-ccw').click();
  await expect(page.locator('#a-dir-ccw')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#a-dir-cw')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Compare Particles', exact: true }).click();
  await expect(page.locator('#particle-b-section')).toBeVisible();
  await expect(page.locator('#compareModeButton')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Single Particle', exact: true }).click();
  await expect(page.locator('#particle-b-section')).toBeHidden();
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Pause');
  await expect.poll(async () => parseFloat(await page.locator('#val-time').textContent())).toBeGreaterThan(0);
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Play');
  await page.locator('#btn-reset').click();
  await expect(page.locator('#val-time')).toHaveText('0.0 s');
  await expectLayout(page);
});
