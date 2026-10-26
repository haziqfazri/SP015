import { defineConfig } from '@playwright/test';
import { origin } from './tests/browser/server.mjs';

const viewports = [
  { width: 1440, height: 1000 },
  { width: 800, height: 1000 },
  { width: 460, height: 900 },
  { width: 320, height: 800 },
];

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : 2,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  outputDir: './test-results/browser',
  use: {
    browserName: 'chromium',
    headless: true,
    deviceScaleFactor: 1,
    screenshot: { mode: 'only-on-failure', fullPage: true },
    trace: 'retain-on-failure',
  },
  projects: ['', 'SP015/'].flatMap((prefix) => viewports.map((viewport) => ({
    name: `chromium-${prefix ? 'sp015' : 'root'}-${viewport.width}`,
    use: { baseURL: `${origin}/${prefix}`, viewport },
  }))),
  webServer: {
    command: 'node tests/browser/server.mjs',
    url: `${origin}/__health`,
    reuseExistingServer: false,
    timeout: 10_000,
  },
});
