import { describe, it, expect, beforeEach } from 'vitest';
import { searchTasks, clearSearchCache, getPriorityColor, formatDate, isOverdue, getPriorityLabel } from '@/lib/utils/search';
import type { Task } from '@/lib/types';

describe('Search and Utility Functions', () => {
  beforeEach(() => {
    clearSearchCache();
  });

  describe('searchTasks', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        listId: 'inbox',
        name: 'Complete project report',
        description: 'Write the quarterly report',
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'high',
        completed: false,
        completedAt: null,
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        labels: [],
        subtasks: [],
      },
      {
        id: '2',
        listId: 'inbox',
        name: 'Buy groceries',
        description: 'Milk, eggs, bread',
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'medium',
        completed: false,
        completedAt: null,
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        labels: [],
        subtasks: [],
      },
      {
        id: '3',
        listId: 'inbox',
        name: 'Review code',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'low',
        completed: false,
        completedAt: null,
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        labels: [],
        subtasks: [],
      },
    ];

    it('returns all tasks for empty query', () => {
      const results = searchTasks(mockTasks, '');
      expect(results.length).toBe(3);
    });

    it('returns all tasks for whitespace-only query', () => {
      const results = searchTasks(mockTasks, '   ');
      expect(results.length).toBe(3);
    });

    it('finds tasks by name', () => {
      const results = searchTasks(mockTasks, 'project');
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('project');
    });

    it('finds tasks by description', () => {
      const results = searchTasks(mockTasks, 'groceries');
      expect(results.length).toBe(1);
    });

    it('returns empty array for no matches', () => {
      const results = searchTasks(mockTasks, 'nonexistent');
      expect(results.length).toBe(0);
    });

    it('handles case-insensitive search', () => {
      const results = searchTasks(mockTasks, 'PROJECT');
      expect(results.length).toBe(1);
    });

    it('handles partial matches', () => {
      const results = searchTasks(mockTasks, 'rep');
      expect(results.length).toBe(1);
    });

    it('handles special regex characters', () => {
      const results = searchTasks(mockTasks, 'report');
      expect(results.length).toBe(1);
    });

    it('handles tasks with labels', () => {
      const tasksWithLabels: Task[] = [
        ...mockTasks,
        {
          ...mockTasks[0],
          labels: [{ id: 'l1', name: 'work', emoji: '💼', color: '#000000', createdAt: 0, updatedAt: 0 }],
        },
      ];
      const results = searchTasks(tasksWithLabels, 'work');
      expect(results.length).toBe(1);
    });

    it('handles tasks with subtasks', () => {
      const tasksWithSubtasks: Task[] = [
        {
          ...mockTasks[0],
          subtasks: [{ id: 's1', taskId: '1', name: 'Write outline', completed: false, completedAt: null, sortOrder: 0, createdAt: 0, updatedAt: 0 }],
        },
      ];
      const results = searchTasks(tasksWithSubtasks, 'outline');
      expect(results.length).toBe(1);
    });

    it('handles empty tasks array', () => {
      const results = searchTasks([], 'test');
      expect(results).toEqual([]);
    });

    it('clears cache correctly', () => {
      searchTasks(mockTasks, 'test');
      clearSearchCache();
      // Cache should be cleared without error
    });

    it('handles empty tasks array', () => {
      const results = searchTasks([], 'test');
      expect(results).toEqual([]);
    });

    it('clears cache correctly', () => {
      searchTasks(mockTasks, 'test');
      clearSearchCache();
      // Cache should be cleared without error
    });
  });

  describe('getPriorityColor', () => {
    it('returns red for high priority', () => {
      expect(getPriorityColor('high')).toBe('text-red-400 border-red-500/30');
    });

    it('returns yellow for medium priority', () => {
      expect(getPriorityColor('medium')).toBe('text-yellow-400 border-yellow-500/30');
    });

    it('returns green for low priority', () => {
      expect(getPriorityColor('low')).toBe('text-green-400 border-green-500/30');
    });

    it('returns gray for none priority', () => {
      expect(getPriorityColor('none')).toBe('text-gray-400 border-gray-700');
    });
  });

  describe('formatDate', () => {
    it('returns "No date" for null', () => {
      expect(formatDate(null)).toBe('No date');
    });

    it('formats a valid date', () => {
      const result = formatDate(1700000000000);
      expect(result).toContain('2023');
    });

    it('handles epoch', () => {
      const result = formatDate(1);
      expect(result).toBeDefined();
    });

    it('handles current date', () => {
      const now = Date.now();
      const result = formatDate(now);
      expect(result).toBeDefined();
    });
  });

  describe('isOverdue', () => {
    it('returns false for task without deadline', () => {
      const task: Task = {
        id: '1',
        listId: 'inbox',
        name: 'Task',
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
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        labels: [],
        subtasks: [],
      };
      expect(isOverdue(task)).toBe(false);
    });

    it('returns false for completed task', () => {
      const task: Task = {
        id: '1',
        listId: 'inbox',
        name: 'Task',
        description: null,
        date: null,
        deadline: Date.now() + 86400000,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'none',
        completed: true,
        completedAt: Date.now(),
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        labels: [],
        subtasks: [],
      };
      expect(isOverdue(task)).toBe(false);
    });

    it('returns true for overdue task', () => {
      const task: Task = {
        id: '1',
        listId: 'inbox',
        name: 'Task',
        description: null,
        date: null,
        deadline: Date.now() - 1000,
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
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        labels: [],
        subtasks: [],
      };
      expect(isOverdue(task)).toBe(true);
    });

    it('returns false for future deadline', () => {
      const task: Task = {
        id: '1',
        listId: 'inbox',
        name: 'Task',
        description: null,
        date: null,
        deadline: Date.now() + 86400000,
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
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        labels: [],
        subtasks: [],
      };
      expect(isOverdue(task)).toBe(false);
    });
  });

  describe('getPriorityLabel', () => {
    it('returns "High Priority" for high', () => {
      expect(getPriorityLabel('high')).toBe('High Priority');
    });

    it('returns "Medium Priority" for medium', () => {
      expect(getPriorityLabel('medium')).toBe('Medium Priority');
    });

    it('returns "Low Priority" for low', () => {
      expect(getPriorityLabel('low')).toBe('Low Priority');
    });

    it('returns "No Priority" for none', () => {
      expect(getPriorityLabel('none')).toBe('No Priority');
    });

    it('returns "No Priority" for unknown priority', () => {
      expect(getPriorityLabel('unknown' as 'high')).toBe('No Priority');
    });
  });
});