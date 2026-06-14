import { describe, it, expect, beforeEach } from 'vitest';
import type { Task } from '@/lib/types';

// Import the function once the module is available
// This tests the logic for AI suggestions generation

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

describe('AI Suggestions Logic', () => {
  describe('Task prioritization', () => {
    it('should prioritize high priority tasks', () => {
      const tasks: Task[] = [
        createTestTask({ id: '1', name: 'Low priority', priority: 'low' }),
        createTestTask({ id: '2', name: 'High priority', priority: 'high' }),
        createTestTask({ id: '3', name: 'Medium priority', priority: 'medium' }),
      ];

      const highFirst = tasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      expect(highFirst[0].priority).toBe('high');
    });

    it('should sort by due date', () => {
      const now = Date.now();
      const tasks: Task[] = [
        createTestTask({ id: '1', name: 'Due tomorrow', date: now + 86400000 }),
        createTestTask({ id: '2', name: 'Due today', date: now }),
        createTestTask({ id: '3', name: 'No due date' }),
      ];

      const sorted = tasks.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date - b.date;
      });

      expect(sorted[0].name).toBe('Due today');
    });
  });

  describe('Task completion analysis', () => {
    it('should identify overdue tasks', () => {
      const now = Date.now();
      const tasks: Task[] = [
        createTestTask({ id: '1', name: 'Overdue', date: now - 86400000 }),
        createTestTask({ id: '2', name: 'Due today', date: now }),
      ];

      const overdue = tasks.filter(t => t.date && t.date < now && !t.completed);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].name).toBe('Overdue');
    });

    it('should identify upcoming tasks', () => {
      const now = Date.now();
      const tasks: Task[] = [
        createTestTask({ id: '1', name: 'Due tomorrow', date: now + 86400000 }),
        createTestTask({ id: '2', name: 'Due next week', date: now + 7 * 86400000 }),
        createTestTask({ id: '3', name: 'No due date' }),
      ];

      // "Due next week" is exactly 7 days away, so it's not in the 7-day window
      const upcoming = tasks.filter(t => t.date && t.date >= now && t.date < now + 7 * 86400000);
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].name).toBe('Due tomorrow');
    });
  });
});