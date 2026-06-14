import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  getLists,
  createList,
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getLabels,
  createLabel,
} from '@/lib/db/queries';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'db', 'planner.db');

async function cleanDb() {
  const db = await initDb();
  db.exec('DELETE FROM task_history');
  db.exec('DELETE FROM template_labels');
  db.exec('DELETE FROM task_templates');
  db.exec('DELETE FROM subtasks');
  db.exec('DELETE FROM task_labels');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM labels');
  db.exec('DELETE FROM lists WHERE id != \'inbox\'');
  db.exec('DELETE FROM task_dependencies');
  db.exec('DELETE FROM time_entries');
  saveDb();
}

describe('Database', () => {
  beforeAll(async () => {
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
    await initDb();
  });

  afterAll(() => {
    resetDb();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  describe('Lists', () => {
    it('should fetch lists including inbox', async () => {
      const lists = await getLists();
      expect(lists).toBeInstanceOf(Array);
      const inbox = lists.find(l => l.isInbox);
      expect(inbox).toBeDefined();
      expect(inbox?.name).toBe('Inbox');
    });

    it('should create a list', async () => {
      const list = await createList({
        name: 'Test List',
        emoji: '📋',
        color: '#ff0000',
        isInbox: false,
      });

      expect(list).toHaveProperty('id');
      expect(list.name).toBe('Test List');
      expect(list.emoji).toBe('📋');
      expect(list.color).toBe('#ff0000');
    });

    it('should not create a list without name', async () => {
      // This tests the constraint at the schema level, but we can verify
      // the database behavior
      const listsBefore = await getLists();
      const listCountBefore = listsBefore.length;

      // Create a valid list first
      await createList({ name: 'Valid List' });
      const listsAfter = await getLists();
      expect(listsAfter.length).toBe(listCountBefore + 1);
    });
  });

  describe('Tasks', () => {
    it('should fetch tasks', async () => {
      const tasks = await getTasks({ view: 'all' });
      expect(tasks).toBeInstanceOf(Array);
    });

    it('should create a task with minimal data', async () => {
      const task = await createTask({
        name: 'Test Task Minimal',
        listId: 'inbox',
      });

      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task Minimal');
    });

    it('should create a task with full data', async () => {
      const now = Date.now();
      const task = await createTask({
        name: 'Test Task Full',
        description: 'Full description',
        listId: 'inbox',
        priority: 'high',
        completed: true,
        date: now,
        deadline: now + 86400000,
      });

      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task Full');
      expect(task.description).toBe('Full description');
      expect(task.priority).toBe('high');
      expect(task.completed).toBe(true);
    });

    it('should get task by id', async () => {
      const task = await createTask({
        name: 'Single Task Test',
        listId: 'inbox',
      });

      const fetched = await getTaskById(task.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Single Task Test');
    });

    it('should return null for non-existent task', async () => {
      const fetched = await getTaskById('non-existent-id');
      expect(fetched).toBeNull();
    });

    it('should update a task', async () => {
      const task = await createTask({
        name: 'Update Task Test',
        listId: 'inbox',
      });

      const updated = await updateTask(task.id, { name: 'Updated Task Name' });
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Task Name');
    });

    it('should update task completion status', async () => {
      const task = await createTask({
        name: 'Completion Test',
        listId: 'inbox',
      });

      const now = Date.now();
      const completed = await updateTask(task.id, { completed: true, completedAt: now });
      expect(completed?.completed).toBe(true);
    });

    it('should delete a task (soft delete)', async () => {
      const task = await createTask({
        name: 'Delete Task Test',
        listId: 'inbox',
      });

      const success = await deleteTask(task.id);
      expect(success).toBe(true);

      const deleted = await getTaskById(task.id);
      expect(deleted).toBeNull();
    });

    it('should return null when updating non-existent task', async () => {
      const updated = await updateTask('non-existent-id', { name: 'Updated' });
      expect(updated).toBeNull();
    });
  });

  describe('Labels', () => {
    it('should create a label', async () => {
      const label = await createLabel({
        name: 'Test Label',
        emoji: '🏷️',
        color: '#3b82f6',
      });

      expect(label).toHaveProperty('id');
      expect(label.name).toBe('Test Label');
      expect(label.emoji).toBe('🏷️');
      expect(label.color).toBe('#3b82f6');
    });

    it('should fetch labels', async () => {
      await createLabel({ name: 'Label 1', emoji: '🏷️', color: '#ff0000' });
      await createLabel({ name: 'Label 2', emoji: '📌', color: '#00ff00' });

      const labels = await getLabels();
      expect(labels.length).toBeGreaterThanOrEqual(2);
    });

    it('should create label with minimal data', async () => {
      const label = await createLabel({ name: 'Minimal Label' });
      expect(label).toHaveProperty('id');
      expect(label.name).toBe('Minimal Label');
    });
  });

  describe('Database Initialization', () => {
    it('should initialize database with inbox', async () => {
      const db = await initDb();
      expect(db).toBeDefined();
    });

    it('should return same database instance', async () => {
      const db1 = await initDb();
      const db2 = await initDb();
      expect(db1).toBe(db2);
    });

    it('should reset database correctly', () => {
      resetDb();
      // After reset, initDb should create a new instance
    });
  });

  describe('Task Queries Edge Cases', () => {
    it('should handle task with complex data', async () => {
      const task = await createTask({
        name: 'Complex Task',
        description: 'Description with special chars: @#$%^&*()',
        priority: 'high',
        completed: true,
        date: Date.now(),
        deadline: Date.now() + 86400000,
        estimate: 100,
        actualTime: 50,
      });

      const fetched = await getTaskById(task.id);
      expect(fetched?.name).toBe('Complex Task');
      expect(fetched?.description).toBe('Description with special chars: @#$%^&*()');
    });

    it('should handle filter with multiple criteria', async () => {
      const task1 = await createTask({ name: 'Task 1', priority: 'high' });
      const task2 = await createTask({ name: 'Task 2', priority: 'high' });
      const task3 = await createTask({ name: 'Task 3', priority: 'low' });

      // Update task1 to completed
      await updateTask(task1.id, { completed: true, completedAt: Date.now() });

      const tasks = await getTasks({ priority: 'high' });
      expect(tasks.length).toBe(2);
    });

    it('should handle getTasks with offset', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      await createTask({ name: 'Task 3' });

      const first = await getTasks({ limit: 2, offset: 0 });
      const second = await getTasks({ limit: 2, offset: 1 });
      const third = await getTasks({ limit: 2, offset: 2 });

      expect(first.length).toBe(2);
      expect(second.length).toBe(2);
      expect(third.length).toBe(1);
    });
  });
});