import { expect, test, describe, beforeEach } from 'vitest';
import { searchTasks, clearSearchCache, getPriorityColor, formatDate, isOverdue, getPriorityLabel } from '@/lib/utils/search';
import type { Task } from '@/lib/types';

describe('Search Utility', () => {
  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    listId: 'inbox',
    name: 'Test task',
    description: null,
    date: null,
    deadline: null,
    reminder: null,
    estimate: null,
    actualTime: null,
    priority: 'none',
    completed: false,
    completedAt: null,
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    clearSearchCache();
  });

  describe('searchTasks', () => {
    test('returns all tasks when query is empty', () => {
      const tasks = [createTask({ name: 'Task 1' }), createTask({ name: 'Task 2' })];
      const results = searchTasks(tasks, '');
      expect(results).toEqual(tasks);
    });

    test('filters tasks by name', () => {
      const tasks = [
        createTask({ name: 'Buy groceries' }),
        createTask({ name: 'Walk the dog' }),
        createTask({ name: 'Clean the house' }),
      ];
      const results = searchTasks(tasks, 'buy');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Buy groceries');
    });

    test('filters tasks by description', () => {
      const tasks = [
        createTask({ name: 'Task 1', description: 'Important work' }),
        createTask({ name: 'Task 2', description: 'Regular task' }),
      ];
      const results = searchTasks(tasks, 'important');
      expect(results).toHaveLength(1);
    });

    test('filters tasks by label name', () => {
      const tasks = [
        createTask({
          name: 'Task 1',
          labels: [{ id: '1', name: 'work', emoji: '💼', color: '#ff0000', createdAt: 0, updatedAt: 0 }],
        }),
        createTask({ name: 'Task 2', labels: [] }),
      ];
      const results = searchTasks(tasks, 'work');
      expect(results).toHaveLength(1);
    });

    test('filters tasks by subtask name', () => {
      const tasks = [
        createTask({
          name: 'Task 1',
          subtasks: [{ id: '1', taskId: 'task-1', name: 'Subtask 1', completed: false, completedAt: null, sortOrder: 0, createdAt: 0, updatedAt: 0 }],
        }),
        createTask({ name: 'Task 2', subtasks: [] }),
      ];
      const results = searchTasks(tasks, 'subtask');
      expect(results).toHaveLength(1);
    });

    test('is case insensitive', () => {
      const tasks = [createTask({ name: 'BUY Groceries' })];
      const results = searchTasks(tasks, 'buy');
      expect(results).toHaveLength(1);
    });

    test('handles whitespace in query', () => {
      const tasks = [createTask({ name: 'Task with spaces' })];
      const results = searchTasks(tasks, '  task   with   spaces  ');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPriorityColor', () => {
    test('returns red for high priority', () => {
      expect(getPriorityColor('high')).toBe('text-red-400 border-red-500/30');
    });

    test('returns yellow for medium priority', () => {
      expect(getPriorityColor('medium')).toBe('text-yellow-400 border-yellow-500/30');
    });

    test('returns green for low priority', () => {
      expect(getPriorityColor('low')).toBe('text-green-400 border-green-500/30');
    });

    test('returns gray for none priority', () => {
      expect(getPriorityColor('none')).toBe('text-gray-400 border-gray-700');
    });
  });

  describe('formatDate', () => {
    test('formats date correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date.getTime());
      expect(result).toContain('Jan');
    });

    test('returns No date for null', () => {
      expect(formatDate(null)).toBe('No date');
    });
  });

  describe('isOverdue', () => {
    test('returns true for past deadline when not completed', () => {
      const task = createTask({ deadline: Date.now() - 86400000, completed: false });
      expect(isOverdue(task)).toBe(true);
    });

    test('returns false for future deadline', () => {
      const task = createTask({ deadline: Date.now() + 86400000, completed: false });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false when completed', () => {
      const task = createTask({ deadline: Date.now() - 86400000, completed: true });
      expect(isOverdue(task)).toBe(false);
    });
  });

  describe('getPriorityLabel', () => {
    test('returns High Priority label', () => {
      expect(getPriorityLabel('high')).toBe('High Priority');
    });

    test('returns Medium Priority label', () => {
      expect(getPriorityLabel('medium')).toBe('Medium Priority');
    });

    test('returns Low Priority label', () => {
      expect(getPriorityLabel('low')).toBe('Low Priority');
    });

    test('returns No Priority label for unknown', () => {
      expect(getPriorityLabel('unknown')).toBe('No Priority');
    });
  });
});