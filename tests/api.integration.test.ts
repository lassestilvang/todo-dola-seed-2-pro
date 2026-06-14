import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from '@/lib/db/queries';
import { TaskCreateSchema, TaskUpdateSchema } from '@/lib/schemas';
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

// Mock Next.js API request context
type ApiHandler = (req: { method: string; json: () => Promise<any> }) => Promise<Response>;

describe('API Integration Tests', () => {
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

  describe('Task API Handler Simulation', () => {
    it('should handle GET /api/tasks - list all', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });

      const tasks = await getTasks({ view: 'all' });
      expect(tasks.length).toBe(2);
    });

    it('should handle GET /api/tasks - with filters', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      // Update one task to completed
      await updateTask(task1.id, { completed: true, completedAt: Date.now() });

      const completed = await getTasks({ completed: true });
      expect(completed.length).toBe(1);
      expect(completed[0].name).toBe('Task 1');
    });

    it('should handle POST /api/tasks - create', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Test description',
        priority: 'high' as const,
        listId: 'inbox',
      };

      const validated = TaskCreateSchema.safeParse(taskData);
      expect(validated.success).toBe(true);

      if (validated.success) {
        const task = await createTask(taskData);
        expect(task.name).toBe('New Task');
        expect(task.priority).toBe('high');
      }
    });

    it('should handle POST /api/tasks - validation error', async () => {
      const result = TaskCreateSchema.safeParse({ listId: 'inbox' });
      expect(result.success).toBe(false);
    });

    it('should handle PUT /api/tasks/[id] - update', async () => {
      const task = await createTask({ name: 'Original' });

      const updateData = { name: 'Updated' };
      const validated = TaskUpdateSchema.safeParse(updateData);
      expect(validated.success).toBe(true);

      if (validated.success) {
        const updated = await updateTask(task.id, updateData);
        expect(updated?.name).toBe('Updated');
      }
    });

    it('should handle DELETE /api/tasks/[id]', async () => {
      const task = await createTask({ name: 'To Delete' });
      const success = await deleteTask(task.id);
      expect(success).toBe(true);

      const deleted = await getTaskById(task.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return null for non-existent task', async () => {
      const task = await getTaskById('non-existent-id');
      expect(task).toBeNull();
    });

    it('should return null when updating non-existent task', async () => {
      const updated = await updateTask('non-existent-id', { name: 'Updated' });
      expect(updated).toBeNull();
    });
  });
});