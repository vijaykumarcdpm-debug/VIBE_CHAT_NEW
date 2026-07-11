import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 120000,
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 800, height: 600 }
  }
});
