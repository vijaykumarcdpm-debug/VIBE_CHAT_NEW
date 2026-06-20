import { test, expect } from '@playwright/test';

const mobileWidths = [320, 360, 375, 393, 412];
const desktopWidths = [768, 1024];
const height = 800;

for (const width of [...mobileWidths, ...desktopWidths]) {
  test.describe(`Responsive modal viewport at ${width}px`, () => {
    test(`should open and show the login/register modal without clipping at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      const openButton = page.getByRole('button', { name: /sign up|register|login/i }).first();
      await expect(openButton).toBeVisible();
      await openButton.click();

      const modalOverlay = page.locator('.modal-overlay');
      const modalCard = modalOverlay.locator('.modal-card');
      const closeButton = modalOverlay.getByRole('button', { name: /close|cancel|back|✕/i }).first();
      const actionButton = modalOverlay.getByRole('button', { name: /register|sign up|continue|login|submit|save/i }).first();

      await expect(modalOverlay).toBeVisible();
      await expect(modalCard).toBeVisible();
      await expect(modalCard).toHaveCSS('max-height', /px|%/);
      await expect(closeButton).toBeVisible();
      await expect(actionButton).toBeVisible();

      const cardBox = await modalCard.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(height + 1);
        expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width + 1);
      }
    });
  });
}
