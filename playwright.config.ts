import { defineConfig } from '@playwright/test';
// Keep specs in the TypeScript project without widening its source include.
import type {} from './e2e/public.spec';
import type {} from './e2e/demo-captain.spec';
import type {} from './e2e/demo-player.spec';
import type {} from './e2e/rtl.spec';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 2,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3100',
    channel: process.env.E2E_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  },
  projects: [
    { name: 'edge-mobile', use: { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true } },
    { name: 'edge-desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run start -- -p 3100',
    url: 'http://localhost:3100/ar',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
