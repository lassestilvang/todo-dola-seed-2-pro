import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'db', 'planner.db');

async function cleanDb() {
  const db = await initDb();
  const tables = [
    'task_history', 'template_labels', 'task_templates', 'subtasks',
    'task_labels', 'tasks', 'labels', 'task_dependencies',
    'time_entries', 'comments', 'task_notes', 'custom_views',
    'shared_tasks', 'recurring_exceptions'
  ];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.exec("UPDATE lists SET name = 'Inbox' WHERE is_inbox = 1");
  saveDb();
}

describe('Security Tests', () => {
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

  describe('Input Sanitization', () => {
    it('handles SQL injection in task name', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const maliciousNames = [
        "'; DROP TABLE tasks; --",
        "1; SELECT * FROM tasks",
        "' OR '1'='1",
        "'; INSERT INTO tasks VALUES (1, 'hacked'); --",
      ];

      for (const name of maliciousNames) {
        const task = await createTask({ name, listId: 'inbox' });
        expect(task.name).toBe(name);
      }

      // Verify tasks table still exists and has correct count
      const { getTasks } = await import('@/lib/db/queries');
      const tasks = await getTasks();
      expect(tasks.length).toBe(maliciousNames.length);
    });

    it('handles SQL injection in list name', async () => {
      const { createList, getLists } = await import('@/lib/db/queries');
      const maliciousName = "'); DELETE FROM lists; --";

      await createList({ name: maliciousName, isInbox: false });

      const lists = await getLists();
      const injectedList = lists.find(l => l.name === maliciousName);
      expect(injectedList).toBeDefined();
    });

    it('handles XSS-like content in task description', async () => {
      const { createTask, getTaskById } = await import('@/lib/db/queries');
      const xssContent = '<script>alert("xss")</script> <img src=x onerror=alert(1)>';

      const task = await createTask({ name: 'Test', description: xssContent, listId: 'inbox' });
      const fetched = await getTaskById(task.id);

      // The content should be stored as-is (sanitization happens at display layer)
      expect(fetched?.description).toBe(xssContent);
    });

    it('handles null byte injection', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const task = await createTask({ name: 'Test\x00Task', listId: 'inbox' });
      expect(task.name).toContain('Test');
    });

    it('handles very long input strings', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const longName = 'A'.repeat(10000);
      const task = await createTask({ name: longName, listId: 'inbox' });
      expect(task.name.length).toBe(10000);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('handles path-like strings in task name', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const task = await createTask({
        name: '../../../etc/passwd',
        listId: 'inbox'
      });
      expect(task.name).toBe('../../../etc/passwd');
    });
  });

  describe('Unicode and Special Character Handling', () => {
    it('handles emoji in task names', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const task = await createTask({
        name: 'Task 🎉🎊',
        listId: 'inbox'
      });
      expect(task.name).toContain('🎉');
    });

    it('handles control characters', async () => {
      const { createTask } = await import('@/lib/db/queries');
      const task = await createTask({
        name: 'Task with \n newlines \t and \r carriage returns',
        listId: 'inbox'
      });
      expect(task.name).toContain('newlines');
    });
  });

  describe('Authorization Boundary Tests', () => {
    it('cannot delete inbox list', async () => {
      const { getLists, deleteList } = await import('@/lib/db/queries');
      const lists = await getLists();
      const inbox = lists.find(l => l.isInbox);
      await expect(deleteList(inbox!.id)).rejects.toThrow('Cannot delete the inbox list');
    });

    it('handles invalid UUID formats', async () => {
      const { getTaskById, getListById } = await import('@/lib/db/queries');

      const invalidIds = ['not-a-uuid', '', 'null', 'undefined', '12345'];

      for (const id of invalidIds) {
        expect(await getTaskById(id)).toBeNull();
        expect(await getListById(id)).toBeNull();
      }
    });
  });

  describe('Data Integrity', () => {
    it('maintains referential integrity', async () => {
      const { createTask, addLabelToTask, getTaskById } = await import('@/lib/db/queries');
      const task = await createTask({ name: 'Task' });
      const { createLabel } = await import('@/lib/db/queries');
      const label = await createLabel({ name: 'Label' });

      await addLabelToTask(task.id, label.id);
      const fetched = await getTaskById(task.id);
      expect(fetched?.labels?.[0]?.id).toBe(label.id);
    });

    it('handles concurrent modifications gracefully', async () => {
      const { createTask, updateTask } = await import('@/lib/db/queries');
      const task = await createTask({ name: 'Task' });

      // Multiple updates should not corrupt data
      for (let i = 0; i < 10; i++) {
        await updateTask(task.id, { name: `Updated ${i}` });
      }

      const { getTaskById } = await import('@/lib/db/queries');
      const updated = await getTaskById(task.id);
      expect(updated?.name).toBe('Updated 9');
    });
  });
});