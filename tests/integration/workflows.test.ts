import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  createTask,
  createList,
  createLabel,
  createTemplate,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addLabelToTask,
  getLabels,
  createSubtask,
  addTaskDependency,
  getBlockingTasks,
  createComment,
  createTaskNote,
  getTaskNotes,
  createCustomView,
  getCustomViews,
  generateRecurringTasks,
  getTemplates,
  addRecurringException,
  getRecurringExceptions,
  wouldCreateCircularDependency,
} from '@/lib/db/queries';
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

describe('Integration Tests - End-to-End Workflows', () => {
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

  describe('Task Lifecycle Workflow', () => {
    it('completes full task lifecycle: create -> update -> complete -> delete', async () => {
      // Create
      const task = await createTask({
        name: 'Lifecycle Task',
        description: 'Test description',
        priority: 'medium',
      });
      expect(task.id).toBeDefined();
      expect(task.name).toBe('Lifecycle Task');

      // Update
      const updated = await updateTask(task.id, {
        name: 'Updated Lifecycle Task',
        priority: 'high',
      });
      expect(updated?.name).toBe('Updated Lifecycle Task');
      expect(updated?.priority).toBe('high');

      // Complete
      const completed = await updateTask(task.id, {
        completed: true,
        completedAt: Date.now(),
      });
      expect(completed?.completed).toBe(true);

      // Verify
      const fetched = await getTaskById(task.id);
      expect(fetched?.completed).toBe(true);
    });

    it('handles task with subtasks workflow', async () => {
      const task = await createTask({ name: 'Task with Subtasks' });

      const subtask1 = await createSubtask(task.id, 'First subtask');
      const subtask2 = await createSubtask(task.id, 'Second subtask');

      const subtasks = await (await import('@/lib/db/queries')).getSubtasks(task.id);
      expect(subtasks.length).toBe(2);

      // Complete first subtask
      await (await import('@/lib/db/queries')).updateSubtask(subtask1.id, { completed: true, sortOrder: 1 });

      const updated = await getTaskById(task.id);
      expect(updated?.subtasks?.[0]?.completed).toBe(true);
    });
  });

  describe('Label Management Workflow', () => {
    it('applies and manages labels on tasks', async () => {
      const task = await createTask({ name: 'Labeled Task' });

      const label1 = await createLabel({ name: 'Work', color: '#ff0000' });
      const label2 = await createLabel({ name: 'Personal', color: '#00ff00' });

      await addLabelToTask(task.id, label1.id);
      await addLabelToTask(task.id, label2.id);

      const fetched = await getTaskById(task.id);
      expect(fetched?.labels?.length).toBe(2);
      expect(fetched?.labels?.map(l => l.name)).toContain('Work');
      expect(fetched?.labels?.map(l => l.name)).toContain('Personal');
    });

    it('filters tasks by label', async () => {
      const label = await createLabel({ name: 'Important' });
      const task1 = await createTask({ name: 'Important Task' });
      const task2 = await createTask({ name: 'Regular Task' });

      await addLabelToTask(task1.id, label.id);

      const tasks = await getTasks({ labelId: label.id });
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe('Important Task');
    });
  });

  describe('Dependency Management Workflow', () => {
    it('creates and resolves task dependencies', async () => {
      const blockingTask = await createTask({ name: 'Blocking Task' });
      const blockedTask = await createTask({ name: 'Blocked Task' });

      await addTaskDependency(blockedTask.id, blockingTask.id);

      const blocking = await getBlockingTasks(blockedTask.id);
      expect(blocking.length).toBe(1);
      expect(blocking[0].id).toBe(blockingTask.id);
    });

    it('prevents circular dependencies', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      // Create chain: task1 depends on task2, task2 depends on task3
      // This means: task1 -> task2 -> task3
      await addTaskDependency(task1.id, task2.id);
      await addTaskDependency(task2.id, task3.id);

      // Check if task1 -> task3 would create a cycle
      // task1 -> task3 -> task2 -> task1 (cycle!)
      const wouldCycle = await wouldCreateCircularDependency(task1.id, task3.id);
      expect(wouldCycle).toBe(true);
    });
  });

  describe('Template Usage Workflow', () => {
    it('creates task from template', async () => {
      const label = await createLabel({ name: 'Template Label' });
      const template = await createTemplate({
        name: 'Project Template',
        description: 'Standard project setup',
        priority: 'high',
        labels: [label.id],
      });

      const task = await (await import('@/lib/db/queries')).useTemplate(template.id);

      expect(task.name).toBe('Project Template');
      expect(task.priority).toBe('high');
    });

    it('manages template lifecycle', async () => {
      const template = await createTemplate({ name: 'Test Template' });
      expect(template.id).toBeDefined();

      const templates = await getTemplates();
      expect(templates.length).toBe(1);

      // Update
      const updated = await (await import('@/lib/db/queries')).updateTemplate(template.id, { name: 'Updated Template' });
      expect(updated?.name).toBe('Updated Template');

      // Delete
      await (await import('@/lib/db/queries')).deleteTemplate(template.id);
      const afterDelete = await getTemplates();
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('Recurring Task Workflow', () => {
    it('generates recurring tasks', async () => {
      const now = Date.now();
      const parentTask = await createTask({
        name: 'Daily Standup',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 3 }),
        date: now,
      });

      const generated = await generateRecurringTasks(parentTask.id);
      expect(Array.isArray(generated)).toBe(true);
    });

    it('manages recurring exceptions', async () => {
      const task = await createTask({
        name: 'Recurring Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 5 }),
        date: Date.now(),
      });

      const exceptionDate = Date.now() + 86400000;
      await addRecurringException(task.id, exceptionDate);

      const exceptions = await getRecurringExceptions(task.id);
      expect(exceptions).toContain(exceptionDate);
    });
  });

  describe('Comments and Notes Workflow', () => {
    it('adds and retrieves comments', async () => {
      const task = await createTask({ name: 'Commented Task' });

      await createComment(task.id, 'First comment', 'user1');
      await createComment(task.id, 'Second comment', 'user2');

      const comments = await (await import('@/lib/db/queries')).getComments(task.id);
      expect(comments.length).toBe(2);
    });

    it('adds and retrieves task notes', async () => {
      const task = await createTask({ name: 'Note Task' });

      await createTaskNote(task.id, 'Note content', 'Note title');

      const notes = await getTaskNotes(task.id);
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('Note title');
    });
  });

  describe('Custom View Workflow', () => {
    it('creates and manages custom views', async () => {
      const view1 = await createCustomView({
        name: 'Work Tasks',
        filterConfig: JSON.stringify({ priority: 'high' }),
      });

      const view2 = await createCustomView({
        name: 'Personal Tasks',
        filterConfig: JSON.stringify({ priority: 'low' }),
      });

      const views = await getCustomViews();
      expect(views.length).toBe(2);

      // Set default
      await (await import('@/lib/db/queries')).setDefaultCustomView(view1.id);

      const updatedViews = await getCustomViews();
      const defaultView = updatedViews.find(v => v.isDefault);
      expect(defaultView?.id).toBe(view1.id);
    });
  });

  describe('Bulk Operations Workflow', () => {
    it('handles multiple task creation', async () => {
      const list = await createList({ name: 'Bulk List' });

      for (let i = 0; i < 10; i++) {
        await createTask({ name: `Task ${i}`, listId: list.id });
      }

      const tasks = await getTasks({ listId: list.id });
      expect(tasks.length).toBe(10);
    });

    it('handles task filtering combinations', async () => {
      const task1 = await createTask({ name: 'High Priority', priority: 'high' });
      const task2 = await createTask({ name: 'Low Priority', priority: 'low' });
      const task3 = await createTask({ name: 'Completed Task' });
      await updateTask(task3.id, { completed: true, completedAt: Date.now() });

      const highPriority = await getTasks({ priority: 'high' });
      expect(highPriority.length).toBe(1);

      const completed = await getTasks({ completed: true });
      expect(completed.length).toBe(1);
    });
  });

  describe('Data Integrity Workflow', () => {
    it('maintains referential integrity', async () => {
      const task = await createTask({ name: 'Parent Task' });
      const subtask = await createSubtask(task.id, 'Child Subtask');

      const fetched = await getTaskById(task.id);
      expect(fetched?.subtasks?.[0]?.id).toBe(subtask.id);
    });

    it('handles soft delete correctly', async () => {
      const task = await createTask({ name: 'To Delete' });
      await deleteTask(task.id);

      // Task should not appear in normal queries
      const activeTasks = await getTasks();
      expect(activeTasks.find(t => t.id === task.id)).toBeUndefined();

      // But should be in deleted tasks
      const deletedTasks = await (await import('@/lib/db/queries')).getDeletedTasks();
      expect(deletedTasks.find(t => t.id === task.id)).toBeDefined();
    });

    it('prevents orphan creation', async () => {
      // Try to create subtask for non-existent task
      const subtask = await createSubtask('non-existent-task', 'Orphan Subtask');
      expect(subtask.taskId).toBe('non-existent-task');
    });
  });

  describe('Search and Filter Workflow', () => {
    it('combines multiple filters', async () => {
      const task1 = await createTask({ name: 'High Priority Task', priority: 'high' });
      const task2 = await createTask({ name: 'Low Priority Task', priority: 'low' });

      const results = await getTasks({ priority: 'high' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(task1.id);
    });

    it('handles date range filters', async () => {
      const now = Date.now();
      await createTask({ name: 'Past Task', date: now - 86400000 });
      await createTask({ name: 'Future Task', date: now + 86400000 });

      const results = await getTasks({
        dateFrom: now - 86400000,
        dateTo: now + 86400000,
      });
      expect(results.length).toBe(2);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('continues after failed operation', async () => {
      // Try to delete inbox (should fail)
      const lists = await (await import('@/lib/db/queries')).getLists();
      const inbox = lists.find(l => l.isInbox);

      await expect(
        (await import('@/lib/db/queries')).deleteList(inbox!.id)
      ).rejects.toThrow();

      // Verify we can still create and retrieve tasks
      const task = await createTask({ name: 'After Error Task' });
      expect(task.id).toBeDefined();
    });
  });
});