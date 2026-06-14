import { test, expect } from '@playwright/test';

test.describe('DISABLE_REGISTRATION', () => {
  test('register page redirects to login when DISABLE_REGISTRATION=true', async ({
    page,
  }) => {
    await page.goto('/auth/register');
    await page.waitForURL('**/auth/login');
    expect(page.url()).toContain('/auth/login');
  });

  test('register link is hidden when DISABLE_REGISTRATION=true', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/auth/register"]')).toHaveCount(0);
  });
});
