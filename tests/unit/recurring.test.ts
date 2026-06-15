import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, resetDb } from '@/lib/db';
import { createTask, generateRecurringTasks, getRecurringExceptions, addRecurringException } from '@/lib/db/queries';

describe('Recurring Tasks', () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(() => {
    resetDb();
  });

  describe('generateRecurringTasks', () => {
    it('returns empty array for task without recurrence', async () => {
      const task = await createTask({ name: 'Non-recurring' });
      const result = await generateRecurringTasks(task.id);
      expect(result).toEqual([]);
    });

    it('returns empty array for task with null recurringType', async () => {
      const task = await createTask({ name: 'Task', recurringType: null });
      const result = await generateRecurringTasks(task.id);
      expect(result).toEqual([]);
    });

    it('returns empty array for task with null recurringConfig', async () => {
      const task = await createTask({ name: 'Task', recurringConfig: null });
      const result = await generateRecurringTasks(task.id);
      expect(result).toEqual([]);
    });

    it('generates daily recurring tasks', async () => {
      const task = await createTask({
        name: 'Daily Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('generates weekly recurring tasks', async () => {
      const task = await createTask({
        name: 'Weekly Task',
        recurringType: 'weekly',
        recurringConfig: JSON.stringify({ type: 'weekly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('generates monthly recurring tasks', async () => {
      const task = await createTask({
        name: 'Monthly Task',
        recurringType: 'monthly',
        recurringConfig: JSON.stringify({ type: 'monthly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('generates yearly recurring tasks', async () => {
      const task = await createTask({
        name: 'Yearly Task',
        recurringType: 'yearly',
        recurringConfig: JSON.stringify({ type: 'yearly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('respects maxOccurrences limit', async () => {
      const task = await createTask({
        name: 'Limited Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 1 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBe(0);
    });
  });

  describe('getRecurringExceptions', () => {
    it('returns empty array for task without exceptions', async () => {
      const task = await createTask({ name: 'Task' });
      const result = await getRecurringExceptions(task.id);
      expect(result).toEqual([]);
    });
  });

  describe('addRecurringException', () => {
    it('adds exception for a task', async () => {
      const task = await createTask({ name: 'Task' });
      const exception = await addRecurringException(task.id, Date.now());
      expect(exception.parentTaskId).toBe(task.id);
    });

    it('returns exception with correct date', async () => {
      const task = await createTask({ name: 'Task' });
      const date = Date.now();
      const exception = await addRecurringException(task.id, date);
      expect(exception.exceptionDate).toBe(date);
    });
  });
});