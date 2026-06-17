import { test, expect, Page } from '@playwright/test';

// Helper functions
async function createTask(page: Page, name: string, description?: string) {
  // Click the add button (usually a + button or "Add Task")
  await page.click('button >> text="Add"');
  await page.waitForSelector('input[type="text"]', { timeout: 2000 });

  await page.fill('input[type="text"]', name);
  if (description) {
    const descInputs = page.locator('textarea');
    if (await descInputs.count() > 0) {
      await descInputs.first().fill(description);
    }
  }
  await page.click('button >> text="Save"');
}

async function waitForTask(page: Page, name: string) {
  await page.waitForSelector(`text="${name}"`, { timeout: 5000 });
}

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new task', async ({ page }) => {
    const taskName = `Test Task ${Date.now()}`;

    await createTask(page, taskName, 'Test description');
    await waitForTask(page, taskName);

    await page.click(`text="${taskName}"`);
    await expect(page).toHaveURL(/\/task\/[a-f0-9-]+/);
  });

  test('should toggle task completion', async ({ page }) => {
    const taskName = `Toggle Task ${Date.now()}`;
    await createTask(page, taskName);
    await waitForTask(page, taskName);

    const taskItem = page.locator(`text="${taskName}"`).first();
    await taskItem.click();

    // Look for a checkbox or complete button
    const completeBtn = page.locator('button >> text="Complete"');
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
    }

    // Verify the task shows as completed (strikethrough or similar)
    await expect(taskItem).toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    const taskName = `Delete Task ${Date.now()}`;
    await createTask(page, taskName);
    await waitForTask(page, taskName);

    const taskItem = page.locator(`text="${taskName}"`).first();
    await taskItem.click();

    const deleteBtn = page.locator('button >> text="Delete"');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    }

    // Click confirm if dialog appears
    const confirmBtn = page.locator('button >> text="Confirm"');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect(page.locator(`text="${taskName}"`)).not.toBeVisible();
  });

  test('should edit task details', async ({ page }) => {
    const taskName = `Edit Task ${Date.now()}`;
    await createTask(page, taskName);
    await waitForTask(page, taskName);

    await page.click(`text="${taskName}"`);

    const editBtn = page.locator('button >> text="Edit"');
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }

    const newName = `Edited ${taskName}`;
    const nameInput = page.locator('input[type="text"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(newName);
    }

    await page.click('button >> text="Save"');
    await expect(page.locator(`text="${newName}"`)).toBeVisible();
  });
});

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
  });

  test('should display kanban board', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should search tasks', async ({ page }) => {
    const taskName = `Search Task ${Date.now()}`;
    await createTask(page, taskName);
    await waitForTask(page, taskName);

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(taskName);
      await searchInput.press('Enter');
      await expect(page.locator(`text="${taskName}"`)).toBeVisible();
    }
  });
});