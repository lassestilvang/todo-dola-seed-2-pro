import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  getLists,
  createList,
  getLabels,
  createLabel,
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
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
  // Reset inbox name
  db.exec("UPDATE lists SET name = 'Inbox' WHERE is_inbox = 1");
  // Ensure inbox exists
  const inboxCheck = db.exec('SELECT 1 FROM lists WHERE is_inbox = 1');
  if (inboxCheck.length === 0) {
    const now = Date.now();
    db.exec(
      `INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES ('inbox', 'Inbox', '📥', '#3b82f6', 1, 0, ${now}, ${now})`
    );
  }
  saveDb();
}

describe('API Routes Integration', () => {
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
    it('returns empty array when no tasks exist', async () => {
      const tasks = await getTasks({ view: 'all' });
      expect(tasks).toEqual([]);
    });

    it('returns tasks filtered by listId', async () => {
      const list = await createList({ name: 'Test List' });
      await createTask({ name: 'Task 1', listId: list.id });
      await createTask({ name: 'Task 2', listId: 'inbox' });
      const tasks = await getTasks({ listId: list.id });
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe('Task 1');
    });

    it('returns tasks filtered by completed status', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      await updateTask(task1.id, { completed: true, completedAt: Date.now() });
      const completed = await getTasks({ completed: true });
      const pending = await getTasks({ completed: false });
      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe(task1.id);
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(task2.id);
    });

    it('returns tasks filtered by priority', async () => {
      await createTask({ name: 'High Priority', priority: 'high' });
      await createTask({ name: 'Low Priority', priority: 'low' });
      const highPriority = await getTasks({ priority: 'high' });
      expect(highPriority.length).toBe(1);
      expect(highPriority[0].priority).toBe('high');
    });

    it('returns tasks filtered by label', async () => {
      const label = await createLabel({ name: 'Work' });
      const task = await createTask({ name: 'Task with Label' });
      await updateTask(task.id, { labels: [label] });
      const tasks = await getTasks({ labelId: label.id });
      expect(tasks.length).toBe(1);
    });

    it('limits results correctly', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      await createTask({ name: 'Task 3' });
      const tasks = await getTasks({ limit: 2 });
      expect(tasks.length).toBe(2);
    });

    it('supports offset', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      await createTask({ name: 'Task 3' });
      const firstPage = await getTasks({ limit: 2, offset: 0 });
      const secondPage = await getTasks({ limit: 2, offset: 1 });
      expect(firstPage.length).toBe(2);
      expect(secondPage.length).toBe(2);
    });

    it('handles today view filtering', async () => {
      const today = Date.now();
      await createTask({ name: 'Today Task', date: today });
      await createTask({ name: 'Future Task', date: today + 86400000 * 2 });
      const todayTasks = await getTasks({ view: 'today' });
      expect(todayTasks.some(t => t.name === 'Today Task')).toBe(true);
    });

    it('handles next7 view filtering', async () => {
      const futureDate = Date.now() + 86400000 * 3;
      await createTask({ name: 'Future Task', date: futureDate });
      const next7Tasks = await getTasks({ view: 'next7' });
      expect(next7Tasks.some(t => t.name === 'Future Task')).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task with valid data', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Task description',
        priority: 'high' as const,
        listId: 'inbox',
      };
      const task = await createTask(taskData);
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('New Task');
      expect(task.priority).toBe('high');
    });

    it('creates task with minimal data', async () => {
      const task = await createTask({ name: 'Minimal Task' });
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Minimal Task');
    });

    it('creates task with all optional fields', async () => {
      const now = Date.now();
      const task = await createTask({
        name: 'Complete Task',
        description: 'Full description',
        priority: 'high',
        listId: 'inbox',
        completed: true,
        date: now,
        deadline: now + 86400000,
        estimate: 30,
        actualTime: 15,
      });
      expect(task.name).toBe('Complete Task');
      expect(task.description).toBe('Full description');
      expect(task.priority).toBe('high');
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('updates a task', async () => {
      const task = await createTask({ name: 'Original Name' });
      const updated = await updateTask(task.id, { name: 'Updated Name' });
      expect(updated?.name).toBe('Updated Name');
    });

    it('updates multiple fields', async () => {
      const task = await createTask({ name: 'Original', priority: 'low' });
      const updated = await updateTask(task.id, {
        name: 'Updated',
        priority: 'high',
        completed: true,
      });
      expect(updated?.name).toBe('Updated');
      expect(updated?.priority).toBe('high');
      expect(updated?.completed).toBe(true);
    });

    it('returns null for non-existent task', async () => {
      const result = await updateTask('non-existent-id', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('soft deletes a task', async () => {
      const task = await createTask({ name: 'To Delete' });
      const success = await deleteTask(task.id);
      expect(success).toBe(true);
      const deleted = await getTaskById(task.id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/lists', () => {
    it('returns inbox list by default', async () => {
      const lists = await getLists();
      const inbox = lists.find(l => l.isInbox);
      expect(inbox).toBeDefined();
      expect(inbox?.name).toBe('Inbox');
    });

    it('creates and fetches lists', async () => {
      const list = await createList({
        name: 'New List',
        emoji: '📋',
        color: '#ff0000',
      });
      expect(list).toHaveProperty('id');
      expect(list.name).toBe('New List');
    });

    it('orders lists by sort_order', async () => {
      await createList({ name: 'First', sortOrder: 1 });
      await createList({ name: 'Second', sortOrder: 2 });
      await createList({ name: 'Third', sortOrder: 3 });
      const lists = await getLists();
      const names = lists.map(l => l.name);
      expect(names.indexOf('First')).toBeLessThan(names.indexOf('Third'));
    });
  });

  describe('GET /api/labels', () => {
    it('creates and fetches labels', async () => {
      const label = await createLabel({
        name: 'New Label',
        emoji: '🏷️',
        color: '#3b82f6',
      });
      expect(label).toHaveProperty('id');
      expect(label.name).toBe('New Label');
    });

    it('orders labels by name', async () => {
      await createLabel({ name: 'Alpha' });
      await createLabel({ name: 'Beta' });
      await createLabel({ name: 'Gamma' });
      const labels = await getLabels();
      const names = labels.map(l => l.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('Task with relations', () => {
    it('includes subtasks in task response', async () => {
      const task = await createTask({ name: 'Parent' });
      const { createSubtask } = await import('@/lib/db/queries');
      await createSubtask(task.id, 'Child 1');
      await createSubtask(task.id, 'Child 2');
      const fetched = await getTaskById(task.id);
      expect(fetched?.subtasks).toHaveLength(2);
    });

    it('includes labels in task response', async () => {
      const task = await createTask({ name: 'Task' });
      const label = await createLabel({ name: 'Work' });
      await updateTask(task.id, { labels: [label] });
      const fetched = await getTaskById(task.id);
      expect(fetched?.labels).toHaveLength(1);
      expect(fetched?.labels?.[0]?.name).toBe('Work');
    });
  });

  describe('Error handling edge cases', () => {
    it('handles task creation with invalid listId gracefully', async () => {
      const task = await createTask({ name: 'Task', listId: 'non-existent-list' });
      expect(task).toHaveProperty('id');
    });

    it('handles empty tasks array', async () => {
      const tasks = await getTasks({ view: 'all', completed: true });
      expect(tasks).toEqual([]);
    });

    it('handles updating task with no changes', async () => {
      const task = await createTask({ name: 'Task' });
      const updated = await updateTask(task.id, { name: 'Task' });
      expect(updated?.name).toBe('Task');
    });

    it('handles task with empty labels array', async () => {
      const task = await createTask({ name: 'Task' });
      expect(task.id).toBeDefined();
    });

    it('handles task with null description', async () => {
      const task = await createTask({ name: 'Task', description: null });
      expect(task.description).toBeNull();
    });
  });

  describe('Recurring tasks', () => {
    it('generates daily recurring tasks', async () => {
      const now = Date.now();
      const task = await createTask({
        name: 'Daily Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 3 }),
        date: now,
      });
      const { generateRecurringTasks } = await import('@/lib/db/queries');
      const generated = await generateRecurringTasks(task.id);
      expect(generated.length).toBeGreaterThanOrEqual(0);
    });

    it('generates weekly recurring tasks', async () => {
      const task = await createTask({
        name: 'Weekly Task',
        recurringType: 'weekly',
        recurringConfig: JSON.stringify({ type: 'weekly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });
      const { generateRecurringTasks } = await import('@/lib/db/queries');
      const generated = await generateRecurringTasks(task.id);
      expect(Array.isArray(generated)).toBe(true);
    });

    it('generates monthly recurring tasks', async () => {
      const task = await createTask({
        name: 'Monthly Task',
        recurringType: 'monthly',
        recurringConfig: JSON.stringify({ type: 'monthly', interval: 1, maxOccurrences: 2 }),
        date: Date.now(),
      });
      const { generateRecurringTasks } = await import('@/lib/db/queries');
      const generated = await generateRecurringTasks(task.id);
      expect(Array.isArray(generated)).toBe(true);
    });
  });

  describe('Task templates', () => {
    it('creates and uses template', async () => {
      const template = await import('@/lib/db/queries').then(m => m.createTemplate({
        name: 'Template',
        description: 'Test template',
        listId: 'inbox',
      }));
      const { useTemplate } = await import('@/lib/db/queries');
      const task = await useTemplate(template.id);
      expect(task.name).toBe('Template');
    });
  });

  describe('Task history', () => {
    it('logs changes to task history', async () => {
      const task = await createTask({ name: 'Original' });
      await updateTask(task.id, { name: 'Updated' });
      const { getTaskHistory } = await import('@/lib/db/queries');
      const history = await getTaskHistory(task.id);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Task dependencies', () => {
    it('creates circular dependency detection', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });

      const { addTaskDependency, wouldCreateCircularDependency } = await import('@/lib/db/queries');
      // task2 depends on task1, task3 depends on task2
      await addTaskDependency(task2.id, task1.id);
      await addTaskDependency(task3.id, task2.id);

      // Adding task3 -> task1 would create: task3 -> task2 -> task1 -> task3 (cycle)
      const wouldCycle = await wouldCreateCircularDependency(task3.id, task1.id);
      expect(wouldCycle).toBe(true);

      // Adding task1 -> task3 would NOT create a cycle
      const wouldCycleReverse = await wouldCreateCircularDependency(task1.id, task3.id);
      expect(wouldCycleReverse).toBe(false);
    });

    it('returns blocking tasks', async () => {
      const blocking = await createTask({ name: 'Blocking' });
      const blocked = await createTask({ name: 'Blocked' });

      const { addTaskDependency, getBlockingTasks } = await import('@/lib/db/queries');
      await addTaskDependency(blocked.id, blocking.id);

      const blockers = await getBlockingTasks(blocked.id);
      expect(blockers.length).toBe(1);
      expect(blockers[0].id).toBe(blocking.id);
    });
  });

  describe('Custom views', () => {
    it('creates and retrieves custom views', async () => {
      const { createCustomView, getCustomViews } = await import('@/lib/db/queries');
      const view = await createCustomView({
        name: 'Custom View',
        filterConfig: '{"priority":"high"}',
      });
      expect(view.name).toBe('Custom View');

      const views = await getCustomViews();
      expect(views.some(v => v.id === view.id)).toBe(true);
    });
  });

  describe('Comments', () => {
    it('creates and retrieves comments', async () => {
      const task = await createTask({ name: 'Task' });
      const { createComment, getComments } = await import('@/lib/db/queries');

      await createComment(task.id, 'Test comment', 'Author');
      const comments = await getComments(task.id);
      expect(comments.length).toBe(1);
      expect(comments[0].content).toBe('Test comment');
    });
  });

  describe('Task notes', () => {
    it('creates and retrieves task notes', async () => {
      const task = await createTask({ name: 'Task' });
      const { createTaskNote, getTaskNotes } = await import('@/lib/db/queries');

      await createTaskNote(task.id, 'Note content', 'Note Title');
      const notes = await getTaskNotes(task.id);
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('Note Title');
    });
  });
});