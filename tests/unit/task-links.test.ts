import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, resetDb } from '@/lib/db';
import {
  createTaskLink,
  getTaskLinks,
  deleteTaskLink,
  getTaskLinksByType,
  getLinkedTasks,
  deleteTask,
} from '@/lib/db/queries';
import { createTask } from '@/lib/db/queries';

describe('Task Links', () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(() => {
    resetDb();
  });

  describe('createTaskLink', () => {
    it('creates a task link with valid data', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      const link = await createTaskLink(task1.id, task2.id, 'related');

      expect(link).toHaveProperty('id');
      expect(link.taskId).toBe(task1.id);
      expect(link.linkedTaskId).toBe(task2.id);
      expect(link.type).toBe('related');
      expect(link).toHaveProperty('createdAt');
    });

    it('creates a "blocks" link', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      const link = await createTaskLink(task1.id, task2.id, 'blocks');

      expect(link.type).toBe('blocks');
    });

    it('creates a "depends_on" link', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      const link = await createTaskLink(task1.id, task2.id, 'depends_on');

      expect(link.type).toBe('depends_on');
    });

    it('creates a "duplicate" link', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      const link = await createTaskLink(task1.id, task2.id, 'duplicate');

      expect(link.type).toBe('duplicate');
    });
  });

  describe('getTaskLinks', () => {
    it('returns empty array when no links exist', async () => {
      const task = await createTask({ name: 'Task' });
      const links = await getTaskLinks(task.id);
      expect(links).toEqual([]);
    });

    it('returns links for a task', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      await createTaskLink(task1.id, task2.id, 'related');
      await createTaskLink(task1.id, task3.id, 'blocks');

      const links = await getTaskLinks(task1.id);

      expect(links.length).toBe(2);
      const linkedTaskIds = links.map(l => l.linkedTaskId);
      expect(linkedTaskIds).toContain(task2.id);
      expect(linkedTaskIds).toContain(task3.id);
    });
  });

  describe('getTaskLinksByType', () => {
    it('filters links by type', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      await createTaskLink(task1.id, task2.id, 'related');
      await createTaskLink(task1.id, task3.id, 'blocks');

      const relatedLinks = await getTaskLinksByType(task1.id, 'related');
      const blocksLinks = await getTaskLinksByType(task1.id, 'blocks');

      expect(relatedLinks.length).toBe(1);
      expect(relatedLinks[0].type).toBe('related');
      expect(blocksLinks.length).toBe(1);
      expect(blocksLinks[0].type).toBe('blocks');
    });
  });

  describe('getLinkedTasks', () => {
    it('returns links where the task is the linked_task', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      await createTaskLink(task2.id, task1.id, 'blocks');
      await createTaskLink(task3.id, task1.id, 'related');

      const links = await getLinkedTasks(task1.id);

      expect(links.length).toBe(2);
    });
  });

  describe('deleteTaskLink', () => {
    it('deletes a task link', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });

      const link = await createTaskLink(task1.id, task2.id, 'related');
      await deleteTaskLink(link.id);

      const links = await getTaskLinks(task1.id);
      expect(links.length).toBe(0);
    });
  });

  describe('deleteTask cleanup', () => {
    it('removes task links when task is deleted', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      await createTaskLink(task1.id, task2.id, 'blocks');
      await createTaskLink(task3.id, task1.id, 'related');

      // Verify links exist
      let links = await getTaskLinks(task1.id);
      expect(links.length).toBe(1);
      links = await getLinkedTasks(task1.id);
      expect(links.length).toBe(1);

      // Delete task1
      await deleteTask(task1.id);

      // Links should be removed
      links = await getTaskLinks(task1.id);
      expect(links.length).toBe(0);
      const linkedLinks = await getLinkedTasks(task1.id);
      expect(linkedLinks.length).toBe(0);
    });
  });
});