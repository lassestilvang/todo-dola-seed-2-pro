import { expect, test, describe, beforeEach } from 'vitest';
import {
  PrioritySchema,
  TaskListSchema,
  TaskListCreateSchema,
  LabelSchema,
  LabelCreateSchema,
  SubtaskSchema,
  SubtaskCreateSchema,
  TaskSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  RecurringConfigSchema,
  TaskTemplateSchema,
} from '@/lib/schemas';
import { resetIdCounter } from '../factories';

describe('Schema Validation', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('PrioritySchema', () => {
    test('accepts valid priority values', () => {
      expect(PrioritySchema.safeParse('high').success).toBe(true);
      expect(PrioritySchema.safeParse('medium').success).toBe(true);
      expect(PrioritySchema.safeParse('low').success).toBe(true);
      expect(PrioritySchema.safeParse('none').success).toBe(true);
    });

    test('rejects invalid priority values', () => {
      expect(PrioritySchema.safeParse('urgent').success).toBe(false);
      expect(PrioritySchema.safeParse('critical').success).toBe(false);
      expect(PrioritySchema.safeParse('').success).toBe(false);
      expect(PrioritySchema.safeParse(null).success).toBe(false);
      expect(PrioritySchema.safeParse(undefined).success).toBe(false);
    });

    test('rejects numeric priority', () => {
      expect(PrioritySchema.safeParse(1).success).toBe(false);
    });
  });

  describe('TaskListSchema', () => {
    test('validates required fields', () => {
      const result = TaskListSchema.safeParse({
        id: '1',
        name: 'Test List',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const result = TaskListSchema.safeParse({ name: 'Test' });
      expect(result.success).toBe(false);
    });

    test('rejects invalid color format', () => {
      const result = TaskListSchema.safeParse({
        id: '1',
        name: 'Test',
        color: 'red',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid hex colors', () => {
      const shortHex = TaskListSchema.safeParse({
        id: '1', name: 'Test', color: '#fff', createdAt: 0, updatedAt: 0,
      }).success;
      const longHex = TaskListSchema.safeParse({
        id: '1', name: 'Test', color: '#ffffff', createdAt: 0, updatedAt: 0,
      }).success;
      expect(shortHex && longHex).toBe(true);
    });
  });

  describe('TaskListCreateSchema', () => {
    test('validates required name field', () => {
      const result = TaskListCreateSchema.safeParse({ emoji: '📋' });
      expect(result.success).toBe(false);
    });

    test('accepts valid list data', () => {
      const result = TaskListCreateSchema.safeParse({
        name: 'My List',
        emoji: '📋',
        color: '#ff0000',
        sortOrder: 1,
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty name', () => {
      const result = TaskListCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    test('accepts optional fields', () => {
      const result = TaskListCreateSchema.safeParse({
        name: 'Minimal List',
        emoji: undefined,
        color: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('LabelSchema', () => {
    test('validates required fields', () => {
      const result = LabelSchema.safeParse({
        id: '1',
        name: 'Work',
        emoji: '🏷️',
        color: '#3b82f6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const result = LabelSchema.safeParse({ emoji: '🏷️' });
      expect(result.success).toBe(false);
    });

    test('rejects invalid color format', () => {
      const result = LabelSchema.safeParse({
        id: '1',
        name: 'Test',
        color: 'blue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LabelCreateSchema', () => {
    test('validates required name field', () => {
      const result = LabelCreateSchema.safeParse({ emoji: '🏷️' });
      expect(result.success).toBe(false);
    });

    test('accepts valid label data', () => {
      const result = LabelCreateSchema.safeParse({
        name: 'Work',
        emoji: '💼',
        color: '#3b82f6',
      });
      expect(result.success).toBe(true);
    });

    test('accepts optional fields', () => {
      const result = LabelCreateSchema.safeParse({ name: 'Minimal' });
      expect(result.success).toBe(true);
      expect(result.data?.emoji).toBeUndefined();
      expect(result.data?.color).toBeUndefined();
    });
  });

  describe('SubtaskSchema', () => {
    test('validates required fields', () => {
      const result = SubtaskSchema.safeParse({
        taskId: 'task-1',
        name: 'Subtask 1',
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing taskId', () => {
      const result = SubtaskSchema.safeParse({ name: 'Subtask 1' });
      expect(result.success).toBe(false);
    });

    test('rejects empty name', () => {
      const result = SubtaskSchema.safeParse({ taskId: 'task-1', name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('SubtaskCreateSchema', () => {
    test('requires taskId and name', () => {
      const result = SubtaskCreateSchema.safeParse({ taskId: 'task-1' });
      expect(result.success).toBe(false);
    });

    test('accepts valid subtask data', () => {
      const result = SubtaskCreateSchema.safeParse({
        taskId: 'task-1',
        name: 'New Subtask',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskSchema', () => {
    test('validates complete task object', () => {
      const result = TaskSchema.safeParse({
        id: '1',
        listId: 'inbox',
        name: 'Test Task',
        description: 'Description',
        date: Date.now(),
        deadline: Date.now() + 86400000,
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
        labels: [],
        subtasks: [],
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const result = TaskSchema.safeParse({ name: 'Test' });
      expect(result.success).toBe(false);
    });

    test('accepts null optional fields', () => {
      const result = TaskSchema.safeParse({
        id: '1',
        listId: 'inbox',
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
        labels: [],
        subtasks: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskCreateSchema', () => {
    test('validates required name field', () => {
      const result = TaskCreateSchema.safeParse({ listId: 'inbox' });
      expect(result.success).toBe(false);
    });

    test('rejects empty name', () => {
      const result = TaskCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    test('accepts valid minimal task data', () => {
      const result = TaskCreateSchema.safeParse({ name: 'Test Task' });
      expect(result.success).toBe(true);
    });

    test('accepts valid task data with all fields', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Complete Task',
        description: 'Full description',
        priority: 'high',
        listId: 'inbox',
        completed: true,
        date: Date.now(),
        deadline: Date.now() + 86400000,
        estimate: 30,
        actualTime: 15,
        labels: ['label-1', 'label-2'],
      });
      expect(result.success).toBe(true);
    });

    test('accepts null optional fields', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Task',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
      });
      expect(result.success).toBe(true);
    });

    test('rejects invalid priority', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Task',
        priority: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid recurringType', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Task',
        recurringType: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TaskUpdateSchema', () => {
    test('accepts partial updates', () => {
      const result = TaskUpdateSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    test('accepts multiple field updates', () => {
      const result = TaskUpdateSchema.safeParse({
        name: 'Updated',
        priority: 'high',
        completed: true,
      });
      expect(result.success).toBe(true);
    });

    test('accepts null values for optional fields', () => {
      const result = TaskUpdateSchema.safeParse({
        description: null,
        deadline: null,
        recurringType: null,
        recurringConfig: null,
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty name if provided', () => {
      const result = TaskUpdateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('RecurringConfigSchema', () => {
    test('accepts valid config', () => {
      const result = RecurringConfigSchema.safeParse({
        type: 'daily',
        interval: 1,
      });
      expect(result.success).toBe(true);
    });

    test('accepts all recurrence types', () => {
      expect(RecurringConfigSchema.safeParse({ type: 'daily', interval: 1 }).success).toBe(true);
      expect(RecurringConfigSchema.safeParse({ type: 'weekly', interval: 1 }).success).toBe(true);
      expect(RecurringConfigSchema.safeParse({ type: 'monthly', interval: 1 }).success).toBe(true);
      expect(RecurringConfigSchema.safeParse({ type: 'yearly', interval: 1 }).success).toBe(true);
    });

    test('rejects invalid type', () => {
      const result = RecurringConfigSchema.safeParse({
        type: 'biannually',
        interval: 1,
      });
      expect(result.success).toBe(false);
    });

    test('rejects interval less than 1', () => {
      const result = RecurringConfigSchema.safeParse({
        type: 'daily',
        interval: 0,
      });
      expect(result.success).toBe(false);
    });

    test('accepts optional endDate and maxOccurrences', () => {
      const result = RecurringConfigSchema.safeParse({
        type: 'monthly',
        interval: 1,
        endDate: Date.now() + 86400000 * 30,
        maxOccurrences: 10,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskTemplateSchema', () => {
    test('requires name', () => {
      const result = TaskTemplateSchema.safeParse({
        description: 'Test',
        listId: 'inbox',
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid template data', () => {
      const result = TaskTemplateSchema.safeParse({
        name: 'Meeting Template',
        description: 'Weekly team meeting',
        listId: 'work',
        priority: 'high',
        labels: ['label-1'],
      });
      expect(result.success).toBe(true);
    });

    test('accepts minimal template data', () => {
      const result = TaskTemplateSchema.safeParse({ name: 'Minimal Template' });
      expect(result.success).toBe(true);
    });
  });
});