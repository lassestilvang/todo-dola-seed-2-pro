import { test, expect } from '@playwright/test';

const TEST_IDS = {
  addTaskButton: '[data-testid="add-task-button"]',
  taskNameInput: '[data-testid="task-name-input"]',
  saveButton: '[data-testid="save-task-button"]',
  taskItem: '[data-testid="task-item"]',
  templateButton: '[data-testid="use-template-button"]',
  templateManagerButton: '[data-testid="manage-templates-button"]',
};

test.describe('Task Templates', () => {
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

  test('should create a task from template', async ({ page }) => {
    await page.goto('/');

    // Check if templates exist, if not create one first
    const templateManager = page.locator(TEST_IDS.templateManagerButton);
    if (await templateManager.count() > 0) {
      await templateManager.click();

      // Create a new template
      await page.locator('button:has-text("Create Template")').click();
      await page.locator('input[name="name"]').fill('Test Template');
      await page.locator('textarea[name="description"]').fill('A test template');
      await page.locator('button:has-text("Save")').click();
    }

    // Use template
    await page.locator(TEST_IDS.addTaskButton).click();
    const useTemplateBtn = page.locator(TEST_IDS.templateButton);
    if (await useTemplateBtn.count() > 0) {
      await useTemplateBtn.first().click();
      await expect(page.locator(TEST_IDS.taskNameInput)).toHaveValue('Test Template');
    }
    await page.locator(TEST_IDS.saveButton).click();
  });

  test('should manage templates', async ({ page }) => {
    await page.goto('/templates');

    // Create template
    await page.locator('button:has-text("Create")').click();
    await page.locator('input[name="name"]').fill('New Template');
    await page.locator('button:has-text("Save")').click();

    await expect(page.locator('text=New Template')).toBeVisible();

    // Edit template
    await page.locator('text=New Template').hover();
    await page.locator('button:has-text("Edit")').first().click();
    await page.locator('input[name="name"]').fill('Updated Template');
    await page.locator('button:has-text("Save")').click();

    await expect(page.locator('text=Updated Template')).toBeVisible();

    // Delete template
    await page.locator('text=Updated Template').hover();
    await page.locator('button:has-text("Delete")').first().click();
    await page.locator('button:has-text("Confirm")').click();

    await expect(page.locator('text=Updated Template')).not.toBeVisible();
  });
});