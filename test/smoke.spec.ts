import { test, expect } from '@playwright/test';

const APP_NAME = process.env.APP_NAME || 'Boilerplate';

test('homepage loads with APP_NAME title and version', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('body')).toContainText(APP_NAME);
  expect(
    consoleErrors,
    `Console errors found:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});
