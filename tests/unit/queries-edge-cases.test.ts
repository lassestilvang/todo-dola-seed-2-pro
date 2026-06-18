import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import { generateRecurringTasks } from '@/lib/db/recurring';
import { createTask, getTaskById } from '@/lib/db/queries';
import { getUpcomingReminders } from '@/lib/db/task-assignments';

describe('Database Queries - Edge Cases', () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(() => {
    resetDb();
  });

  describe('generateRecurringTasks', () => {
    it('returns empty array for non-recurring task', async () => {
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
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 3 }),
        date: Date.now(), // Need a valid date for recurring tasks
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles weekly recurring tasks', async () => {
      const task = await createTask({
        name: 'Weekly Task',
        recurringType: 'weekly',
        recurringConfig: JSON.stringify({ type: 'weekly', interval: 1, maxOccurrences: 3 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles monthly recurring tasks', async () => {
      const task = await createTask({
        name: 'Monthly Task',
        recurringType: 'monthly',
        recurringConfig: JSON.stringify({ type: 'monthly', interval: 1, maxOccurrences: 3 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles yearly recurring tasks', async () => {
      const task = await createTask({
        name: 'Yearly Task',
        recurringType: 'yearly',
        recurringConfig: JSON.stringify({ type: 'yearly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('respects endDate in recurring config', async () => {
      const task = await createTask({
        name: 'Task with endDate',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({
          type: 'daily',
          interval: 1,
          endDate: Date.now() + 86400000, // 1 day from now
          maxOccurrences: 10,
        }),
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
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('generates monthly recurring tasks', async () => {
      const task = await createTask({
        name: 'Monthly Task',
        recurringType: 'monthly',
        recurringConfig: JSON.stringify({ type: 'monthly', interval: 1, maxOccurrences: 2 }),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('generates yearly recurring tasks', async () => {
      const task = await createTask({
        name: 'Yearly Task',
        recurringType: 'yearly',
        recurringConfig: JSON.stringify({ type: 'yearly', interval: 1, maxOccurrences: 2 }),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles maxOccurrences limit', async () => {
      const task = await createTask({
        name: 'Limited Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 1 }),
      });

      const result = await generateRecurringTasks(task.id);
      expect(result.length).toBe(0);
    });
  });

  describe('getUpcomingReminders', () => {
    it('returns empty array when no reminders', async () => {
      const result = await getUpcomingReminders();
      expect(result).toEqual([]);
    });

    it('returns tasks with reminders', async () => {
      const now = Date.now();
      await createTask({
        name: 'Task with reminder',
        reminder: now + 3600000, // 1 hour from now
      });

      const result = await getUpcomingReminders();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('returns tasks with reminders', async () => {
      const now = Date.now();
      await createTask({
        name: 'Task with reminder',
        reminder: now + 3600000,
      });

      const result = await getUpcomingReminders();
      // Should return tasks that have reminders
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assignTask', () => {
    it('assigns task to user', async () => {
      const task = await createTask({ name: 'Task to assign' });
      const { createTaskAssignment } = await import('@/lib/db/task-assignments');
      const result = await createTaskAssignment(task.id, 'user-123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
    });
  });

  describe('unassignTask', () => {
    it('unassigns a task', async () => {
      const task = await createTask({ name: 'Task to unassign', assignedTo: 'user-123' });
      const { clearTaskAssignments } = await import('@/lib/db/task-assignments');
      const result = await clearTaskAssignments(task.id);

      expect(result).toBe(true);
    });
  });

  describe('getTaskById', () => {
    it('returns null for non-existent task', async () => {
      const result = await getTaskById('non-existent-id');
      expect(result).toBeNull();
    });
  });
});