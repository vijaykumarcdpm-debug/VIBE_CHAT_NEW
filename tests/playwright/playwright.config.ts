import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 800, height: 600 }
  }
});
