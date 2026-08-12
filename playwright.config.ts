import { defineConfig, devices } from '@playwright/test';

// A port of its own: the dev server the author is using stays untouched.
const PORT = 3011;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * End-to-end runs against the static export — the same artifact that gets
 * deployed — so a test failure means the shipped build is broken, not that a
 * dev-only code path is.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    trace: 'on-first-retry',
    video: 'off',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // Chromium's phone emulation rather than a WebKit device, so the suite
      // needs one browser download instead of two.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
