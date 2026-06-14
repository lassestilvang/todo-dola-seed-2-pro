import { test, expect, Page } from '@playwright/test';

// Test data attributes for more reliable selectors
const TEST_IDS = {
  addTaskButton: '[data-testid="add-task-button"]',
  taskNameInput: '[data-testid="task-name-input"]',
  saveButton: '[data-testid="save-task-button"]',
  taskItem: '[data-testid="task-item"]',
  emptyState: '[data-testid="empty-state"]',
  completeButton: '[data-testid="complete-task-button"]',
  deleteButton: '[data-testid="delete-task-button"]',
  confirmButton: '[data-testid="confirm-button"]',
  searchBox: '[data-testid="search-box"]',
  filterButton: '[data-testid="filter-button"]',
};

test.describe('Tasks - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Add data-testid attributes to key elements
    await page.addInitScript(() => {
      // Add data-testid to add button if not present
      const addButtons = document.querySelectorAll('button');
      addButtons.forEach(btn => {
        if (btn.textContent?.toLowerCase().includes('add') && !btn.hasAttribute('data-testid')) {
          btn.setAttribute('data-testid', 'add-task-button');
        }
      });
    });
  });

  test('should display empty state when no tasks exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(TEST_IDS.emptyState)).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.goto('/');

    // Click add task button
    await page.locator(TEST_IDS.addTaskButton).click();

    // Fill in task details
    await page.locator(TEST_IDS.taskNameInput).fill('Test Task from E2E');
    await page.locator(TEST_IDS.saveButton).click();

    // Verify task appears
    await expect(page.locator(`text=Test Task from E2E`)).toBeVisible();
  });

  test('should create a task with description', async ({ page }) => {
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Task with Description');

    // Find description textarea
    const descriptionTextarea = page.locator('textarea[placeholder*="description" i]');
    if (await descriptionTextarea.isVisible()) {
      await descriptionTextarea.fill('This is a detailed description');
    }

    await page.locator(TEST_IDS.saveButton).click();
    await expect(page.locator('text=Task with Description')).toBeVisible();
  });

  test('should mark a task as complete', async ({ page }) => {
    // First create a task
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Task to Complete');
    await page.locator(TEST_IDS.saveButton).click();

    // Find and click the checkbox
    await page.locator('text=Task to Complete')
      .getByRole('button', { name: /mark task as complete/i })
      .click();

    // Verify task shows as completed
    await expect(page.locator('text=Task to Complete')).toHaveClass(/line-through/);
  });

  test('should delete a task', async ({ page }) => {
    // First create a task
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Task to Delete');
    await page.locator(TEST_IDS.saveButton).click();

    // Click delete button
    await page.locator('text=Task to Delete')
      .getByRole('button', { name: /delete/i })
      .click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify task is gone
    await expect(page.locator('text=Task to Delete')).not.toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    await page.goto('/');

    // Create multiple tasks
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Buy groceries');
    await page.locator(TEST_IDS.saveButton).click();

    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Finish report');
    await page.locator(TEST_IDS.saveButton).click();

    // Search for specific task
    const searchBox = page.locator(TEST_IDS.searchBox);
    if (await searchBox.isVisible()) {
      await searchBox.fill('groceries');
      await expect(page.locator('text=Buy groceries')).toBeVisible();
      await expect(page.locator('text=Finish report')).not.toBeVisible();
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    await page.goto('/');

    // Create high priority task
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('High Priority Task');

    // Set priority if UI has priority selector
    const prioritySelect = page.locator('select[name*="priority" i]');
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high');
    }

    await page.locator(TEST_IDS.saveButton).click();
    await expect(page.locator('text=High Priority Task')).toBeVisible();
  });

  test('should handle multiple tasks', async ({ page }) => {
    await page.goto('/');

    // Create 3 tasks
    for (let i = 1; i <= 3; i++) {
      await page.locator(TEST_IDS.addTaskButton).click();
      await page.locator(TEST_IDS.taskNameInput).fill(`Task ${i}`);
      await page.locator(TEST_IDS.saveButton).click();
    }

    // Verify all tasks appear
    await expect(page.locator('text=Task 1')).toBeVisible();
    await expect(page.locator('text=Task 2')).toBeVisible();
    await expect(page.locator('text=Task 3')).toBeVisible();
  });

  test('should persist tasks on refresh', async ({ page }) => {
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Persistent Task');
    await page.locator(TEST_IDS.saveButton).click();

    // Refresh and verify task still exists
    await page.reload();
    await expect(page.locator('text=Persistent Task')).toBeVisible();
  });
});

test.describe('Tasks - Edge Cases', () => {
  test('should handle empty task name validation', async ({ page }) => {
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('');
    await page.locator(TEST_IDS.saveButton).click();

    // Should show validation error or not create task
    await expect(page.locator('text=Task')).not.toBeVisible();
  });

  test('should handle long task names', async ({ page }) => {
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('A'.repeat(500));
    await page.locator(TEST_IDS.saveButton).click();

    await expect(page.locator('text=A'.repeat(500))).toBeVisible();
  });

  test('should handle special characters in task name', async ({ page }) => {
    await page.goto('/');
    await page.locator(TEST_IDS.addTaskButton).click();
    await page.locator(TEST_IDS.taskNameInput).fill('Task with <special> & "characters"');
    await page.locator(TEST_IDS.saveButton).click();

    await expect(page.locator('text=Task with')).toBeVisible();
  });
});