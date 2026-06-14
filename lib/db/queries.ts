import { getDb, initDb, saveDb } from './index';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import type { Task, TaskList, Label, Subtask, TaskFilter, TaskTemplate, Priority, CustomView } from '../types';
import type { SqlValue } from 'sql.js';

type QueryResult = Record<string, unknown>;

function toSqlValue(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  return value as SqlValue;
}

function runQuery(sql: string, params: unknown[] = []): QueryResult[] {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(sql, params.map(toSqlValue));
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row: SqlValue[]) => {
    const obj: QueryResult = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function runGet(sql: string, params: unknown[] = []): QueryResult | null {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(sql, params.map(toSqlValue));
  if (result.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const obj: QueryResult = {};
  columns.forEach((col: string, i: number) => {
    obj[col] = values[i];
  });
  return obj;
}

// Lists
export async function getLists(): Promise<TaskList[]> {
  await initDb();
  return runQuery('SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists ORDER BY sort_order, is_inbox DESC, name') as unknown as Promise<TaskList[]>;
}

export async function getListById(id: string): Promise<TaskList | null> {
  await initDb();
  const row = runGet('SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists WHERE id = ?', [id]);
  if (!row || !row.id) return null;
  return row as unknown as TaskList;
}

export async function updateList(id: string, data: Partial<TaskList>): Promise<TaskList | null> {
  await initDb();
  const list = await getListById(id);
  if (!list) return null;

  const now = Date.now();
  const name = data.name !== undefined ? data.name : list.name;
  const emoji = data.emoji !== undefined ? data.emoji : list.emoji;
  const color = data.color !== undefined ? data.color : list.color;
  const sortOrder = data.sortOrder !== undefined ? data.sortOrder : list.sortOrder;

  runQuery(
    'UPDATE lists SET name = ?, emoji = ?, color = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    [name, emoji, color, sortOrder, now, id]
  );
  saveDb();

  return { ...list, name, emoji, color, sortOrder, updatedAt: now };
}

export async function deleteList(id: string): Promise<boolean> {
  await initDb();
  const list = await getListById(id);
  if (!list) return false;
  if (list.isInbox) {
    throw new Error('Cannot delete the inbox list');
  }

  runQuery('DELETE FROM lists WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function updateListSortOrder(id: string, sortOrder: number): Promise<void> {
  await initDb();
  runQuery('UPDATE lists SET sort_order = ? WHERE id = ?', [sortOrder, id]);
  saveDb();
}

export async function reorderLists(lists: { id: string; sortOrder: number }[]): Promise<void> {
  await initDb();
  for (const list of lists) {
    runQuery('UPDATE lists SET sort_order = ? WHERE id = ?', [list.sortOrder, list.id]);
  }
  saveDb();
}

export async function createList(data: Partial<TaskList>): Promise<TaskList> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM lists');
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  runQuery(
    `INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.emoji, data.color, data.isInbox ? 1 : 0, sortOrder, now, now]
  );

  saveDb();
  return { id, createdAt: now, updatedAt: now, sortOrder, ...data } as TaskList;
}

// Labels
export async function getLabels(): Promise<Label[]> {
  await initDb();
  return runQuery('SELECT id, name, emoji, color, created_at as createdAt, updated_at as updatedAt FROM labels ORDER BY name') as unknown as Promise<Label[]>;
}

// Tasks
export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  await initDb();

  let query = `
    SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE 1=1
      AND t.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (filter.listId) {
    query += ' AND t.list_id = ?';
    params.push(filter.listId);
  }

  if (filter.priority) {
    query += ' AND t.priority = ?';
    params.push(filter.priority);
  }

  if (filter.labelId) {
    query += ' AND tl.label_id = ?';
    params.push(filter.labelId);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter.view === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query += ' AND t.date >= ? AND t.date < ?';
    params.push(today.getTime(), tomorrow.getTime());
  } else if (filter.view === 'next7') {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    query += ' AND t.date >= ? AND t.date < ?';
    params.push(today.getTime(), weekEnd.getTime());
  } else if (filter.view === 'upcoming') {
    query += ' AND t.date >= ?';
    params.push(today.getTime());
  }

  if (filter.completed !== undefined) {
    query += ' AND t.completed = ?';
    params.push(filter.completed ? 1 : 0);
  }

  if (filter.dateFrom) {
    query += ' AND t.date >= ?';
    params.push(filter.dateFrom);
  }

  if (filter.dateTo) {
    query += ' AND t.date <= ?';
    params.push(filter.dateTo);
  }

  query += ' GROUP BY t.id ORDER BY t.date IS NULL, t.date, t.created_at DESC';

  if (filter.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(filter.limit);
    if (filter.offset !== undefined) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }
  }

  const rows = runQuery(query, params);
  if (!rows || rows.length === 0) return [];

  return rows.filter((row) => row && row.id).map((row) => {
    const labels = JSON.parse(String(row.labels || '[]')) as Label[];
    const subtasks = JSON.parse(String(row.subtasks || '[]')) as Subtask[];
    return {
      ...row,
      completed: Boolean(row.completed),
      labels: labels.filter((l) => l && l.id),
      subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    } as Task;
  });
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM tasks WHERE list_id = ?', [data.listId || 'inbox']);
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  runQuery(
    `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', now, now, sortOrder]
  );

  if (data.labels && data.labels.length > 0) {
    for (const labelId of data.labels) {
      runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
    }
  }

  saveDb();
  return { id, createdAt: now, updatedAt: now, sortOrder, ...data } as Task;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(id);
  if (!task) return null;

  const now = Date.now();

  const listId = data.listId !== undefined ? data.listId : task.listId;
  const name = data.name !== undefined ? data.name : task.name;
  const description = data.description !== undefined ? data.description : task.description;
  const date = data.date !== undefined ? data.date : task.date;
  const deadline = data.deadline !== undefined ? data.deadline : task.deadline;
  const reminder = data.reminder !== undefined ? data.reminder : task.reminder;
  const estimate = data.estimate !== undefined ? data.estimate : task.estimate;
  const actualTime = data.actualTime !== undefined ? data.actualTime : task.actualTime;
  const priority = data.priority !== undefined ? data.priority : task.priority;
  const completed = data.completed !== undefined ? data.completed : task.completed;
  const completedAt = data.completedAt !== undefined ? data.completedAt : task.completedAt;
  const recurringType = data.recurringType !== undefined ? data.recurringType : task.recurringType;
  const recurringConfig = data.recurringConfig !== undefined ? data.recurringConfig : task.recurringConfig;
  const attachmentPath = data.attachmentPath !== undefined ? data.attachmentPath : task.attachmentPath;
  const sortOrder = data.sortOrder !== undefined ? data.sortOrder : task.sortOrder;

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'updatedAt' && task[key as keyof Task] !== value) {
      await logTaskChange(id, key, task[key as keyof Task], value);
    }
  }

  runQuery(
    `UPDATE tasks SET list_id = ?, name = ?, description = ?, date = ?, deadline = ?, reminder = ?, estimate = ?, actual_time = ?, priority = ?, completed = ?, completed_at = ?, recurring_type = ?, recurring_config = ?, attachment_path = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [
      listId || 'inbox',
      name,
      description,
      date,
      deadline,
      reminder,
      estimate,
      actualTime,
      priority || 'none',
      completed ? 1 : 0,
      completedAt,
      recurringType,
      recurringConfig,
      attachmentPath,
      sortOrder,
      now,
      id
    ]
  );

  if (data.labels !== undefined && task.labels) {
    runQuery('DELETE FROM task_labels WHERE task_id = ?', [id]);
    for (const label of data.labels) {
      runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, label.id]);
    }
  }

  saveDb();
  return { ...task, ...data, updatedAt: now } as Task;
}

export async function reorderTasks(tasks: { id: string; sortOrder: number }[]): Promise<void> {
  await initDb();
  for (const task of tasks) {
    runQuery('UPDATE tasks SET sort_order = ? WHERE id = ?', [task.sortOrder, task.id]);
  }
  saveDb();
}

export async function toggleTaskCompletion(id: string, completed: boolean): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(id);
  if (!task) return null;

  const now = Date.now();
  const completedAt = completed ? now : null;

  await logTaskChange(id, 'completed', task.completed, completed);
  if (completed !== task.completed) {
    await logTaskChange(id, 'completedAt', task.completedAt, completedAt);
  }

  runQuery(
    `UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    [completed ? 1 : 0, completedAt, now, id]
  );

  saveDb();
  return { ...task, completed, completedAt, updatedAt: now } as Task;
}

export async function getTaskById(id: string): Promise<Task | null> {
  await initDb();
  const row = runGet(`
    SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE t.id = ? AND t.deleted_at IS NULL
    GROUP BY t.id
  `, [id]);

  if (!row || !row.id) return null;

  const labels = JSON.parse(String(row.labels || '[]')) as Label[];
  const subtasks = JSON.parse(String(row.subtasks || '[]')) as Subtask[];
  return {
    ...row,
    completed: Boolean(row.completed),
    labels: labels.filter((l) => l && l.id),
    subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
  } as Task;
}

export async function logTaskChange(taskId: string, field: string, oldValue: unknown, newValue: unknown): Promise<void> {
  await initDb();
  runQuery(
    `INSERT INTO task_history (id, task_id, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), taskId, field, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, Date.now()]
  );
  saveDb();
}

export async function deleteTask(id: string): Promise<boolean> {
  await initDb();
  const now = Date.now();
  runQuery('UPDATE tasks SET deleted_at = ? WHERE id = ?', [now, id]);
  saveDb();
  return true;
}

export async function restoreTask(id: string): Promise<boolean> {
  await initDb();
  runQuery('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?', [Date.now(), id]);
  saveDb();
  return true;
}

export async function getDeletedTasks(): Promise<Task[]> {
  await initDb();
  const rows = runQuery(
    `SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE t.deleted_at IS NOT NULL
    GROUP BY t.id
    ORDER BY t.deleted_at DESC`
  ) as QueryResult[];

  if (!rows || rows.length === 0) return [];

  return rows.filter((row) => row && row.id).map((row) => {
    const labels = JSON.parse(String(row.labels || '[]')) as Label[];
    const subtasks = JSON.parse(String(row.subtasks || '[]')) as Subtask[];
    return {
      ...row,
      completed: Boolean(row.completed),
      labels: labels.filter((l) => l && l.id),
      subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    } as Task;
  });
}

export async function permanentlyDeleteTask(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM tasks WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Subtasks
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, name, completed, completed_at as completedAt, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM subtasks WHERE task_id = ? ORDER BY sort_order',
    [taskId]
  ) as unknown as Promise<Subtask[]>;
}

export async function createSubtask(taskId: string, name: string): Promise<Subtask> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM subtasks WHERE task_id = ?', [taskId]);
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  runQuery(
    'INSERT INTO subtasks (id, task_id, name, completed, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
    [id, taskId, name, sortOrder, now, now]
  );
  saveDb();

  return { id, taskId, name, completed: false, completedAt: null, sortOrder, createdAt: now, updatedAt: now };
}

export async function updateSubtask(id: string, data: Partial<Subtask>): Promise<Subtask | null> {
  await initDb();
  const subtask = await runGet('SELECT * FROM subtasks WHERE id = ?', [id]);
  if (!subtask) return null;

  const now = Date.now();
  const updated: Partial<Subtask> = { ...subtask, ...data, updatedAt: now };

  runQuery(
    'UPDATE subtasks SET name = ?, completed = ?, completed_at = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    [updated.name, updated.completed ? 1 : 0, updated.completedAt, updated.sortOrder, now, id]
  );
  saveDb();

  return updated as Subtask;
}

export async function deleteSubtask(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM subtasks WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Labels
export async function createLabel(data: Partial<Label>): Promise<Label> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();
  const label = { id, createdAt: now, updatedAt: now, ...data };

  runQuery(
    'INSERT INTO labels (id, name, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.name, data.emoji, data.color, now, now]
  );
  saveDb();

  return label as Label;
}

export async function updateLabel(id: string, data: Partial<Label>): Promise<Label | null> {
  await initDb();
  const labelRow = await runGet('SELECT * FROM labels WHERE id = ?', [id]);
  if (!labelRow) return null;

  const now = Date.now();
  const updated: Partial<Label> = { ...labelRow, ...data, updatedAt: now };

  runQuery(
    'UPDATE labels SET name = ?, emoji = ?, color = ?, updated_at = ? WHERE id = ?',
    [updated.name, updated.emoji, updated.color, now, id]
  );
  saveDb();

  return updated as Label;
}

export async function deleteLabel(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM labels WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Task-Label relationships
export async function addLabelToTask(taskId: string, labelId: string): Promise<void> {
  await initDb();
  runQuery('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [taskId, labelId]);
  saveDb();
}

export async function removeLabelFromTask(taskId: string, labelId: string): Promise<void> {
  await initDb();
  runQuery('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [taskId, labelId]);
  saveDb();
}

// Bulk operations
export async function getTasksByList(listId: string): Promise<Task[]> {
  await initDb();
  return getTasks({ listId });
}

export async function getCompletedTasks(): Promise<Task[]> {
  await initDb();
  return getTasks({ completed: true });
}

// Task History
export async function getTaskHistory(taskId: string) {
  await initDb();
  return runQuery(
    'SELECT id, field, old_value, new_value, changed_at as changedAt FROM task_history WHERE task_id = ? ORDER BY changed_at DESC',
    [taskId]
  ) as QueryResult[];
}

// Task Dependencies
import type { TaskDependency } from '../types';

export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, depends_on_task_id as dependsOnTaskId, created_at as createdAt FROM task_dependencies WHERE task_id = ?',
    [taskId]
  ) as unknown as Promise<TaskDependency[]>;
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO task_dependencies (id, task_id, depends_on_task_id, created_at) VALUES (?, ?, ?, ?)',
    [id, taskId, dependsOnTaskId, now]
  );
  saveDb();

  return { id, taskId, dependsOnTaskId, createdAt: now };
}

export async function removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?', [taskId, dependsOnTaskId]);
  saveDb();
  return true;
}

export async function wouldCreateCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  await initDb();

  const dependentTasks = new Set<string>();
  let toCheck = [dependsOnTaskId];

  while (toCheck.length > 0) {
    const currentTask = toCheck.pop()!;
    const dependents = runQuery(
      'SELECT task_id FROM task_dependencies WHERE depends_on_task_id = ?',
      [currentTask]
    ) as { task_id: string }[];

    for (const dep of dependents) {
      if (dep.task_id === taskId) {
        return true;
      }
      if (!dependentTasks.has(dep.task_id)) {
        dependentTasks.add(dep.task_id);
        toCheck.push(dep.task_id);
      }
    }
  }

  return false;
}

export async function getBlockingTasks(taskId: string): Promise<Task[]> {
  await initDb();
  const rows = runQuery(
    `SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM task_dependencies td
    JOIN tasks t ON td.depends_on_task_id = t.id
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE td.task_id = ?
    GROUP BY t.id`,
    [taskId]
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter(row => row && row.id).map((row) => {
    const labels = JSON.parse(String(row.labels || '[]')) as Label[];
    const subtasks = JSON.parse(String(row.subtasks || '[]')) as Subtask[];
    return {
      ...row,
      completed: Boolean(row.completed),
      labels: labels.filter((l) => l && l.id),
      subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    } as Task;
  });
}

// Recurring tasks
export interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
  maxOccurrences?: number;
}

// Recurring Task Exceptions
export interface RecurringException {
  id: string;
  parentTaskId: string;
  exceptionDate: number;
  createdAt: number;
}

export async function getRecurringExceptions(parentTaskId: string): Promise<number[]> {
  await initDb();
  const rows = runQuery(
    'SELECT exception_date FROM recurring_exceptions WHERE parent_taskId = ?',
    [parentTaskId]
  ) as { exception_date: number }[];
  return rows.map(r => r.exception_date);
}

export async function addRecurringException(parentTaskId: string, exceptionDate: number): Promise<RecurringException> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO recurring_exceptions (id, parent_taskId, exception_date, created_at) VALUES (?, ?, ?, ?)',
    [id, parentTaskId, exceptionDate, now]
  );
  saveDb();

  return { id, parentTaskId, exceptionDate, createdAt: now };
}

export async function removeRecurringException(parentTaskId: string, exceptionDate: number): Promise<boolean> {
  await initDb();
  runQuery(
    'DELETE FROM recurring_exceptions WHERE parent_taskId = ? AND exception_date = ?',
    [parentTaskId, exceptionDate]
  );
  saveDb();
  return true;
}

export async function generateRecurringTasks(taskId: string): Promise<Task[]> {
  await initDb();
  const task = await getTaskById(taskId);
  if (!task || !task.recurringType || !task.recurringConfig) return [];

  const config: RecurringConfig = JSON.parse(task.recurringConfig);
  const newTasks: Task[] = [];

  const exceptions = await getRecurringExceptions(taskId);
  const exceptionSet = new Set(exceptions);

  let currentDate = task.date ? new Date(task.date) : new Date();
  const endDate = config.endDate ? new Date(config.endDate) : null;
  let occurrences = 0;
  const maxOccurrences = config.maxOccurrences || 100;

  while (occurrences < maxOccurrences && (!endDate || currentDate <= endDate)) {
    const newDate = new Date(currentDate);

    if (config.type === 'daily') {
      newDate.setDate(newDate.getDate() + config.interval);
    } else if (config.type === 'weekly') {
      newDate.setDate(newDate.getDate() + config.interval * 7);
    } else if (config.type === 'monthly') {
      newDate.setMonth(newDate.getMonth() + config.interval);
    } else if (config.type === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + config.interval);
    }

    if (endDate && newDate > endDate) break;

    const newTimestamp = newDate.getTime();
    if (!exceptionSet.has(newTimestamp)) {
      const newTask = await createTask({
        name: task.name,
        description: task.description,
        listId: task.listId,
        priority: task.priority,
        date: newTimestamp,
        completed: false,
        recurringType: null,
        recurringConfig: null,
      });

      newTasks.push(newTask);
    }

    currentDate = newDate;
    occurrences++;
  }

  return newTasks;
}

export async function getUpcomingReminders(): Promise<Task[]> {
  await initDb();
  const now = Date.now();
  const in24Hours = now + 24 * 60 * 60 * 1000;

  const rows = runQuery(
    `SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE t.reminder IS NOT NULL AND t.reminder <= ? AND t.completed = 0
    GROUP BY t.id
    ORDER BY t.reminder ASC`,
    [in24Hours]
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter(row => row && row.id).map((row) => {
    const labels = JSON.parse(String(row.labels || '[]')) as Label[];
    const subtasks = JSON.parse(String(row.subtasks || '[]')) as Subtask[];
    return {
      ...row,
      completed: Boolean(row.completed),
      labels: labels.filter((l) => l && l.id),
      subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    } as Task;
  });
}

// Task Templates
export async function getTemplates(): Promise<TaskTemplate[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, list_id as listId, priority, created_at as createdAt, updated_at as updatedAt FROM task_templates ORDER BY name'
  ) as unknown as Promise<TaskTemplate[]>;
}

export async function getTemplateById(id: string): Promise<TaskTemplate & { labels: string[] } | null> {
  await initDb();
  const template = runGet(
    'SELECT id, name, description, list_id as listId, priority, created_at as createdAt, updated_at as updatedAt FROM task_templates WHERE id = ?',
    [id]
  );

  if (!template || !template.id) return null;

  const labelRows = runQuery('SELECT label_id FROM template_labels WHERE template_id = ?', [id]);
  const labels = labelRows.map((r: Record<string, unknown>) => r.label_id as string);

  return {
    ...template,
    labels,
  } as TaskTemplate & { labels: string[] };
}

export async function createTemplate(data: { name: string; description?: string | null; listId?: string; priority?: Priority; labels?: string[] }): Promise<TaskTemplate> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO task_templates (id, name, description, list_id, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description, data.listId || 'inbox', data.priority || 'none', now, now]
  );

  if (data.labels && data.labels.length > 0) {
    for (const labelId of data.labels) {
      runQuery('INSERT INTO template_labels (template_id, label_id) VALUES (?, ?)', [id, labelId]);
    }
  }

  saveDb();
  return { id, name: data.name, description: data.description ?? null, listId: data.listId || 'inbox', priority: data.priority || 'none', labels: data.labels || [], createdAt: now, updatedAt: now } as TaskTemplate;
}

export async function updateTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate | null> {
  await initDb();
  const template = await runGet('SELECT * FROM task_templates WHERE id = ?', [id]);
  if (!template) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.listId !== undefined) { updates.push('list_id = ?'); values.push(data.listId); }
  if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE task_templates SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...template, ...data, updatedAt: now } as TaskTemplate;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM template_labels WHERE template_id = ?', [id]);
  runQuery('DELETE FROM task_templates WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function useTemplate(templateId: string): Promise<Task> {
  await initDb();
  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const task = await createTask({
    name: template.name,
    description: template.description,
    listId: template.listId,
    priority: template.priority,
  });

  if (template.labels && template.labels.length > 0) {
    for (const labelId of template.labels) {
      runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [task.id, labelId]);
    }
  }

  saveDb();
  return task;
}

// Task Sharing
export interface SharedTask {
  id: string;
  taskId: string;
  shareToken: string;
  sharedBy: string | null;
  sharedAt: number;
}

export async function getSharedTask(taskId: string): Promise<SharedTask | null> {
  await initDb();
  const result = runGet(
    'SELECT id, task_id as taskId, share_token as shareToken, shared_by as sharedBy, shared_at as sharedAt FROM shared_tasks WHERE task_id = ?',
    [taskId]
  );
  return result as SharedTask | null;
}

export async function createShareToken(taskId: string, sharedBy?: string): Promise<string> {
  await initDb();

  const existing = await getSharedTask(taskId);
  if (existing?.shareToken) {
    return existing.shareToken;
  }

  const id = randomUUID();
  const shareToken = crypto.randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO shared_tasks (id, task_id, share_token, shared_by, shared_at) VALUES (?, ?, ?, ?, ?)',
    [id, taskId, shareToken, sharedBy || null, now]
  );
  saveDb();

  return shareToken;
}

export async function getTaskByShareToken(token: string): Promise<Task | null> {
  await initDb();
  const result = runGet(
    `SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM shared_tasks st
    JOIN tasks t ON st.task_id = t.id
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE st.share_token = ?
    GROUP BY t.id`,
    [token]
  );

  if (!result || !result.id) return null;

  const labels = JSON.parse(String(result.labels || '[]')) as Label[];
  const subtasks = JSON.parse(String(result.subtasks || '[]')) as Subtask[];
  return {
    ...result,
    completed: Boolean(result.completed),
    labels: labels.filter((l) => l && l.id),
    subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
  } as Task;
}

export async function deleteShareToken(taskId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM shared_tasks WHERE task_id = ?', [taskId]);
  saveDb();
  return true;
}

export async function deleteShareTokenByToken(token: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM shared_tasks WHERE share_token = ?', [token]);
  saveDb();
  return true;
}

// Comments
export interface Comment {
  id: string;
  taskId: string;
  author: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export async function getComments(taskId: string): Promise<Comment[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, author, content, created_at as createdAt, updated_at as updatedAt FROM comments WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<Comment[]>;
}

export async function createComment(taskId: string, content: string, author?: string): Promise<Comment> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO comments (id, task_id, author, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, author || null, content, now, now]
  );
  saveDb();

  return { id, taskId, author: author || null, content, createdAt: now, updatedAt: now };
}

export async function updateComment(id: string, content: string): Promise<Comment | null> {
  await initDb();
  const comment = await runGet('SELECT * FROM comments WHERE id = ?', [id]);
  if (!comment) return null;

  const now = Date.now();
  runQuery('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?', [content, now, id]);
  saveDb();

  return { ...comment, content, updatedAt: now } as Comment;
}

export async function deleteComment(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM comments WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Task Notes
export interface TaskNote {
  id: string;
  taskId: string;
  title: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export async function getTaskNotes(taskId: string): Promise<TaskNote[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, title, content, created_at as createdAt, updated_at as updatedAt FROM task_notes WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskNote[]>;
}

export async function getTaskNoteById(id: string): Promise<TaskNote | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, title, content, created_at as createdAt, updated_at as updatedAt FROM task_notes WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as TaskNote;
}

export async function createTaskNote(taskId: string, content: string, title?: string | null): Promise<TaskNote> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO task_notes (id, task_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, title || null, content, now, now]
  );
  saveDb();

  return { id, taskId, title: title || null, content, createdAt: now, updatedAt: now };
}

export async function updateTaskNote(id: string, data: Partial<TaskNote>): Promise<TaskNote | null> {
  await initDb();
  const note = await getTaskNoteById(id);
  if (!note) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE task_notes SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...note, ...data, updatedAt: now };
}

export async function deleteTaskNote(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_notes WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Custom Views
export async function getCustomViews(): Promise<CustomView[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, icon, filter_config as filterConfig, is_default as isDefault, created_at as createdAt, updated_at as updatedAt FROM custom_views ORDER BY is_default DESC, name'
  ) as unknown as Promise<CustomView[]>;
}

export async function getCustomViewById(id: string): Promise<CustomView | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, icon, filter_config as filterConfig, is_default as isDefault, created_at as createdAt, updated_at as updatedAt FROM custom_views WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as CustomView;
}

export async function createCustomView(data: { name: string; icon?: string | null; filterConfig: string; isDefault?: boolean }): Promise<CustomView> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO custom_views (id, name, icon, filter_config, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.icon || '📋', data.filterConfig, data.isDefault ? 1 : 0, now, now]
  );
  saveDb();

  return { id, name: data.name, icon: data.icon || null, filterConfig: data.filterConfig, isDefault: data.isDefault || false, createdAt: now, updatedAt: now };
}

export async function updateCustomView(id: string, data: Partial<CustomView>): Promise<CustomView | null> {
  await initDb();
  const view = await getCustomViewById(id);
  if (!view) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
  if (data.filterConfig !== undefined) { updates.push('filter_config = ?'); values.push(data.filterConfig); }
  if (data.isDefault !== undefined) { updates.push('is_default = ?'); values.push(data.isDefault ? 1 : 0); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE custom_views SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...view, ...data, updatedAt: now };
}

export async function deleteCustomView(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM custom_views WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function setDefaultCustomView(id: string): Promise<void> {
  await initDb();
  runQuery('UPDATE custom_views SET is_default = 0');
  runQuery('UPDATE custom_views SET is_default = 1 WHERE id = ?', [id]);
  saveDb();
}