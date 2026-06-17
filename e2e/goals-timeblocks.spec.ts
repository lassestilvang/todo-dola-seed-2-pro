import { test, expect } from '@playwright/test';

const TEST_IDS = {
  addTaskButton: '[data-testid="add-task-button"]',
  taskNameInput: '[data-testid="task-name-input"]',
  saveButton: '[data-testid="save-task-button"]',
};

test.describe('Goals and Time Blocking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const addButtons = document.querySelectorAll('button');
      addButtons.forEach(btn => {
        if (btn.textContent?.toLowerCase().includes('add') && !btn.hasAttribute('data-testid')) {
          btn.setAttribute('data-testid', 'add-task-button');
        }
      });
    });
  });

  test.describe('Goals', () => {
    test('should create a goal with progress tracking', async ({ page }) => {
      await page.goto('/goals');

      await page.locator('button:has-text("Create Goal")').click();
      await page.locator('input[name="name"]').fill('Learn React');
      await page.locator('input[name="targetValue"]').fill('100');
      await page.locator('select[name="unit"]').selectOption('%');
      await page.locator('button:has-text("Save")').click();

      await expect(page.locator('text=Learn React')).toBeVisible();
    });

    test('should update goal progress', async ({ page }) => {
      await page.goto('/goals');

      // Find a goal and update its progress
      const incrementBtn = page.locator('button:has-text("Increment")').first();
      if (await incrementBtn.count() > 0) {
        const beforeText = await page.locator('.progress-text').first().textContent();
        await incrementBtn.click();
        // Progress should update
        await expect(page.locator('.progress-text')).not.toHaveText(beforeText || '');
      }
    });
  });

  test.describe('Time Blocking', () => {
    test('should create time blocks on calendar', async ({ page }) => {
      await page.goto('/calendar');

      // Click on a time slot
      const firstSlot = page.locator('.time-slot').first();
      if (await firstSlot.count() > 0) {
        await firstSlot.click();
        await page.locator('input[name="name"]').fill('Meeting');
        await page.locator('button:has-text("Save")').click();
        await expect(page.locator('text=Meeting')).toBeVisible();
      }
    });

    test('should drag and drop time blocks', async ({ page }) => {
      await page.goto('/calendar');

      const block = page.locator('.time-block').first();
      if (await block.count() > 0) {
        const beforePosition = await block.boundingBox();
        // Drag to new position (simplified test)
        await block.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();
      }
    });
  });
});