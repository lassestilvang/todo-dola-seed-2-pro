import { describe, it, expect } from 'vitest';
import { searchTasks } from '@/lib/utils/search';
import type { Task } from '@/lib/types';

function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-' + Math.random(),
    listId: 'inbox',
    name: 'Test Task',
    description: null,
    priority: 'none',
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

describe('Utility Functions', () => {
  describe('searchTasks', () => {
    const testTasks: Task[] = [
      createTestTask({ id: '1', name: 'Buy groceries', description: 'Milk, eggs, bread' }),
      createTestTask({ id: '2', name: 'Finish report', description: 'Quarterly sales report', priority: 'high' }),
      createTestTask({ id: '3', name: 'Call client meeting', description: 'Schedule with Sarah', priority: 'medium' }),
    ];

    it('returns all tasks on empty query', () => {
      expect(searchTasks(testTasks, '')).toHaveLength(3);
    });

    it('matches partial words', () => {
      const results = searchTasks(testTasks, 'gro');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Buy groceries');
    });

    it('fuzzy matches with typos', () => {
      const results = searchTasks(testTasks, 'grocereis');
      expect(results.length).toBe(1);
    });

    it('is case insensitive', () => {
      const results = searchTasks(testTasks, 'REPORT');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Finish report');
    });

    it('prioritizes name matches over description', () => {
      const results = searchTasks(testTasks, 'report');
      expect(results[0].name).toBe('Finish report');
    });

    it('handles empty task array', () => {
      expect(searchTasks([], 'test')).toEqual([]);
    });

    it('handles tasks without labels', () => {
      const results = searchTasks(testTasks, 'groceries');
      expect(results.length).toBe(1);
    });

    it('handles special characters in search', () => {
      const specialTasks = [
        createTestTask({ id: '7', name: 'Fix bug #123', description: 'Issue with #hashtag' }),
      ];
      const results = searchTasks(specialTasks, '#123');
      expect(results.length).toBe(1);
    });
  });
});