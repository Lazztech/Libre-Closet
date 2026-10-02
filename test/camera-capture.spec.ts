import { test, expect } from '@playwright/test';

/**
 * Regression test for https://github.com/lazztech/Libre-Closet/issues/99 —
 * Chrome on Android was dropping the Camera option from the garment photo
 * file-input's chooser sheet. The fix adds a dedicated "Take Photo" button
 * wired to a hidden input with capture="environment", which launches the
 * camera directly instead of depending on Chromium's merged chooser sheet.
 */
test('garment photo upload offers a direct camera capture entry point', async ({
  page,
}) => {
  const email = `camera-test-${Date.now()}@example.com`;
  const password = 'Password123!';

  // Registration and garment creation are exercised elsewhere; set up state
  // directly via the same cookie-sharing request context so this test stays
  // focused on the capture-button behavior under test.
  await page.request.post('/auth/register', {
    form: { email, password, confirmPassword: password },
  });
  const createResponse = await page.request.post('/wardrobe', {
    form: { name: 'Camera Test Garment', category: 'shirt' },
  });
  const garmentId = new URL(createResponse.url()).pathname.split('/').pop();

  await page.goto(`/wardrobe/${garmentId}`);

  const captureButton = page.locator('#photoCaptureBtn');
  await expect(captureButton).toBeVisible();

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    captureButton.click(),
  ]);

  const captureInput = fileChooser.element();
  expect(await captureInput.getAttribute('capture')).toBe('environment');
  expect(await captureInput.getAttribute('accept')).toMatch(/image/);
  expect(fileChooser.isMultiple()).toBe(false);

  // Gallery/file browsing must remain unaffected by the new capture input.
  await expect(page.locator('#photoInput')).not.toHaveAttribute('capture');
});
