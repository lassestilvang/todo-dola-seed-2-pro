import { getDb, initDb, saveDb, runInTransaction, DbError } from './index';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import type { Task, TaskList, Label, Subtask, TaskFilter, TaskTemplate, Priority, CustomView, TaskHistoryEntry, TimeEntry, TaskDependency, CustomField, TaskCustomFieldValue, Workspace, WorkspaceMember, WorkspaceRole, TaskLink, TaskLinkType, RecurringCompletion, NoteAttachment } from '../types';
import type { SqlValue } from 'sql.js';

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  try {
    if (typeof value === 'string') {
      return JSON.parse(value) as T;
    }
    return value as T;
  } catch {
    return fallback;
  }
}

// Helper to build task query - reduces code duplication
// Returns the SELECT...FROM...LEFT JOIN portion (without WHERE/GROUP BY)
function buildTaskQueryBase(): string {
  return `
    SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks,
      json_group_array(DISTINCT json_object('fieldId', cfv.field_id, 'value', cfv.value)) as custom_fields,
      json_group_array(DISTINCT re.exception_date) as recurring_exceptions
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    LEFT JOIN task_custom_field_values cfv ON t.id = cfv.task_id
    LEFT JOIN recurring_exceptions re ON t.id = re.parent_taskId
  `;
}

// Build full task query with WHERE and GROUP BY (for filtering)
function buildTaskQuery(): string {
  return `${buildTaskQueryBase()} WHERE t.deleted_at IS NULL GROUP BY t.id`;
}

interface DbTask {
  id: string;
  list_id: string;
  name: string;
  description: string | null;
  date: number | null;
  deadline: number | null;
  reminder: number | null;
  estimate: number | null;
  actual_time: number | null;
  priority: Priority;
  completed: number;
  completed_at: number | null;
  recurring_type: string | null;
  recurring_config: string | null;
  attachment_path: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  assigned_to: string | null;
  workspace_id: string | null;
  parent_task_id: string | null;
}

interface DbSubtask {
  id: string;
  task_id: string;
  name: string;
  completed: number;
  completed_at: number | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface DbLabel {
  id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: number;
  updated_at: number;
}

interface DbList {
  id: string;
  name: string;
  emoji: string;
  color: string;
  is_inbox: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface DbTaskHistory {
  id: string;
  task_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: number;
}

interface DbTaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: number;
}

interface DbSharedTask {
  id: string;
  task_id: string;
  share_token: string;
  shared_by: string | null;
  shared_at: number;
}

interface DbComment {
  id: string;
  task_id: string;
  author: string | null;
  content: string;
  created_at: number;
  updated_at: number;
}

interface DbTaskNote {
  id: string;
  task_id: string;
  title: string | null;
  content: string;
  created_at: number;
  updated_at: number;
}

interface DbCustomField {
  id: string;
  name: string;
  type: string;
  options: string | null;
  created_at: number;
  updated_at: number;
}

interface DbTaskCustomFieldValue {
  id: string;
  task_id: string;
  field_id: string;
  value: string | null;
  created_at: number;
  updated_at: number;
}

interface DbTaskTemplate {
  id: string;
  name: string;
  description: string | null;
  list_id: string;
  priority: Priority;
  created_at: number;
  updated_at: number;
}

interface DbCustomView {
  id: string;
  name: string;
  icon: string | null;
  filter_config: string;
  is_default: number;
  created_at: number;
  updated_at: number;
}

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

function mapDbTask(row: QueryResult): Task {
  const dbTask = row as unknown as DbTask;
  if (!dbTask || !dbTask.id) {
    throw new Error('Invalid task data: missing id');
  }
  const labels = safeJsonParse<Label[]>(row.labels, []);
  const subtasks = safeJsonParse<Subtask[]>(row.subtasks, []);
  const customFields = safeJsonParse<{ fieldId: string; value: string }[]>(row.custom_fields, []);
  const recurringExceptions = safeJsonParse<number[]>(row.recurring_exceptions, []);
  return {
    id: dbTask.id,
    listId: dbTask.list_id,
    name: dbTask.name ?? '',
    description: dbTask.description,
    date: dbTask.date,
    deadline: dbTask.deadline,
    reminder: dbTask.reminder,
    estimate: dbTask.estimate,
    actualTime: dbTask.actual_time,
    priority: dbTask.priority ?? 'none',
    completed: Boolean(dbTask.completed),
    completedAt: dbTask.completed_at,
    recurringType: dbTask.recurring_type,
    recurringConfig: dbTask.recurring_config,
    attachmentPath: dbTask.attachment_path,
    sortOrder: dbTask.sort_order ?? 0,
    createdAt: dbTask.created_at ?? Date.now(),
    updatedAt: dbTask.updated_at ?? Date.now(),
    deletedAt: dbTask.deleted_at,
    assignedTo: dbTask.assigned_to,
    workspaceId: dbTask.workspace_id,
    parentTaskId: dbTask.parent_task_id,
    labels: labels.filter((l) => l && l.id),
    subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    recurringExceptions: recurringExceptions.filter((e) => e !== null && e !== undefined),
    customFields: customFields.filter((f) => f && f.fieldId),
  };
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

export async function getLabelById(id: string): Promise<Label | null> {
  await initDb();
  const row = runGet('SELECT id, name, emoji, color, created_at as createdAt, updated_at as updatedAt FROM labels WHERE id = ?', [id]);
  if (!row || !row.id) return null;
  return row as unknown as Label;
}

// Tasks
export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  await initDb();

  let query = buildTaskQueryBase();
  const params: unknown[] = [];

  // Start WHERE clause
  query += ' WHERE t.deleted_at IS NULL';

  if (filter.workspaceId) {
    query += ' AND t.workspace_id = ?';
    params.push(filter.workspaceId);
  }

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

  query += ' GROUP BY t.id';

  // Add sorting support
  const sortBy = filter.sort || 'date';
  const sortDirection = filter.sortDirection || 'desc';

  const sortField = {
    'date': 't.date',
    'created': 't.created_at',
    'priority': 't.priority',
    'name': 't.name',
    'list': 't.list_id',
  }[sortBy] || 't.date';

  query += ` ORDER BY ${sortField} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}, t.created_at DESC`;

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

  return rows.filter((row): row is QueryResult & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

export interface PaginatedTasksResult {
  tasks: Task[];
  total: number;
}

export async function getTasksPaginated(filter: TaskFilter = {}): Promise<PaginatedTasksResult> {
  const tasks = await getTasks(filter);
  return { tasks, total: tasks.length };
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM tasks WHERE list_id = ?', [data.listId || 'inbox']);
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  // Use transaction for atomic operation
  const task = runInTransaction(() => {
    // Try with all new columns first, fall back if columns don't exist (for existing databases)
    try {
      runQuery(
        `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order, assigned_to, workspace_id, parent_task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', now, now, sortOrder, data.assignedTo || null, data.workspaceId || null, data.parentTaskId || null]
      );
    } catch {
      // Fallback for databases without new columns
      try {
        runQuery(
          `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order, assigned_to, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', now, now, sortOrder, data.assignedTo || null, data.workspaceId || null]
        );
      } catch {
        runQuery(
          `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', now, now, sortOrder]
        );
      }
    }

    if (data.labels && data.labels.length > 0) {
      for (const labelId of data.labels) {
        runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    }

    return { id, createdAt: now, updatedAt: now, sortOrder, ...data } as Task;
  });

  return task;
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
  const assignedTo = data.assignedTo !== undefined ? data.assignedTo : task.assignedTo;

  // Log changes for all fields including those not in Task type
  const fieldsToLog: (keyof Task)[] = ['listId', 'name', 'description', 'date', 'deadline', 'reminder', 'estimate',
    'actualTime', 'priority', 'completed', 'completedAt', 'recurringType', 'recurringConfig',
    'attachmentPath', 'sortOrder', 'assignedTo'];

  for (const key of fieldsToLog) {
    const oldValue = task[key];
    const newValue = data[key];
    if (oldValue !== newValue) {
      await logTaskChange(id, key, oldValue, newValue);
    }
  }

  // Special handling for customFields - compare as JSON strings
  if (data.customFields !== undefined) {
    const oldCustomFields = task.customFields;
    const newCustomFields = data.customFields;
    if (JSON.stringify(oldCustomFields) !== JSON.stringify(newCustomFields)) {
      await logTaskChange(id, 'customFields', oldCustomFields, newCustomFields);
    }
  }

  // Try with assigned_to column first, fall back if column doesn't exist
  try {
    runQuery(
      `UPDATE tasks SET list_id = ?, name = ?, description = ?, date = ?, deadline = ?, reminder = ?, estimate = ?, actual_time = ?, priority = ?, completed = ?, completed_at = ?, recurring_type = ?, recurring_config = ?, attachment_path = ?, sort_order = ?, updated_at = ?, assigned_to = ? WHERE id = ?`,
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
        assignedTo,
        id
      ]
    );
  } catch {
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
  }

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
  const row = runGet(`${buildTaskQueryBase()} WHERE t.id = ? AND t.deleted_at IS NULL GROUP BY t.id`, [id]);

  if (!row || !row.id) return null;

  return mapDbTask(row);
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
  // Delete task links involving this task (both as source and target)
  runQuery('DELETE FROM task_links WHERE task_id = ? OR linked_task_id = ?', [id, id]);
  // Soft delete the task
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

// Archive task - move to archived state instead of deleted
export async function archiveTask(id: string): Promise<boolean> {
  await initDb();
  const now = Date.now();
  runQuery('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
  saveDb();
  return true;
}

export async function getDeletedTasks(): Promise<Task[]> {
  await initDb();
  const rows = runQuery(
    `${buildTaskQueryBase()} WHERE t.deleted_at IS NOT NULL GROUP BY t.id ORDER BY t.deleted_at DESC`
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter((row): row is QueryResult & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

export async function permanentlyDeleteTask(id: string): Promise<boolean> {
  await initDb();
  // Delete task links involving this task
  runQuery('DELETE FROM task_links WHERE task_id = ? OR linked_task_id = ?', [id, id]);
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
export async function getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  await initDb();
  const rows = runQuery(
    'SELECT id, field, old_value as oldValue, new_value as newValue, changed_at as changedAt FROM task_history WHERE task_id = ? ORDER BY changed_at DESC',
    [taskId]
  );
  return rows.map(row => ({
    id: row.id as string,
    taskId,
    field: row.field as string,
    oldValue: row.oldValue as string | null,
    newValue: row.newValue as string | null,
    changedAt: row.changedAt as number,
  }));
}

// Task Dependencies

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
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks,
      json_group_array(DISTINCT json_object('fieldId', cfv.field_id, 'value', cfv.value)) as custom_fields,
      json_group_array(DISTINCT re.exception_date) as recurring_exceptions
    FROM task_dependencies td
    JOIN tasks t ON td.depends_on_task_id = t.id
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    LEFT JOIN task_custom_field_values cfv ON t.id = cfv.task_id
    LEFT JOIN recurring_exceptions re ON t.id = re.parent_taskId
    WHERE td.task_id = ?
    GROUP BY t.id`,
    [taskId]
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter((row): row is QueryResult & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

// Recurring tasks
export interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
  maxOccurrences?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc. (for weekly)
  dayOfMonth?: number; // For monthly "on day X"
  onDay?: number; // For monthly "on Nth weekday of month"
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
      // Handle specific days of week
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        // Find next specified day
        let nextDay = new Date(currentDate);
        let found = false;
        while (!found && occurrences < maxOccurrences) {
          nextDay.setDate(nextDay.getDate() + 1);
          if (config.daysOfWeek!.includes(nextDay.getDay())) {
            found = true;
            newDate.setTime(nextDay.getTime());
          }
        }
        if (!found) break;
      } else {
        newDate.setDate(newDate.getDate() + config.interval * 7);
      }
    } else if (config.type === 'monthly') {
      // Handle specific day of month or "Nth weekday"
      if (config.dayOfMonth) {
        newDate.setDate(config.dayOfMonth);
      } else if (config.onDay) {
        // onDay: {week: 1-5, day: 0-6} - nth occurrence of day in month
        const targetWeek = Math.abs(config.onDay) % 10;
        const targetDay = Math.abs(config.onDay) % 7;
        const isNegative = config.onDay < 0;

        // Find the target day in the month
        newDate.setDate(1);
        while (newDate.getDay() !== targetDay) {
          newDate.setDate(newDate.getDate() + 1);
        }
        // Move to the Nth occurrence
        if (targetWeek > 1) {
          newDate.setDate(newDate.getDate() + (targetWeek - 1) * 7);
        }
        // Handle negative (last occurrence)
        if (isNegative) {
          newDate.setMonth(newDate.getMonth() + 1);
          newDate.setDate(0); // Last day of month
          while (newDate.getDay() !== targetDay) {
            newDate.setDate(newDate.getDate() - 1);
          }
        }
      } else {
        newDate.setMonth(newDate.getMonth() + config.interval);
      }
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
        parentTaskId: task.id,
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
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks,
      json_group_array(DISTINCT json_object('fieldId', cfv.field_id, 'value', cfv.value)) as custom_fields,
      json_group_array(DISTINCT re.exception_date) as recurring_exceptions
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    LEFT JOIN task_custom_field_values cfv ON t.id = cfv.task_id
    LEFT JOIN recurring_exceptions re ON t.id = re.parent_taskId
    WHERE t.reminder IS NOT NULL AND t.reminder <= ? AND t.completed = 0
    GROUP BY t.id
    ORDER BY t.reminder ASC`,
    [in24Hours]
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter((row): row is QueryResult & { id: unknown } => Boolean(row.id)).map(mapDbTask);
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

export async function useTemplate(templateId: string, overrides: Partial<Task> = {}): Promise<Task> {
  await initDb();
  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const task = await createTask({
    name: overrides.name ?? template.name,
    description: overrides.description ?? template.description,
    listId: overrides.listId ?? template.listId,
    priority: overrides.priority ?? template.priority,
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
  expiresAt: number | null;
}

export async function getSharedTask(taskId: string): Promise<SharedTask | null> {
  await initDb();
  const result = runGet(
    'SELECT id, task_id as taskId, share_token as shareToken, shared_by as sharedBy, shared_at as sharedAt, expires_at as expiresAt FROM shared_tasks WHERE task_id = ?',
    [taskId]
  );
  if (!result || !result.id) return null;
  return result as unknown as SharedTask;
}

export async function createShareToken(taskId: string, sharedBy?: string, expiresInHours?: number): Promise<string> {
  await initDb();

  const existing = await getSharedTask(taskId);
  if (existing?.shareToken) {
    // Update expiration if new one provided
    if (expiresInHours) {
      const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
      runQuery('UPDATE shared_tasks SET expires_at = ? WHERE task_id = ?', [expiresAt, taskId]);
      saveDb();
    }
    return existing.shareToken;
  }

  const id = randomUUID();
  const shareToken = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : null;

  runQuery(
    'INSERT INTO shared_tasks (id, task_id, share_token, shared_by, shared_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, shareToken, sharedBy || null, now, expiresAt]
  );
  saveDb();

  return shareToken;
}

export async function getTaskByShareToken(token: string): Promise<Task | null> {
  await initDb();

  // Check if token has expired
  const now = Date.now();
  const result = runGet(
    `${buildTaskQueryBase()}
    JOIN shared_tasks st ON t.id = st.task_id
    WHERE st.share_token = ? AND (st.expires_at IS NULL OR st.expires_at > ?) AND t.deleted_at IS NULL
    GROUP BY t.id`,
    [token, now]
  );

  if (!result || !result.id) return null;

  return mapDbTask(result);
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

export async function getCommentById(id: string): Promise<Comment | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, author, content, created_at as createdAt, updated_at as updatedAt FROM comments WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Comment;
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

// Task Assignment
export async function assignTask(taskId: string, userId: string): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(taskId);
  if (!task) return null;

  const now = Date.now();
  await logTaskChange(taskId, 'assignedTo', task.assignedTo, userId);

  runQuery('UPDATE tasks SET assigned_to = ?, updated_at = ? WHERE id = ?', [userId, now, taskId]);
  saveDb();

  return { ...task, assignedTo: userId, updatedAt: now } as Task;
}

export async function unassignTask(taskId: string): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(taskId);
  if (!task) return null;

  const now = Date.now();
  await logTaskChange(taskId, 'assignedTo', task.assignedTo, null);

  runQuery('UPDATE tasks SET assigned_to = NULL, updated_at = ? WHERE id = ?', [now, taskId]);
  saveDb();

  return { ...task, assignedTo: null, updatedAt: now } as Task;
}

// Workspaces
export async function getWorkspaces(): Promise<Workspace[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, created_by as createdBy, created_at as createdAt, updated_at as updatedAt FROM workspaces ORDER BY created_at DESC'
  ) as unknown as Promise<Workspace[]>;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, description, created_by as createdBy, created_at as createdAt, updated_at as updatedAt FROM workspaces WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Workspace;
}

export async function createWorkspace(data: { name: string; description?: string | null; createdBy?: string }): Promise<Workspace> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO workspaces (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description || null, data.createdBy || null, now, now]
  );
  saveDb();

  return { id, name: data.name, description: data.description || null, createdBy: data.createdBy || null, createdAt: now, updatedAt: now };
}

export async function updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace | null> {
  await initDb();
  const workspace = await getWorkspaceById(id);
  if (!workspace) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...workspace, ...data, updatedAt: now };
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM workspace_members WHERE workspace_id = ?', [id]);
  runQuery('DELETE FROM tasks WHERE workspace_id = ?', [id]);
  runQuery('DELETE FROM workspaces WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Workspace Members
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  await initDb();
  return runQuery(
    'SELECT id, workspace_id as workspaceId, user_id as userId, role, joined_at as joinedAt FROM workspace_members WHERE workspace_id = ? ORDER BY role DESC, joined_at ASC',
    [workspaceId]
  ) as unknown as Promise<WorkspaceMember[]>;
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole = 'editor'): Promise<WorkspaceMember> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
    [id, workspaceId, userId, role, now]
  );
  saveDb();

  return { id, workspaceId, userId, role, joinedAt: now };
}

export async function updateWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<boolean> {
  await initDb();
  runQuery(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
    [role, workspaceId, userId]
  );
  saveDb();
  return true;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
  saveDb();
  return true;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  await initDb();
  const rows = runQuery(
    `SELECT w.id, w.name, w.description, w.created_by as createdBy, w.created_at as createdAt, w.updated_at as updatedAt
     FROM workspaces w
     JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows as unknown as Promise<Workspace[]>;
}

export async function getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  await initDb();
  const row = runGet(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, userId]
  );
  return (row?.role as WorkspaceRole) || null;
}

// Task Links
export async function getTaskLinks(taskId: string): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskLink[]>;
}

// Recurring Completions
export async function getRecurringCompletions(parentTaskId: string): Promise<RecurringCompletion[]> {
  await initDb();
  return runQuery(
    'SELECT id, parent_task_id as parentTaskId, completed_at as completedAt, created_at as createdAt FROM recurring_completions WHERE parent_task_id = ? ORDER BY completed_at DESC',
    [parentTaskId]
  ) as unknown as Promise<RecurringCompletion[]>;
}

export async function addRecurringCompletion(parentTaskId: string, completedAt: number): Promise<RecurringCompletion> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO recurring_completions (id, parent_task_id, completed_at, created_at) VALUES (?, ?, ?, ?)',
    [id, parentTaskId, completedAt, now]
  );
  saveDb();

  return { id, parentTaskId, completedAt, createdAt: now };
}

export async function getRecurringCompletionCount(parentTaskId: string, date: number): Promise<number> {
  await initDb();
  const result = runQuery(
    'SELECT COUNT(*) as count FROM recurring_completions WHERE parent_task_id = ? AND completed_at = ?',
    [parentTaskId, date]
  );
  return (result[0]?.count as number) || 0;
}

export async function getTaskLinksByType(taskId: string, type: TaskLinkType): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE task_id = ? AND type = ? ORDER BY created_at DESC',
    [taskId, type]
  ) as unknown as Promise<TaskLink[]>;
}

export async function getLinkedTasks(taskId: string): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE linked_task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskLink[]>;
}

export async function createTaskLink(taskId: string, linkedTaskId: string, type: TaskLinkType): Promise<TaskLink> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO task_links (id, task_id, linked_task_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, taskId, linkedTaskId, type, now]
  );
  saveDb();

  return { id, taskId, linkedTaskId, type, createdAt: now };
}

export async function deleteTaskLink(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_links WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function deleteTaskLinksByTasks(taskId: string, linkedTaskId: string): Promise<boolean> {
  await initDb();
  runQuery(
    'DELETE FROM task_links WHERE (task_id = ? AND linked_task_id = ?) OR (task_id = ? AND linked_task_id = ?)',
    [taskId, linkedTaskId, linkedTaskId, taskId]
  );
  saveDb();
  return true;
}

// Note Attachments
export async function getNoteAttachments(noteId: string): Promise<NoteAttachment[]> {
  await initDb();
  return runQuery(
    'SELECT id, note_id as noteId, filename, mimetype, size, created_at as createdAt FROM note_attachments WHERE note_id = ? ORDER BY created_at DESC',
    [noteId]
  ) as unknown as Promise<NoteAttachment[]>;
}

export async function createNoteAttachment(noteId: string, filename: string, mimetype: string, size: number): Promise<NoteAttachment> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO note_attachments (id, note_id, filename, mimetype, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, noteId, filename, mimetype, size, now]
  );
  saveDb();

  return { id, noteId, filename, mimetype, size, createdAt: now };
}

export async function deleteNoteAttachment(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM note_attachments WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Goals
export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: number | null;
  taskId: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function getGoals(): Promise<Goal[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, target_value as targetValue, current_value as currentValue, unit, deadline, task_id as taskId, created_at as createdAt, updated_at as updatedAt FROM goals ORDER BY deadline ASC, created_at DESC'
  ) as unknown as Promise<Goal[]>;
}

export async function getGoalById(id: string): Promise<Goal | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, description, target_value as targetValue, current_value as currentValue, unit, deadline, task_id as taskId, created_at as createdAt, updated_at as updatedAt FROM goals WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Goal;
}

export async function createGoal(data: { name: string; description?: string | null; targetValue: number; unit: string; deadline?: number | null; taskId?: string | null }): Promise<Goal> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO goals (id, name, description, target_value, current_value, unit, deadline, task_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description || null, data.targetValue, 0, data.unit, data.deadline || null, data.taskId || null, now, now]
  );
  saveDb();

  return { id, name: data.name, description: data.description || null, targetValue: data.targetValue, currentValue: 0, unit: data.unit, deadline: data.deadline || null, taskId: data.taskId || null, createdAt: now, updatedAt: now };
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<Goal | null> {
  await initDb();
  const goal = await getGoalById(id);
  if (!goal) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.targetValue !== undefined) { updates.push('target_value = ?'); values.push(data.targetValue); }
  if (data.currentValue !== undefined) { updates.push('current_value = ?'); values.push(data.currentValue); }
  if (data.unit !== undefined) { updates.push('unit = ?'); values.push(data.unit); }
  if (data.deadline !== undefined) { updates.push('deadline = ?'); values.push(data.deadline); }
  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...goal, ...data, updatedAt: now };
}

export async function deleteGoal(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM goals WHERE id = ?', [id]);
  runQuery('DELETE FROM goal_milestones WHERE goal_id = ?', [id]);
  saveDb();
  return true;
}

export async function updateGoalProgress(id: string, increment: number): Promise<Goal | null> {
  await initDb();
  const goal = await getGoalById(id);
  if (!goal) return null;

  const newValue = Math.min(Math.max(goal.currentValue + increment, 0), goal.targetValue);
  const now = Date.now();

  runQuery('UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ?', [newValue, now, id]);
  saveDb();

  return { ...goal, currentValue: newValue, updatedAt: now };
}

// Goal Milestones
export interface GoalMilestone {
  id: string;
  goalId: string;
  name: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
  await initDb();
  return runQuery(
    'SELECT id, goal_id as goalId, name, target_value as targetValue, current_value as currentValue, completed, completed_at as completedAt, created_at as createdAt, updated_at as updatedAt FROM goal_milestones WHERE goal_id = ? ORDER BY created_at DESC',
    [goalId]
  ) as unknown as Promise<GoalMilestone[]>;
}

export async function createGoalMilestone(data: { goalId: string; name: string; targetValue: number; currentValue?: number }): Promise<GoalMilestone> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO goal_milestones (id, goal_id, name, target_value, current_value, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [id, data.goalId, data.name, data.targetValue, data.currentValue || 0, now, now]
  );
  saveDb();

  return { id, goalId: data.goalId, name: data.name, targetValue: data.targetValue, currentValue: data.currentValue || 0, completed: false, completedAt: null, createdAt: now, updatedAt: now };
}

export async function updateGoalMilestone(id: string, data: Partial<GoalMilestone>): Promise<GoalMilestone | null> {
  await initDb();
  const milestone = await runGet('SELECT * FROM goal_milestones WHERE id = ?', [id]);
  if (!milestone) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.targetValue !== undefined) { updates.push('target_value = ?'); values.push(data.targetValue); }
  if (data.currentValue !== undefined) { updates.push('current_value = ?'); values.push(data.currentValue); }
  if (data.completed !== undefined) { updates.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(data.completedAt); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE goal_milestones SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...milestone, ...data, completed: data.completed ?? milestone.completed, completedAt: data.completedAt ?? milestone.completedAt, updatedAt: now } as GoalMilestone;
}

export async function completeGoalMilestone(id: string): Promise<GoalMilestone | null> {
  await initDb();
  const milestone = await runGet('SELECT * FROM goal_milestones WHERE id = ?', [id]);
  if (!milestone) return null;

  const now = Date.now();
  runQuery('UPDATE goal_milestones SET completed = 1, completed_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
  saveDb();

  return { ...milestone, completed: true, completedAt: now, updatedAt: now } as GoalMilestone;
}

export async function deleteGoalMilestone(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM goal_milestones WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Activity Feed
export interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'comment_added' | 'task_assigned' | 'label_added';
  taskId: string;
  userId: string | null;
  userName: string | null;
  details: string | null;
  createdAt: number;
}

export async function getActivities(limit: number = 50): Promise<Activity[]> {
  await initDb();
  return runQuery(
    'SELECT id, type, task_id as taskId, user_id as userId, user_name as userName, details, created_at as createdAt FROM activities ORDER BY created_at DESC LIMIT ?',
    [limit]
  ) as unknown as Promise<Activity[]>;
}

export async function createActivity(data: { type: string; taskId: string; userId?: string | null; userName?: string | null; details?: string | null }): Promise<Activity> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO activities (id, type, task_id, user_id, user_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.type, data.taskId, data.userId || null, data.userName || null, data.details || null, now]
  );
  saveDb();

  return { id, type: data.type as any, taskId: data.taskId, userId: data.userId || null, userName: data.userName || null, details: data.details || null, createdAt: now };
}

// Helper to extract @mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

// Time Blocks
export interface TimeBlock {
  id: string;
  taskId: string | null;
  name: string;
  description: string | null;
  start: number;
  end: number;
  color: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function getTimeBlocks(start: number, end: number): Promise<TimeBlock[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, name, description, start, end, color, created_at as createdAt, updated_at as updatedAt FROM time_blocks WHERE start >= ? AND end <= ? ORDER BY start ASC',
    [start, end]
  ) as unknown as Promise<TimeBlock[]>;
}

export async function getTimeBlockById(id: string): Promise<TimeBlock | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, name, description, start, end, color, created_at as createdAt, updated_at as updatedAt FROM time_blocks WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as TimeBlock;
}

export async function createTimeBlock(data: { taskId?: string | null; name: string; description?: string | null; start: number; end: number; color?: string | null }): Promise<TimeBlock> {
  await initDb();
  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO time_blocks (id, task_id, name, description, start, end, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.taskId || null, data.name, data.description || null, data.start, data.end, data.color || '#3b82f6', now, now]
  );
  saveDb();

  return { id, taskId: data.taskId || null, name: data.name, description: data.description || null, start: data.start, end: data.end, color: data.color || '#3b82f6', createdAt: now, updatedAt: now };
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock | null> {
  await initDb();
  const block = await getTimeBlockById(id);
  if (!block) return null;

  const now = Date.now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.start !== undefined) { updates.push('start = ?'); values.push(data.start); }
  if (data.end !== undefined) { updates.push('end = ?'); values.push(data.end); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
  updates.push('updated_at = ?'); values.push(now);
  values.push(id);

  runQuery(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...block, ...data, updatedAt: now };
}

export async function deleteTimeBlock(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM time_blocks WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function getSuggestedTimeSlot(duration: number, preferredHours?: number[]): Promise<{ start: number; end: number }> {
  await initDb();

  // Get busy times from tasks with dates
  const busyBlocks = runQuery(
    'SELECT date as start, deadline as end FROM tasks WHERE date IS NOT NULL AND deadline IS NOT NULL'
  ) as { start: number; end: number }[];

  // Add existing time blocks
  const now = Date.now();
  const oneWeek = now + 7 * 24 * 60 * 60 * 1000;
  const existingBlocks = await getTimeBlocks(now, oneWeek);
  busyBlocks.push(...existingBlocks.map(b => ({ start: b.start, end: b.end })));

  // Sort by start time
  busyBlocks.sort((a, b) => a.start - b.start);

  // Find a free slot
  const checkHour = preferredHours?.[0] ?? 9; // Default 9 AM
  let candidateStart = new Date(now);
  candidateStart.setHours(checkHour, 0, 0, 0);
  let candidateStartTs = candidateStart.getTime();

  // Check if this slot is free
  for (const block of busyBlocks) {
    if (candidateStartTs >= block.start && candidateStartTs < block.end) {
      // Slot is busy, move to next day
      candidateStart = new Date(candidateStartTs + 24 * 60 * 60 * 1000);
      candidateStart.setHours(checkHour, 0, 0, 0);
      candidateStartTs = candidateStart.getTime();
    }
  }

  return {
    start: candidateStartTs,
    end: candidateStartTs + duration,
  };
}