import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getLists,
  createList,
  getLabels,
  createLabel,
} from '@/lib/db/queries';
import { TaskCreateSchema, TaskUpdateSchema, TaskListCreateSchema, LabelCreateSchema } from '@/lib/schemas';
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
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM task_notes');
  db.exec('DELETE FROM custom_views');
  db.exec('DELETE FROM shared_tasks');
  db.exec('DELETE FROM recurring_exceptions');
  saveDb();
}

describe('API Routes - Integration Tests', () => {
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

  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await getTasks({ view: 'all' });
      expect(tasks).toEqual([]);
    });

    it('should return tasks filtered by listId', async () => {
      const list = await createList({ name: 'Test List' });
      await createTask({ name: 'Task 1', listId: list.id });
      await createTask({ name: 'Task 2', listId: 'inbox' });

      const tasks = await getTasks({ listId: list.id });
      expect(tasks.length).toBe(1);
      // Check the task exists (the DB returns snake_case keys)
      expect(tasks[0].name).toBe('Task 1');
    });

    it('should return tasks filtered by completed status', async () => {
      // Note: createTask doesn't persist completed status, so we need to use updateTask
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      // Update one task to completed
      await updateTask(task1.id, { completed: true, completedAt: Date.now() });

      const completed = await getTasks({ completed: true });
      const pending = await getTasks({ completed: false });

      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe(task1.id);
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(task2.id);
    });

    it('should return tasks filtered by priority', async () => {
      await createTask({ name: 'High Priority', priority: 'high' });
      await createTask({ name: 'Low Priority', priority: 'low' });

      const highPriority = await getTasks({ priority: 'high' });
      expect(highPriority.length).toBe(1);
      expect(highPriority[0].priority).toBe('high');
    });

    it('should limit results', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      await createTask({ name: 'Task 3' });

      const tasks = await getTasks({ limit: 2 });
      expect(tasks).toHaveLength(2);
    });

    it('should return tasks with subtasks', async () => {
      const task = await createTask({ name: 'Parent Task' });
      const { createSubtask } = await import('@/lib/db/queries');
      await createSubtask(task.id, 'Subtask 1');
      await createSubtask(task.id, 'Subtask 2');

      const tasks = await getTasks({ view: 'all' });
      expect(tasks[0].subtasks).toHaveLength(2);
    });

    it('should return tasks with labels', async () => {
      const label = await createLabel({ name: 'Test Label', emoji: '🏷️', color: '#ff0000' });
      const task = await createTask({ name: 'Task with Label' });

      const { addLabelToTask } = await import('@/lib/db/queries');
      await addLabelToTask(task.id, label.id);

      const tasks = await getTasks({ view: 'all' });
      expect(tasks[0]?.labels).toHaveLength(1);
      expect(tasks[0]?.labels?.[0]?.name).toBe('Test Label');
    });
  });

  describe('POST /api/tasks - Task Creation', () => {
    it('should create a task with valid data', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Task description',
        priority: 'high' as const,
        listId: 'inbox',
      };

      const validated = TaskCreateSchema.safeParse(taskData);
      expect(validated.success).toBe(true);

      const task = await createTask(validated.data as any);
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('New Task');
      expect(task.priority).toBe('high');
    });

    it('should fail validation without name', async () => {
      const result = TaskCreateSchema.safeParse({ listId: 'inbox' });
      expect(result.success).toBe(false);
    });

    it('should fail validation with empty name', async () => {
      const result = TaskCreateSchema.safeParse({ name: '', listId: 'inbox' });
      expect(result.success).toBe(false);
    });

    it('should accept valid task creation data with optional fields', async () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Valid Task',
        listId: 'inbox',
        description: 'Optional description',
        priority: 'low',
        completed: true,
        date: Date.now(),
        deadline: Date.now() + 86400000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('should update a task', async () => {
      const task = await createTask({ name: 'Original Name' });

      const updateData = { name: 'Updated Name' };
      const validated = TaskUpdateSchema.safeParse(updateData);
      expect(validated.success).toBe(true);

      const updated = await updateTask(task.id, validated.data as any);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should return null when updating non-existent task', async () => {
      const result = await updateTask('non-existent-id', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should soft delete a task', async () => {
      const task = await createTask({ name: 'To Delete' });

      const success = await deleteTask(task.id);
      expect(success).toBe(true);

      const deleted = await getTaskById(task.id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/lists', () => {
    it('should return inbox list by default', async () => {
      const lists = await getLists();
      const inbox = lists.find(l => l.isInbox);
      expect(inbox).toBeDefined();
      expect(inbox?.name).toBe('Inbox');
    });

    it('should create a list', async () => {
      const list = await createList({
        name: 'New List',
        emoji: '📋',
        color: '#ff0000',
      });

      expect(list).toHaveProperty('id');
      expect(list.name).toBe('New List');
    });

    it('should validate list creation', () => {
      const result = TaskListCreateSchema.safeParse({ emoji: '📋' });
      expect(result.success).toBe(false);
    });
  });

  describe('GET /api/labels', () => {
    it('should create a label', async () => {
      const label = await createLabel({
        name: 'New Label',
        emoji: '🏷️',
        color: '#3b82f6',
      });

      expect(label).toHaveProperty('id');
      expect(label.name).toBe('New Label');
    });

    it('should validate label creation', () => {
      const result = LabelCreateSchema.safeParse({ emoji: '🏷️' });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with all null optional fields', async () => {
      const task = await createTask({
        name: 'Minimal Task',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        completedAt: null,
      });
      expect(task.name).toBe('Minimal Task');
    });

    it('should handle updating task with same values', async () => {
      const task = await createTask({ name: 'Same Name' });
      const updated = await updateTask(task.id, { name: 'Same Name' });
      expect(updated?.name).toBe('Same Name');
    });

    it('should handle task with multiple labels', async () => {
      const label1 = await createLabel({ name: 'Label 1' });
      const label2 = await createLabel({ name: 'Label 2' });
      const task = await createTask({ name: 'Multi-Label Task' });
      const updated = await updateTask(task.id, { labels: [label1, label2] });
      expect(updated).toBeDefined();
    });

    it('should handle empty string in name validation', async () => {
      const result = TaskCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should handle very long task name', async () => {
      const longName = 'A'.repeat(500);
      const result = TaskCreateSchema.safeParse({ name: longName });
      expect(result.success).toBe(true);
    });

    it('should handle task with priority variations', async () => {
      const highTask = await createTask({ name: 'High', priority: 'high' });
      const mediumTask = await createTask({ name: 'Medium', priority: 'medium' });
      const lowTask = await createTask({ name: 'Low', priority: 'low' });
      const noneTask = await createTask({ name: 'None', priority: 'none' });

      expect(highTask.priority).toBe('high');
      expect(mediumTask.priority).toBe('medium');
      expect(lowTask.priority).toBe('low');
      expect(noneTask.priority).toBe('none');
    });

    it('should handle list ordering', async () => {
      const list1 = await createList({ name: 'List A' });
      const list2 = await createList({ name: 'List B' });

      const lists = await getLists();
      expect(lists.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle task with future date', async () => {
      const futureDate = Date.now() + 86400000 * 30;
      const task = await createTask({ name: 'Future Task', date: futureDate });
      expect(task.date).toBe(futureDate);
    });

    it('should handle task with past date', async () => {
      const pastDate = Date.now() - 86400000;
      const task = await createTask({ name: 'Past Task', date: pastDate });
      expect(task.date).toBe(pastDate);
    });
  });
});