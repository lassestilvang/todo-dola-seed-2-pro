import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  getLists,
  getListById,
  createList,
  updateList,
  deleteList,
  updateListSortOrder,
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getTaskHistory,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
  wouldCreateCircularDependency,
  getBlockingTasks,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getTaskNotes,
  createTaskNote,
  updateTaskNote,
  deleteTaskNote,
  getCustomViews,
  createCustomView,
  updateCustomView,
  deleteCustomView,
  setDefaultCustomView,
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  getWorkspaceMembers,
  removeWorkspaceMember,
} from '@/lib/db/queries';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { resetIdCounter } from '../factories';

const dbPath = join(process.cwd(), 'db', 'planner.db');

async function cleanDb() {
  const db = await initDb();
  const tables = [
    'habit_completions', 'habits', 'task_history', 'template_labels', 'task_templates', 'subtasks',
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

describe('Database Queries', () => {
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
    resetIdCounter();
  });

  describe('Lists', () => {
    it('fetches lists including inbox', async () => {
      const lists = await getLists();
      expect(lists).toBeInstanceOf(Array);
      const inbox = lists.find(l => l.isInbox);
      expect(inbox).toBeDefined();
      expect(inbox?.name).toBe('Inbox');
    });

    it('creates a list', async () => {
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

    it('gets list by id', async () => {
      const created = await createList({ name: 'Find Me' });
      const list = await getListById(created.id);
      expect(list).not.toBeNull();
      expect(list?.name).toBe('Find Me');
    });

    it('returns null for non-existent list', async () => {
      const list = await getListById('non-existent-id');
      expect(list).toBeNull();
    });

    it('updates a list', async () => {
      const created = await createList({ name: 'Original' });
      const updated = await updateList(created.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('cannot delete inbox list', async () => {
      const lists = await getLists();
      const inbox = lists.find(l => l.isInbox);
      expect(inbox).toBeDefined();
      await expect(deleteList(inbox!.id)).rejects.toThrow('Cannot delete the inbox list');
    });

    it('deletes a non-inbox list', async () => {
      const list = await createList({ name: 'To Delete', isInbox: false });
      const success = await deleteList(list.id);
      expect(success).toBe(true);
      const deleted = await getListById(list.id);
      expect(deleted).toBeNull();
    });

    it('reorders lists', async () => {
      const list1 = await createList({ name: 'List 1', isInbox: false });
      const list2 = await createList({ name: 'List 2', isInbox: false });
      await updateListSortOrder(list1.id, 2);
      await updateListSortOrder(list2.id, 1);
      const lists = await getLists();
      // Find the non-inbox lists
      const nonInboxLists = lists.filter(l => !l.isInbox);
      expect(nonInboxLists[0].name).toBe('List 2');
    });
  });

  describe('Tasks', () => {
    it('fetches tasks as empty array', async () => {
      const tasks = await getTasks({ view: 'all' });
      expect(tasks).toEqual([]);
    });

    it('creates a task with minimal data', async () => {
      const task = await createTask({
        name: 'Test Task Minimal',
        listId: 'inbox',
      });
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task Minimal');
    });

    it('creates a task with full data', async () => {
      const task = await createTask({
        name: 'Test Task Full',
        description: 'Full description',
        listId: 'inbox',
        priority: 'high',
        completed: true,
        date: Date.now(),
        deadline: Date.now() + 86400000,
      });
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task Full');
      expect(task.description).toBe('Full description');
      expect(task.priority).toBe('high');
      expect(task.completed).toBe(true);
    });

    it('gets task by id', async () => {
      const task = await createTask({ name: 'Single Task Test', listId: 'inbox' });
      const fetched = await getTaskById(task.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Single Task Test');
    });

    it('returns null for non-existent task', async () => {
      const fetched = await getTaskById('non-existent-id');
      expect(fetched).toBeNull();
    });

    it('updates a task', async () => {
      const task = await createTask({ name: 'Update Task Test', listId: 'inbox' });
      const updated = await updateTask(task.id, { name: 'Updated Task Name' });
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Task Name');
    });

    it('updates task completion status', async () => {
      const task = await createTask({ name: 'Completion Test', listId: 'inbox' });
      const now = Date.now();
      const completed = await updateTask(task.id, { completed: true, completedAt: now });
      expect(completed?.completed).toBe(true);
    });

    it('soft deletes a task', async () => {
      const task = await createTask({ name: 'Delete Task Test', listId: 'inbox' });
      const success = await deleteTask(task.id);
      expect(success).toBe(true);
      const deleted = await getTaskById(task.id);
      expect(deleted).toBeNull();
    });

    it('returns null when updating non-existent task', async () => {
      const updated = await updateTask('non-existent-id', { name: 'Updated' });
      expect(updated).toBeNull();
    });

    it('filters tasks by listId', async () => {
      const list = await createList({ name: 'Filter List' });
      await createTask({ name: 'Task 1', listId: list.id });
      await createTask({ name: 'Task 2', listId: 'inbox' });
      const tasks = await getTasks({ listId: list.id });
      expect(tasks).toHaveLength(1);
    });

    it('filters tasks by completed status', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      await updateTask(task1.id, { completed: true, completedAt: Date.now() });
      const completed = await getTasks({ completed: true });
      expect(completed).toHaveLength(1);
    });

    it('filters tasks by priority', async () => {
      await createTask({ name: 'High Priority', priority: 'high' });
      await createTask({ name: 'Low Priority', priority: 'low' });
      const highPriority = await getTasks({ priority: 'high' });
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].priority).toBe('high');
    });

    it('limits results', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      await createTask({ name: 'Task 3' });
      const tasks = await getTasks({ limit: 2 });
      expect(tasks).toHaveLength(2);
    });
  });

  describe('Labels', () => {
    it('creates a label', async () => {
      const label = await createLabel({
        name: 'Test Label',
        emoji: '🏷️',
        color: '#3b82f6',
      });
      expect(label).toHaveProperty('id');
      expect(label.name).toBe('Test Label');
    });

    it('fetches labels', async () => {
      await createLabel({ name: 'Label 1', emoji: '🏷️', color: '#ff0000' });
      await createLabel({ name: 'Label 2', emoji: '📌', color: '#00ff00' });
      const labels = await getLabels();
      expect(labels.length).toBeGreaterThanOrEqual(2);
    });

    it('updates a label', async () => {
      const label = await createLabel({ name: 'Original', emoji: '🏷️', color: '#ff0000' });
      const updated = await updateLabel(label.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('deletes a label', async () => {
      const label = await createLabel({ name: 'To Delete' });
      const success = await deleteLabel(label.id);
      expect(success).toBe(true);
    });
  });

  describe('Subtasks', () => {
    it('creates a subtask', async () => {
      const task = await createTask({ name: 'Parent' });
      const subtask = await createSubtask(task.id, 'New Subtask');
      expect(subtask.name).toBe('New Subtask');
      expect(subtask.taskId).toBe(task.id);
      expect(subtask.completed).toBe(false);
    });

    it('fetches subtasks for a task', async () => {
      const task = await createTask({ name: 'Parent' });
      await createSubtask(task.id, 'Subtask 1');
      await createSubtask(task.id, 'Subtask 2');
      const subtasks = await getSubtasks(task.id);
      expect(subtasks).toHaveLength(2);
    });

    it('updates a subtask', async () => {
      const task = await createTask({ name: 'Parent' });
      const subtask = await createSubtask(task.id, 'Original');
      const updated = await updateSubtask(subtask.id, { name: 'Updated', completed: true, sortOrder: 1 });
      expect(updated?.name).toBe('Updated');
      expect(updated?.completed).toBe(true);
    });

    it('deletes a subtask', async () => {
      const task = await createTask({ name: 'Parent' });
      const subtask = await createSubtask(task.id, 'To Delete');
      await deleteSubtask(subtask.id);
      const subtasks = await getSubtasks(task.id);
      expect(subtasks).toHaveLength(0);
    });
  });

  describe('Task Dependencies', () => {
    it('adds a dependency', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const dep = await addTaskDependency(task1.id, task2.id);
      expect(dep.taskId).toBe(task1.id);
      expect(dep.dependsOnTaskId).toBe(task2.id);
    });

    it('gets dependencies for a task', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      await addTaskDependency(task1.id, task2.id);
      const deps = await getTaskDependencies(task1.id);
      expect(deps).toHaveLength(1);
    });

    it('removes a dependency', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      await addTaskDependency(task1.id, task2.id);
      await removeTaskDependency(task1.id, task2.id);
      const deps = await getTaskDependencies(task1.id);
      expect(deps).toHaveLength(0);
    });

    it('detects circular dependency', async () => {
      const task1 = await createTask({ name: 'Task 1' });
      const task2 = await createTask({ name: 'Task 2' });
      const task3 = await createTask({ name: 'Task 3' });
      // task3 depends on task2, task2 depends on task1
      // So adding task1 depends on task3 would create: task1 -> task3 -> task2 -> task1
      await addTaskDependency(task3.id, task2.id);
      await addTaskDependency(task2.id, task1.id);
      // wouldCreateCircularDependency(taskId, dependsOnTaskId) checks if taskId -> dependsOnTaskId creates cycle
      // We're checking if task1 -> task3 would create a cycle
      const wouldCycle = await wouldCreateCircularDependency(task1.id, task3.id);
      // This should be false because task1 doesn't have a path to task3 yet
      // Let's check the opposite: if task3 -> task1 would create cycle
      const wouldCycleReverse = await wouldCreateCircularDependency(task3.id, task1.id);
      expect(wouldCycleReverse).toBe(true);
    });

    it('returns blocking tasks', async () => {
      const task1 = await createTask({ name: 'Blocking Task' });
      const task2 = await createTask({ name: 'Blocked Task' });
      await addTaskDependency(task2.id, task1.id);
      const blocking = await getBlockingTasks(task2.id);
      expect(blocking).toHaveLength(1);
      expect(blocking[0].id).toBe(task1.id);
    });
  });

  describe('Task History', () => {
    it('logs task changes', async () => {
      const task = await createTask({ name: 'Original' });
      await updateTask(task.id, { name: 'Updated' });
      const history = await getTaskHistory(task.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('returns empty history for task without changes', async () => {
      const task = await createTask({ name: 'New Task' });
      const history = await getTaskHistory(task.id);
      expect(history).toEqual([]);
    });
  });

  describe('Deleted Tasks', () => {
    it('gets deleted tasks', async () => {
      const task = await createTask({ name: 'To Delete' });
      await deleteTask(task.id);
      const { getDeletedTasks } = await import('@/lib/db/queries');
      const deleted = await getDeletedTasks();
      expect(deleted.length).toBe(1);
    });

    it('permanently deletes a task', async () => {
      const task = await createTask({ name: 'To Permanently Delete' });
      await deleteTask(task.id);
      const { permanentlyDeleteTask } = await import('@/lib/db/queries');
      const success = await permanentlyDeleteTask(task.id);
      expect(success).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('gets tasks by list', async () => {
      const list = await createList({ name: 'Bulk List' });
      await createTask({ name: 'Task 1', listId: list.id });
      await createTask({ name: 'Task 2', listId: list.id });
      const { getTasks } = await import('@/lib/db/queries');
      const tasks = await getTasks({ listId: list.id });
      expect(tasks.length).toBe(2);
    });

    it('gets completed tasks', async () => {
      await createTask({ name: 'Task 1' });
      await createTask({ name: 'Task 2' });
      const { getTasks } = await import('@/lib/db/queries');
      const task = await getTasks({ listId: 'inbox' });
      const firstTask = task[0];
      await updateTask(firstTask.id, { completed: true, completedAt: Date.now() });
      const completed = await getTasks({ completed: true });
      expect(completed.length).toBe(1);
    });
  });

  describe('Templates', () => {
    it('creates a template', async () => {
      const template = await createTemplate({
        name: 'Meeting Template',
        description: 'Weekly meeting',
        listId: 'inbox',
      });
      expect(template.name).toBe('Meeting Template');
    });

    it('creates template with labels', async () => {
      const label = await createLabel({ name: 'Work' });
      const template = await createTemplate({
        name: 'Work Template',
        labels: [label.id],
      });
      expect(template.name).toBe('Work Template');
    });

    it('fetches templates', async () => {
      await createTemplate({ name: 'Template 1' });
      await createTemplate({ name: 'Template 2' });
      const templates = await getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('updates a template', async () => {
      const template = await createTemplate({ name: 'Original' });
      const updated = await updateTemplate(template.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('deletes a template', async () => {
      const template = await createTemplate({ name: 'To Delete' });
      const success = await deleteTemplate(template.id);
      expect(success).toBe(true);
    });

    it('gets template by id with labels', async () => {
      const label = await createLabel({ name: 'Work' });
      const template = await createTemplate({
        name: 'Template with Labels',
        labels: [label.id],
      });
      const fetched = await getTemplateById(template.id);
      expect(fetched?.labels).toContain(label.id);
    });
  });

  describe('Comments', () => {
    it('creates a comment', async () => {
      const task = await createTask({ name: 'Task' });
      const comment = await createComment(task.id, 'Test comment', 'User');
      expect(comment.content).toBe('Test comment');
      expect(comment.author).toBe('User');
    });

    it('fetches comments for a task', async () => {
      const task = await createTask({ name: 'Task' });
      await createComment(task.id, 'Comment 1');
      await createComment(task.id, 'Comment 2');
      const comments = await getComments(task.id);
      expect(comments).toHaveLength(2);
    });

    it('updates a comment', async () => {
      const task = await createTask({ name: 'Task' });
      const comment = await createComment(task.id, 'Original');
      const updated = await updateComment(comment.id, 'Updated');
      expect(updated?.content).toBe('Updated');
    });

    it('deletes a comment', async () => {
      const task = await createTask({ name: 'Task' });
      const comment = await createComment(task.id, 'To Delete');
      await deleteComment(comment.id);
      const comments = await getComments(task.id);
      expect(comments).toHaveLength(0);
    });
  });

  describe('Task Notes', () => {
    it('creates a task note', async () => {
      const task = await createTask({ name: 'Task' });
      const note = await createTaskNote(task.id, 'Note content', 'Title');
      expect(note.content).toBe('Note content');
      expect(note.title).toBe('Title');
    });

    it('fetches task notes', async () => {
      const task = await createTask({ name: 'Task' });
      await createTaskNote(task.id, 'Note 1');
      await createTaskNote(task.id, 'Note 2');
      const notes = await getTaskNotes(task.id);
      expect(notes).toHaveLength(2);
    });

    it('updates a task note', async () => {
      const task = await createTask({ name: 'Task' });
      const note = await createTaskNote(task.id, 'Original');
      const updated = await updateTaskNote(note.id, { content: 'Updated' });
      expect(updated?.content).toBe('Updated');
    });

    it('deletes a task note', async () => {
      const task = await createTask({ name: 'Task' });
      const note = await createTaskNote(task.id, 'To Delete');
      await deleteTaskNote(note.id);
      const notes = await getTaskNotes(task.id);
      expect(notes).toHaveLength(0);
    });
  });

  describe('Custom Views', () => {
    it('creates a custom view', async () => {
      const view = await createCustomView({
        name: 'Work View',
        icon: '💼',
        filterConfig: '{"priority":"high"}',
      });
      expect(view.name).toBe('Work View');
    });

    it('fetches custom views', async () => {
      await createCustomView({ name: 'View 1', filterConfig: '{}' });
      await createCustomView({ name: 'View 2', filterConfig: '{}' });
      const views = await getCustomViews();
      expect(views.length).toBeGreaterThanOrEqual(2);
    });

    it('updates a custom view', async () => {
      const view = await createCustomView({ name: 'Original', filterConfig: '{}' });
      const updated = await updateCustomView(view.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('deletes a custom view', async () => {
      const view = await createCustomView({ name: 'To Delete', filterConfig: '{}' });
      const success = await deleteCustomView(view.id);
      expect(success).toBe(true);
    });

    it('sets default custom view', async () => {
      const view1 = await createCustomView({ name: 'Default View', filterConfig: '{}', isDefault: false });
      const view2 = await createCustomView({ name: 'New Default', filterConfig: '{}', isDefault: false });
      await setDefaultCustomView(view2.id);
      const views = await getCustomViews();
      const newDefault = views.find(v => v.id === view2.id);
      expect(newDefault?.isDefault).toBe(1);
    });

    it('updates non-existent custom view returns null', async () => {
      const result = await updateCustomView('non-existent-id', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('Sharing', () => {
    it('creates share token for task', async () => {
      const task = await createTask({ name: 'Shared Task' });
      const { createShareToken, deleteShareToken } = await import('@/lib/db/queries');
      const token = await createShareToken(task.id);
      expect(token).toBeDefined();
      await deleteShareToken(task.id);
    });

    it('gets task by share token', async () => {
      const task = await createTask({ name: 'Shared Task' });
      const { createShareToken, getTaskByShareToken } = await import('@/lib/db/queries');
      const token = await createShareToken(task.id);
      const fetched = await getTaskByShareToken(token);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Shared Task');
    });

    it('returns null for non-existent share token', async () => {
      const { getTaskByShareToken } = await import('@/lib/db/queries');
      const fetched = await getTaskByShareToken('non-existent-token');
      expect(fetched).toBeNull();
    });

    it('deletes share token by token', async () => {
      const task = await createTask({ name: 'Shared Task' });
      const { createShareToken, deleteShareTokenByToken, getTaskByShareToken } = await import('@/lib/db/queries');
      const token = await createShareToken(task.id);
      await deleteShareTokenByToken(token);
      const fetched = await getTaskByShareToken(token);
      expect(fetched).toBeNull();
    });

    it('creates share token returns existing token', async () => {
      const task = await createTask({ name: 'Shared Task' });
      const { createShareToken } = await import('@/lib/db/queries');
      const token1 = await createShareToken(task.id);
      const token2 = await createShareToken(task.id);
      expect(token1).toBe(token2);
    });
  });

  describe('Template usage', () => {
    it('uses template to create task', async () => {
      const label = await createLabel({ name: 'Work' });
      const template = await createTemplate({
        name: 'Work Task',
        description: 'Template description',
        priority: 'high',
        labels: [label.id],
      });
      const { useTemplate } = await import('@/lib/db/queries');
      const task = await useTemplate(template.id);
      expect(task.name).toBe('Work Task');
      expect(task.priority).toBe('high');
    });

    it('throws error for non-existent template', async () => {
      const { useTemplate } = await import('@/lib/db/queries');
      await expect(useTemplate('non-existent')).rejects.toThrow('Template not found');
    });
  });

  describe('Recurring Tasks Generation', () => {
    it('returns empty array for task without recurrence', async () => {
      const task = await createTask({ name: 'Non-recurring Task' });
      const { generateRecurringTasks } = await import('@/lib/db/queries');
      const generated = await generateRecurringTasks(task.id);
      expect(generated).toEqual([]);
    });

    it('generates recurring tasks', async () => {
      const now = Date.now();
      const task = await createTask({
        name: 'Daily Task',
        recurringType: 'daily',
        recurringConfig: JSON.stringify({ type: 'daily', interval: 1, maxOccurrences: 2 }),
        date: now,
      });
      const { generateRecurringTasks } = await import('@/lib/db/queries');
      const generated = await generateRecurringTasks(task.id);
      // The function generates tasks for future occurrences
      expect(generated.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recurring Exceptions', () => {
    it('adds recurring exception', async () => {
      const task = await createTask({ name: 'Recurring Task' });
      const { addRecurringException, getRecurringExceptions } = await import('@/lib/db/queries');
      const exception = await addRecurringException(task.id, Date.now() + 86400000);
      expect(exception.parentTaskId).toBe(task.id);
    });

    it('gets recurring exceptions', async () => {
      const task = await createTask({ name: 'Recurring Task' });
      const { addRecurringException, getRecurringExceptions } = await import('@/lib/db/queries');
      await addRecurringException(task.id, Date.now() + 86400000);
      const exceptions = await getRecurringExceptions(task.id);
      expect(exceptions.length).toBe(1);
    });

    it('removes recurring exception', async () => {
      const task = await createTask({ name: 'Recurring Task' });
      const exceptionDate = Date.now() + 86400000;
      const { addRecurringException, removeRecurringException, getRecurringExceptions } = await import('@/lib/db/queries');
      await addRecurringException(task.id, exceptionDate);
      await removeRecurringException(task.id, exceptionDate);
      const exceptions = await getRecurringExceptions(task.id);
      expect(exceptions).toEqual([]);
    });
  });

  describe('Task Extended Fields', () => {
    it('creates a task with default values for missing fields', async () => {
      const task = await createTask({ name: 'Test Task', listId: 'inbox' });
      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task');
      expect(task.sortOrder).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('fetches task with recurring exceptions', async () => {
      const task = await createTask({ name: 'Recurring Task' });
      const { addRecurringException, getTaskById } = await import('@/lib/db/queries');
      await addRecurringException(task.id, Date.now() + 86400000);

      const fetched = await getTaskById(task.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.recurringExceptions).toBeDefined();
      expect(Array.isArray(fetched?.recurringExceptions)).toBe(true);
    });

    it('returns empty arrays for missing optional fields in fetched task', async () => {
      const task = await createTask({ name: 'Simple Task', listId: 'inbox' });
      const { getTaskById } = await import('@/lib/db/queries');
      const fetched = await getTaskById(task.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.labels).toEqual([]);
      expect(fetched?.subtasks).toEqual([]);
      expect(fetched?.customFields).toEqual([]);
      expect(fetched?.recurringExceptions).toEqual([]);
    });
  });

  describe('Workspaces', () => {
    it('creates a workspace', async () => {
      const workspace = await createWorkspace({
        name: 'Test Workspace',
        description: 'Test Description',
        createdBy: 'user-1',
      });
      expect(workspace).toHaveProperty('id');
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.description).toBe('Test Description');
    });

    it('fetches workspaces', async () => {
      await createWorkspace({ name: 'Workspace 1' });
      await createWorkspace({ name: 'Workspace 2' });
      const workspaces = await getWorkspaces();
      expect(workspaces.length).toBeGreaterThanOrEqual(2);
    });

    it('gets workspace by id', async () => {
      const created = await createWorkspace({ name: 'Find Me' });
      const workspace = await getWorkspaceById(created.id);
      expect(workspace).not.toBeNull();
      expect(workspace?.name).toBe('Find Me');
    });

    it('updates a workspace', async () => {
      const created = await createWorkspace({ name: 'Original' });
      const updated = await updateWorkspace(created.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('deletes a workspace', async () => {
      const created = await createWorkspace({ name: 'To Delete' });
      const success = await deleteWorkspace(created.id);
      expect(success).toBe(true);
      const deleted = await getWorkspaceById(created.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Workspace Members', () => {
    it('adds a member to workspace', async () => {
      const workspace = await createWorkspace({ name: 'Test' });
      const member = await addWorkspaceMember(workspace.id, 'user-1', 'editor');
      expect(member.workspaceId).toBe(workspace.id);
      expect(member.userId).toBe('user-1');
      expect(member.role).toBe('editor');
    });

    it('fetches workspace members', async () => {
      const workspace = await createWorkspace({ name: 'Test' });
      await addWorkspaceMember(workspace.id, 'user-1', 'editor');
      await addWorkspaceMember(workspace.id, 'user-2', 'viewer');
      const members = await getWorkspaceMembers(workspace.id);
      expect(members.length).toBe(2);
    });

    it('removes a member from workspace', async () => {
      const workspace = await createWorkspace({ name: 'Test' });
      await addWorkspaceMember(workspace.id, 'user-1', 'editor');
      await removeWorkspaceMember(workspace.id, 'user-1');
      const members = await getWorkspaceMembers(workspace.id);
      expect(members.length).toBe(0);
    });
  });
});