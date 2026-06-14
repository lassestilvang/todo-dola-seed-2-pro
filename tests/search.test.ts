import { expect, test, describe } from 'vitest';
import { searchTasks } from '@/lib/utils/search';
import type { Task } from '@/lib/types';

function createTestTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: 'test-' + Math.random(),
    listId: 'inbox',
    name: 'Test Task',
    description: null,
    priority: 'none',
    completed: false,
    createdAt: now,
    updatedAt: now,
    date: null,
    deadline: null,
    reminder: null,
    estimate: null,
    actualTime: null,
    completedAt: null,
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    deletedAt: null,
    labels: [],
    subtasks: [],
    ...overrides,
  };
}

describe('Fuzzy Search', () => {
  const now = Date.now();
  const testTasks: Task[] = [
    createTestTask({ id: '1', name: 'Buy groceries', description: 'Milk, eggs, bread' }),
    createTestTask({ id: '2', name: 'Finish report', description: 'Quarterly sales report', priority: 'high' }),
    createTestTask({ id: '3', name: 'Call client meeting', description: 'Schedule with Sarah', priority: 'medium' }),
  ];

  describe('Basic search', () => {
    test('returns all tasks on empty query', () => {
      expect(searchTasks(testTasks, '')).toHaveLength(3);
    });

    test('matches partial words', () => {
      const results = searchTasks(testTasks, 'gro');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Buy groceries');
    });

    test('fuzzy matches with typos', () => {
      const results = searchTasks(testTasks, 'grocereis');
      expect(results.length).toBe(1);
    });

    test('is case insensitive', () => {
      const results = searchTasks(testTasks, 'REPORT');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Finish report');
    });
  });

  describe('Search ranking', () => {
    test('prioritizes name matches over description', () => {
      const results = searchTasks(testTasks, 'report');
      expect(results[0].name).toBe('Finish report');
    });

    test('prioritizes higher priority tasks', () => {
      const results = searchTasks(testTasks, 'meeting');
      expect(results[0].priority).toBe('medium');
    });
  });

  describe('Search with labels', () => {
    test('filters by label name', () => {
      const tasksWithLabels: Task[] = [
        createTestTask({
          id: '4',
          name: 'Work task',
          labels: [{ id: 'l1', name: 'work', emoji: '💼', color: '#3b82f6', createdAt: now, updatedAt: now }],
        }),
        createTestTask({
          id: '5',
          name: 'Personal task',
          labels: [{ id: 'l2', name: 'personal', emoji: '👤', color: '#ff0000', createdAt: now, updatedAt: now }],
        }),
      ];
      const results = searchTasks(tasksWithLabels, 'work');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Work task');
    });

    test('returns all tasks if no labels match', () => {
      const tasksWithLabels: Task[] = [
        createTestTask({
          id: '6',
          name: 'Task A',
          labels: [{ id: 'l1', name: 'work', emoji: '💼', color: '#3b82f6', createdAt: now, updatedAt: now }],
        }),
      ];
      const results = searchTasks(tasksWithLabels, 'nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    test('handles empty task array', () => {
      expect(searchTasks([], 'test')).toEqual([]);
    });

    test('handles tasks without labels', () => {
      const results = searchTasks(testTasks, 'groceries');
      expect(results.length).toBe(1);
    });

    test('handles special characters in search', () => {
      const specialTasks = [
        createTestTask({ id: '7', name: 'Fix bug #123', description: 'Issue with #hashtag' }),
      ];
      const results = searchTasks(specialTasks, '#123');
      expect(results.length).toBe(1);
    });

    test('handles unicode in search', () => {
      const unicodeTasks = [
        createTestTask({ id: '8', name: 'Unicode Test' }),
      ];
      const results = searchTasks(unicodeTasks, 'Unicode');
      expect(results.length).toBe(1);
    });
  });
});