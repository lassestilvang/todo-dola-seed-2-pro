import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  createTask,
  createSubtask,
  getSubtasks,
  updateSubtask,
  deleteSubtask,
  createLabel,
  getLabels,
  deleteLabel,
  addLabelToTask,
  removeLabelFromTask,
  getTaskDependencies,
  removeTaskDependency,
  getTemplates,
  createTemplate,
  deleteTemplate,
  getTaskHistory,
  updateTask,
} from '@/lib/db/queries';
import * as queries from '@/lib/db/queries';
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

describe('Database - Additional Entities', () => {
  beforeAll(async () => {
    try {
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
    } catch (e) {
      // Ignore file access errors
    }
    await initDb();
  });

  afterAll(() => {
    resetDb();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  describe('Subtasks', () => {
    it('should create a subtask', async () => {
      const task = await createTask({ name: 'Parent Task' });
      const subtask = await createSubtask(task.id, 'Subtask 1');

      expect(subtask).toHaveProperty('id');
      expect(subtask.name).toBe('Subtask 1');
      expect(subtask.taskId).toBe(task.id);
      expect(subtask.completed).toBe(false);
    });

    it('should fetch subtasks for a task', async () => {
      const task = await createTask({ name: 'Parent Task' });
      await createSubtask(task.id, 'Subtask 1');
      await createSubtask(task.id, 'Subtask 2');

      const subtasks = await getSubtasks(task.id);
      expect(subtasks).toHaveLength(2);
    });

    it('should update a subtask', async () => {
      const task = await createTask({ name: 'Parent Task' });
      const subtask = await createSubtask(task.id, 'Original Name');

      const updated = await updateSubtask(subtask.id, { name: 'Updated Name', sortOrder: 0 });
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete a subtask', async () => {
      const task = await createTask({ name: 'Parent Task' });
      const subtask = await createSubtask(task.id, 'To Delete');

      const success = await deleteSubtask(subtask.id);
      expect(success).toBe(true);

      const subtasks = await getSubtasks(task.id);
      expect(subtasks).toHaveLength(0);
    });
  });

  describe('Labels', () => {
    it('should create a label', async () => {
      const label = await createLabel({
        name: 'Work',
        emoji: '💼',
        color: '#3b82f6',
      });

      expect(label).toHaveProperty('id');
      expect(label.name).toBe('Work');
    });

    it('should fetch labels', async () => {
      await createLabel({ name: 'Label 1', emoji: '🏷️', color: '#ff0000' });
      await createLabel({ name: 'Label 2', emoji: '📌', color: '#00ff00' });

      const labels = await getLabels();
      expect(labels.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete a label', async () => {
      const label = await createLabel({ name: 'To Delete', emoji: '🏷️', color: '#ff0000' });

      const success = await deleteLabel(label.id);
      expect(success).toBe(true);
    });

    it('should add label to task', async () => {
      const task = await createTask({ name: 'Task' });
      const label = await createLabel({ name: 'Label', emoji: '🏷️', color: '#ff0000' });

      await addLabelToTask(task.id, label.id);

      const tasks = await (await import('@/lib/db/queries')).getTasks({ view: 'all' });
      expect(tasks[0]?.labels).toHaveLength(1);
      expect(tasks[0]?.labels?.[0]?.name).toBe('Label');
    });

    it('should remove label from task', async () => {
      const task = await createTask({ name: 'Task' });
      const label = await createLabel({ name: 'Label', emoji: '🏷️', color: '#ff0000' });

      await addLabelToTask(task.id, label.id);
      let tasks = await (await import('@/lib/db/queries')).getTasks({ view: 'all' });
      expect(tasks[0].labels).toHaveLength(1);

      await removeLabelFromTask(task.id, label.id);
      tasks = await (await import('@/lib/db/queries')).getTasks({ view: 'all' });
      expect(tasks[0].labels).toHaveLength(0);
    });
  });

  describe('Task Dependencies', () => {
    it('should create a task dependency', async () => {
      const parentTask = await createTask({ name: 'Parent' });
      const childTask = await createTask({ name: 'Child' });

      const dependency = await queries.addTaskDependency(childTask.id, parentTask.id);
      expect(dependency).toHaveProperty('id');
      expect(dependency.taskId).toBe(childTask.id);
      expect(dependency.dependsOnTaskId).toBe(parentTask.id);
    });

    it('should get task dependencies', async () => {
      const parentTask = await createTask({ name: 'Parent' });
      const childTask = await createTask({ name: 'Child' });

      await queries.addTaskDependency(childTask.id, parentTask.id);

      const dependencies = await getTaskDependencies(childTask.id);
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].dependsOnTaskId).toBe(parentTask.id);
    });

    it('should delete a task dependency', async () => {
      const parentTask = await createTask({ name: 'Parent' });
      const childTask = await createTask({ name: 'Child' });

      await queries.addTaskDependency(childTask.id, parentTask.id);
      const success = await removeTaskDependency(childTask.id, parentTask.id);
      expect(success).toBe(true);

      const dependencies = await getTaskDependencies(childTask.id);
      expect(dependencies).toHaveLength(0);
    });
  });

  describe('Templates', () => {
    it('should create a template', async () => {
      const template = await createTemplate({
        name: 'Task Template',
        description: 'Template description',
        listId: 'inbox',
        priority: 'high',
      });

      expect(template).toHaveProperty('id');
      expect(template.name).toBe('Task Template');
    });

    it('should fetch templates', async () => {
      await createTemplate({ name: 'Template 1' });
      await createTemplate({ name: 'Template 2' });

      const templates = await getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete a template', async () => {
      const template = await createTemplate({ name: 'To Delete' });

      const success = await deleteTemplate(template.id);
      expect(success).toBe(true);
    });
  });

  describe('Task History', () => {
    it('should track task changes', async () => {
      const task = await createTask({ name: 'Original' });
      await updateTask(task.id, { name: 'Updated' });

      const history = await getTaskHistory(task.id);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });
});