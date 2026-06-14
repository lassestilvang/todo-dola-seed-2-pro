import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskListSchema,
  TaskListCreateSchema,
  LabelSchema,
  LabelCreateSchema,
  TaskSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  SubtaskSchema,
  SubtaskCreateSchema,
  RecurringConfigSchema,
  TaskTemplateSchema,
  PrioritySchema,
} from '@/lib/schemas/index';
import { searchTasks, clearSearchCache, getPriorityColor, formatDate, isOverdue } from '@/lib/utils/search';
import type { Task, Priority } from '@/lib/types';

describe('Schema Validation - Property-Based Style Tests', () => {
  describe('PrioritySchema - Valid Values', () => {
    const validPriorities: Priority[] = ['high', 'medium', 'low', 'none'];

    validPriorities.forEach(priority => {
      it(`accepts valid priority: ${priority}`, () => {
        expect(() => PrioritySchema.parse(priority)).not.toThrow();
      });
    });
  });

  describe('PrioritySchema - Invalid Values', () => {
    const invalidPriorities = ['urgent', 'HIGH', '', 'normal', '1', null, 123, undefined];

    invalidPriorities.forEach((priority, i) => {
      it(`rejects invalid priority at index ${i}`, () => {
        expect(() => PrioritySchema.parse(priority as any)).toThrow();
      });
    });
  });

  describe('TaskListSchema - Valid Values', () => {
    it('accepts valid task list', () => {
      const validList = {
        id: 'test-id',
        name: 'Test List',
        emoji: '📋',
        color: '#ff0000',
        isInbox: false,
        sortOrder: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(() => TaskListSchema.parse(validList)).not.toThrow();
    });

    ['#abc', '#ABCDEF', '#123456'].forEach(color => {
      it(`accepts valid color: ${color}`, () => {
        const list = TaskListSchema.parse({
          id: 'test-id',
          name: 'Test',
          emoji: '📋',
          color,
          isInbox: false,
          sortOrder: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        expect(list.color).toBe(color);
      });
    });
  });

  describe('LabelSchema - Valid Values', () => {
    it('accepts valid label', () => {
      const validLabel = {
        id: 'label-id',
        name: 'Test Label',
        emoji: '🏷️',
        color: '#3b82f6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(() => LabelSchema.parse(validLabel)).not.toThrow();
    });
  });

  describe('TaskCreateSchema - Valid Values', () => {
    const validNames = [
      'Simple Task',
      'Task with description',
      'Task with special chars: @#$%',
      'Task with unicode: 🎉',
      'A'.repeat(100),
    ];

    validNames.forEach((name, i) => {
      it(`accepts valid name at index ${i}`, () => {
        const result = TaskCreateSchema.parse({ name });
        expect(result.name).toBe(name);
      });
    });
  });

  describe('TaskCreateSchema - Default Values', () => {
    it('applies defaults for optional fields', () => {
      const result = TaskCreateSchema.parse({ name: 'Test' });
      expect(result.name).toBe('Test');
    });
  });

  describe('RecurringConfigSchema - Valid Values', () => {
    const types: Array<'daily' | 'weekly' | 'monthly' | 'yearly'> = ['daily', 'weekly', 'monthly', 'yearly'];

    types.forEach(type => {
      it(`accepts valid recurring type: ${type}`, () => {
        const result = RecurringConfigSchema.parse({ type, interval: 1 });
        expect(result.type).toBe(type);
      });
    });

    it('uses default interval', () => {
      const result = RecurringConfigSchema.parse({ type: 'daily' });
      expect(result.interval).toBe(1);
    });

    [0, -1, -10].forEach(interval => {
      it(`rejects invalid interval: ${interval}`, () => {
        expect(() => RecurringConfigSchema.parse({ type: 'daily', interval })).toThrow();
      });
    });
  });

  describe('Search Function Properties', () => {
    const mockTasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      listId: 'inbox',
      name: `Task ${i}`,
      description: `Description ${i}`,
      date: null,
      deadline: null,
      reminder: null,
      estimate: null,
      actualTime: null,
      priority: ['high', 'medium', 'low', 'none'][i % 4] as Priority,
      completed: i % 2 === 0,
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
    }));

    it('returns all tasks for empty query', () => {
      const results = searchTasks(mockTasks, '');
      expect(results.length).toBe(mockTasks.length);
    });

    it('returns consistent results for same query', () => {
      clearSearchCache();
      const results1 = searchTasks(mockTasks, 'Task');
      const results2 = searchTasks(mockTasks, 'Task');
      expect(results1.length).toBe(results2.length);
    });

    it('handles empty task array', () => {
      const results = searchTasks([], 'test');
      expect(results).toEqual([]);
    });
  });

  describe('Utility Function Properties', () => {
    it('getPriorityColor returns string for valid priorities', () => {
      const priorities: Priority[] = ['high', 'medium', 'low', 'none'];
      priorities.forEach(priority => {
        const color = getPriorityColor(priority);
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    it('formatDate handles null', () => {
      expect(formatDate(null)).toBe('No date');
    });

    it('isOverdue returns boolean', () => {
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
      expect(typeof isOverdue(task)).toBe('boolean');
    });
  });

  describe('Round-Trip Tests', () => {
    it('task survives serialization round-trip', () => {
      const original: Task = {
        id: 'task-id',
        listId: 'list-id',
        name: 'Test Task',
        description: 'Description',
        date: Date.now(),
        deadline: Date.now() + 86400000,
        reminder: null,
        estimate: 60,
        actualTime: 30,
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
      };

      const parsed = TaskSchema.parse(original);
      expect(parsed.id).toBe(original.id);
      expect(parsed.name).toBe(original.name);
      expect(parsed.priority).toBe(original.priority);
    });
  });

  describe('Edge Case Tests', () => {
    it('handles null values in optional fields', () => {
      const task = TaskSchema.parse({
        id: 'task-id',
        listId: 'list-id',
        name: 'Test',
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
      });
      expect(task.description).toBeNull();
    });

    it('handles very long strings', () => {
      const longString = 'A'.repeat(10000);
      const task = TaskSchema.parse({
        id: 'task-id',
        listId: 'list-id',
        name: longString,
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
      });
      expect(task.name.length).toBe(10000);
    });

    it('handles special characters', () => {
      const task = TaskCreateSchema.parse({
        name: "Task with 'quotes' and \"double quotes\" and @#$%^&*()",
      });
      expect(task.name).toContain('quotes');
    });

    it('handles unicode characters', () => {
      const task = TaskCreateSchema.parse({
        name: '任务 🎉 café',
      });
      expect(task.name).toContain('任务');
    });
  });
});