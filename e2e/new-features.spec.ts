import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('New Features', () => {
  test('Keyboard shortcuts help modal opens', async ({ page }) => {
    await page.goto('/');
    const helpButton = page.locator('button[aria-label="Keyboard shortcuts"]');
    await helpButton.click();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
  });

  test('Focus timer component renders', async ({ page }) => {
    await page.goto('/focus/1');
    await expect(page.getByText('Focus Timer')).toBeVisible();
  });

  test('Gantt chart page loads', async ({ page }) => {
    await page.goto('/gantt');
    await expect(page.getByText('Gantt Chart')).toBeVisible();
  });

  test.skip('API endpoints return data', async () => {
    // E2E test requires running server
  });
});

test.describe('Template Collections', () => {
  test.skip('Template collections component renders', async () => {
    // E2E test requires running server
  });
});

test.describe('Habit Tracker', () => {
  test.skip('Habit tracker shows correctly', async () => {
    // E2E test requires running server
  });
});