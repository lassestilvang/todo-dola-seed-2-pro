export const TEST_IDS = {
  addTaskButton: '[data-testid="add-task-button"]',
  taskNameInput: '[data-testid="task-name-input"]',
  saveTaskButton: '[data-testid="save-task-button"]',
  taskItem: '[data-testid="task-item"]',
  emptyState: '[data-testid="empty-state"]',
  completeTaskButton: '[data-testid="complete-task-button"]',
  deleteTaskButton: '[data-testid="delete-task-button"]',
  confirmButton: '[data-testid="confirm-button"]',
  searchBox: '[data-testid="search-box"]',
  filterButton: '[data-testid="filter-button"]',
} as const;

export type TestId = typeof TEST_IDS[keyof typeof TEST_IDS];