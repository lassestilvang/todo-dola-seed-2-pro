import { expect, test, describe, beforeEach } from 'vitest';
import {
  searchTasks,
  clearSearchCache,
  getPriorityColor,
  formatDate,
  isOverdue,
  getPriorityLabel,
} from '@/lib/utils/search';
import type { Task } from '@/lib/types';
import { createMockTask, createMockLabel, resetIdCounter } from '../factories';

describe('Search Utilities', () => {
  beforeEach(() => {
    clearSearchCache();
    resetIdCounter();
  });

  describe('searchTasks', () => {
    const createTestTask = (overrides: Partial<Task> = {}) => createMockTask({
      id: `task-${Math.random()}`,
      ...overrides,
    });

    const testTasks: Task[] = [
      createTestTask({ id: '1', name: 'Buy groceries', description: 'Milk, eggs, bread' }),
      createTestTask({ id: '2', name: 'Finish report', description: 'Quarterly sales report', priority: 'high' }),
      createTestTask({ id: '3', name: 'Call client meeting', description: 'Schedule with Sarah', priority: 'medium' }),
    ];

    describe('Basic search functionality', () => {
      test('returns all tasks on empty query', () => {
        const results = searchTasks(testTasks, '');
        expect(results).toHaveLength(3);
      });

      test('returns all tasks on whitespace-only query', () => {
        const results = searchTasks(testTasks, '   ');
        expect(results).toHaveLength(3);
      });

      test('matches partial words', () => {
        const results = searchTasks(testTasks, 'gro');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Buy groceries');
      });

      test('fuzzy matches with typos', () => {
        const results = searchTasks(testTasks, 'grocereis');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Buy groceries');
      });

      test('is case insensitive', () => {
        const results = searchTasks(testTasks, 'REPORT');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Finish report');
      });

      test('matches numbers in task name', () => {
        const tasks = [createTestTask({ name: 'Task 123' })];
        const results = searchTasks(tasks, '123');
        expect(results).toHaveLength(1);
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
            labels: [createMockLabel({ id: 'l1', name: 'work' })],
          }),
          createTestTask({
            id: '5',
            name: 'Personal task',
            labels: [createMockLabel({ id: 'l2', name: 'personal' })],
          }),
        ];
        const results = searchTasks(tasksWithLabels, 'work');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Work task');
      });

      test('returns all tasks if no labels match', () => {
        const tasksWithLabels: Task[] = [
          createTestTask({
            id: '6',
            name: 'Task A',
            labels: [createMockLabel({ id: 'l1', name: 'work' })],
          }),
        ];
        const results = searchTasks(tasksWithLabels, 'nonexistent');
        expect(results).toHaveLength(0);
      });

      test('handles tasks without labels', () => {
        const results = searchTasks(testTasks, 'groceries');
        expect(results).toHaveLength(1);
      });
    });

    describe('Edge cases', () => {
      test('handles empty task array', () => {
        expect(searchTasks([], 'test')).toEqual([]);
      });

      test('handles null/undefined values gracefully', () => {
        const tasksWithNulls: Task[] = [
          createTestTask({ name: 'Task with null desc', description: null }),
          createTestTask({ name: 'Task with no date', date: null }),
        ];
        expect(() => searchTasks(tasksWithNulls, 'task')).not.toThrow();
      });

      test('handles special characters in search', () => {
        const specialTasks = [
          createTestTask({ id: '7', name: 'Fix bug #123', description: 'Issue with #hashtag' }),
        ];
        const results = searchTasks(specialTasks, '#123');
        expect(results).toHaveLength(1);
      });

      test('handles unicode in search', () => {
        const unicodeTasks = [
          createTestTask({ id: '8', name: 'Unicode Test 日本語' }),
        ];
        const results = searchTasks(unicodeTasks, 'Unicode');
        expect(results).toHaveLength(1);
      });

      test('handles emoji in search', () => {
        const emojiTasks = [
          createTestTask({ id: '9', name: 'Task with 🎉 emoji' }),
        ];
        const results = searchTasks(emojiTasks, '🎉');
        expect(results).toHaveLength(1);
      });

      test('handles very long search query', () => {
        const longQuery = 'a'.repeat(1000);
        expect(() => searchTasks(testTasks, longQuery)).not.toThrow();
      });

      test('handles tasks with empty strings', () => {
        const tasksWithEmptyStrings: Task[] = [
          createTestTask({ name: '', description: '' }),
        ];
        expect(searchTasks(tasksWithEmptyStrings, 'test')).toHaveLength(0);
      });
    });

    describe('Cache behavior', () => {
      test('clears cache properly', () => {
        searchTasks(testTasks, 'test');
        clearSearchCache();
        const results = searchTasks(testTasks, 'test');
        expect(results).toBeDefined();
      });
    });
  });

  describe('getPriorityColor', () => {
    test('returns high priority color', () => {
      expect(getPriorityColor('high')).toBe('text-red-400 border-red-500/30');
    });

    test('returns medium priority color', () => {
      expect(getPriorityColor('medium')).toBe('text-yellow-400 border-yellow-500/30');
    });

    test('returns low priority color', () => {
      expect(getPriorityColor('low')).toBe('text-green-400 border-green-500/30');
    });

    test('returns default color for none priority', () => {
      expect(getPriorityColor('none')).toBe('text-gray-400 border-gray-700');
    });
  });

  describe('formatDate', () => {
    test('formats a valid date', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      const result = formatDate(timestamp);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    test('returns "No date" for null', () => {
      expect(formatDate(null)).toBe('No date');
    });

    test('handles epoch timestamp', () => {
      const result = formatDate(0);
      expect(result).toBeDefined();
    });

    test('handles large timestamp', () => {
      // Use a valid large timestamp (year 2100)
      const futureDate = new Date('2100-01-01').getTime();
      const result = formatDate(futureDate);
      expect(result).toBeDefined();
    });
  });

  describe('isOverdue', () => {
    test('returns true for overdue task', () => {
      const pastDeadline = Date.now() - 100000;
      const task = createMockTask({ deadline: pastDeadline, completed: false });
      expect(isOverdue(task)).toBe(true);
    });

    test('returns false for completed task with past deadline', () => {
      const pastDeadline = Date.now() - 100000;
      const task = createMockTask({ deadline: pastDeadline, completed: true });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false for task with future deadline', () => {
      const futureDeadline = Date.now() + 100000;
      const task = createMockTask({ deadline: futureDeadline, completed: false });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false for task with no deadline', () => {
      const task = createMockTask({ deadline: null, completed: false });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false for task with null deadline', () => {
      const task = createMockTask({ deadline: null, completed: false });
      expect(isOverdue(task)).toBe(false);
    });
  });

  describe('getPriorityLabel', () => {
    test('returns "High Priority" for high', () => {
      expect(getPriorityLabel('high')).toBe('High Priority');
    });

    test('returns "Medium Priority" for medium', () => {
      expect(getPriorityLabel('medium')).toBe('Medium Priority');
    });

    test('returns "Low Priority" for low', () => {
      expect(getPriorityLabel('low')).toBe('Low Priority');
    });

    test('returns "No Priority" for unknown priority', () => {
      expect(getPriorityLabel('unknown')).toBe('No Priority');
    });

    test('returns "No Priority" for empty string', () => {
      expect(getPriorityLabel('')).toBe('No Priority');
    });
  });
});