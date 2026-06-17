import { getDb, initDb, saveDb, runInTransaction, DbError, runQuery, runGet, safeJsonParse, generateId, now } from './core';
import type { Task, Priority, TaskFilter, Label, Subtask } from '../types';

export function buildTaskQueryBase(): string {
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

export interface DbTask {
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

export function mapDbTask(row: Record<string, unknown>): Task {
  const dbTask: DbTask = row as unknown as DbTask;
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
    createdAt: dbTask.created_at ?? now(),
    updatedAt: dbTask.updated_at ?? now(),
    deletedAt: dbTask.deleted_at,
    assignedTo: dbTask.assigned_to,
    workspaceId: dbTask.workspace_id,
    parentTaskId: dbTask.parent_task_id,
    labels: labels.filter((l): l is Label => Boolean(l && l.id)),
    subtasks: subtasks.filter((s): s is Subtask => Boolean(s && s.id)).map((s) => ({ ...s, completed: Boolean(s.completed) })),
    recurringExceptions: recurringExceptions.filter((e): e is number => e !== null && e !== undefined),
    customFields: customFields.filter((f): f is { fieldId: string; value: string } => Boolean(f && f.fieldId)),
  };
}

export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  await initDb();

  let query = buildTaskQueryBase();
  const params: unknown[] = [];

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

  return rows.filter((row): row is Record<string, unknown> & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

export interface PaginatedTasksResult {
  tasks: Task[];
  total: number;
}

interface QueryBuilderResult {
    whereClause: string;
    params: unknown[];
    sortField: string;
    sortDirection: string;
  }

  function buildTaskQueryWhereClause(filter: TaskFilter): QueryBuilderResult {
    const params: unknown[] = [];
    let whereClause = ' WHERE t.deleted_at IS NULL';

    if (filter.workspaceId) {
      whereClause += ' AND t.workspace_id = ?';
      params.push(filter.workspaceId);
    }
    if (filter.listId) {
      whereClause += ' AND t.list_id = ?';
      params.push(filter.listId);
    }
    if (filter.priority) {
      whereClause += ' AND t.priority = ?';
      params.push(filter.priority);
    }
    if (filter.labelId) {
      whereClause += ' AND tl.label_id = ?';
      params.push(filter.labelId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter.view === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      whereClause += ' AND t.date >= ? AND t.date < ?';
      params.push(today.getTime(), tomorrow.getTime());
    } else if (filter.view === 'next7') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      whereClause += ' AND t.date >= ? AND t.date < ?';
      params.push(today.getTime(), weekEnd.getTime());
    } else if (filter.view === 'upcoming') {
      whereClause += ' AND t.date >= ?';
      params.push(today.getTime());
    }

    if (filter.completed !== undefined) {
      whereClause += ' AND t.completed = ?';
      params.push(filter.completed ? 1 : 0);
    }

    if (filter.dateFrom) {
      whereClause += ' AND t.date >= ?';
      params.push(filter.dateFrom);
    }

    if (filter.dateTo) {
      whereClause += ' AND t.date <= ?';
      params.push(filter.dateTo);
    }

    const sortBy = filter.sort || 'date';
    const sortDirection = filter.sortDirection || 'desc';

    const sortField = {
      'date': 't.date',
      'created': 't.created_at',
      'priority': 't.priority',
      'name': 't.name',
      'list': 't.list_id',
    }[sortBy] || 't.date';

    return { whereClause, params, sortField, sortDirection };
  }

  export async function getTasksPaginated(filter: TaskFilter = {}): Promise<PaginatedTasksResult> {
    await initDb();

    const { limit = 100, offset = 0, ...queryFilter } = filter;

    const baseQuery = buildTaskQueryBase();
    const countQuery = `${baseQuery} WHERE t.deleted_at IS NULL GROUP BY t.id`;
    const dataQuery = `${baseQuery} WHERE t.deleted_at IS NULL GROUP BY t.id`;

    const { whereClause, params, sortField, sortDirection } = buildTaskQueryWhereClause(queryFilter);

    // Get total count
    const countRows = runQuery(countQuery + whereClause, params);
    const total = countRows.length;

    // Get paginated data
    const paginatedParams = [...params, limit, offset];
    const rows = runQuery(
      dataQuery + whereClause +
      ` GROUP BY t.id ORDER BY ${sortField} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}, t.created_at DESC` +
      ' LIMIT ? OFFSET ?',
      paginatedParams
    );

    const tasks = rows
      .filter((row): row is Record<string, unknown> & { id: unknown } => Boolean(row.id))
      .map(mapDbTask);

    return { tasks, total };
  }

export async function createTask(data: Partial<Task>): Promise<Task> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM tasks WHERE list_id = ?', [data.listId || 'inbox']);
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  const task = runInTransaction(() => {
    try {
      runQuery(
        `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order, assigned_to, workspace_id, parent_task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', nowVal, nowVal, sortOrder, data.assignedTo || null, data.workspaceId || null, data.parentTaskId || null]
      );
    } catch {
      try {
        runQuery(
          `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order, assigned_to, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', nowVal, nowVal, sortOrder, data.assignedTo || null, data.workspaceId || null]
        );
      } catch {
        runQuery(
          `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', nowVal, nowVal, sortOrder]
        );
      }
    }

    if (data.labels && data.labels.length > 0) {
      for (const labelId of data.labels) {
        runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    }

    return { id, createdAt: nowVal, updatedAt: nowVal, sortOrder, ...data } as Task;
  });

  return task;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(id);
  if (!task) return null;

  const nowVal = now();
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

  if (data.customFields !== undefined) {
    const oldCustomFields = task.customFields;
    const newCustomFields = data.customFields;
    if (JSON.stringify(oldCustomFields) !== JSON.stringify(newCustomFields)) {
      await logTaskChange(id, 'customFields', oldCustomFields, newCustomFields);
    }
  }

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
        nowVal,
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
        nowVal,
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
  return { ...task, ...data, updatedAt: nowVal } as Task;
}

export async function getTaskById(id: string): Promise<Task | null> {
  await initDb();
  const row = runGet(`${buildTaskQueryBase()} WHERE t.id = ? AND t.deleted_at IS NULL GROUP BY t.id`, [id]);

  if (!row || !row.id) return null;

  return mapDbTask(row);
}

export async function toggleTaskCompletion(id: string, completed: boolean): Promise<Task | null> {
  await initDb();
  const task = await getTaskById(id);
  if (!task) return null;

  const nowVal = now();
  const completedAt = completed ? nowVal : null;

  await logTaskChange(id, 'completed', task.completed, completed);
  if (completed !== task.completed) {
    await logTaskChange(id, 'completedAt', task.completedAt, completedAt);
  }

  runQuery(
    `UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    [completed ? 1 : 0, completedAt, nowVal, id]
  );

  saveDb();
  return { ...task, completed, completedAt, updatedAt: nowVal } as Task;
}

export async function logTaskChange(taskId: string, field: string, oldValue: unknown, newValue: unknown): Promise<void> {
  await initDb();
  runQuery(
    `INSERT INTO task_history (id, task_id, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId(), taskId, field, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, now()]
  );
  saveDb();
}

export async function deleteTask(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_links WHERE task_id = ? OR linked_task_id = ?', [id, id]);
  runQuery('UPDATE tasks SET deleted_at = ? WHERE id = ?', [now(), id]);
  saveDb();
  return true;
}

export async function restoreTask(id: string): Promise<boolean> {
  await initDb();
  runQuery('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now(), id]);
  saveDb();
  return true;
}

export async function archiveTask(id: string): Promise<boolean> {
  await initDb();
  const nowVal = now();
  runQuery('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [nowVal, nowVal, id]);
  saveDb();
  return true;
}

export async function getDeletedTasks(): Promise<Task[]> {
  await initDb();
  const rows = runQuery(
    `${buildTaskQueryBase()} WHERE t.deleted_at IS NOT NULL GROUP BY t.id ORDER BY t.deleted_at DESC`
  );

  if (!rows || rows.length === 0) return [];

  return rows.filter((row): row is Record<string, unknown> & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

export async function permanentlyDeleteTask(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_links WHERE task_id = ? OR linked_task_id = ?', [id, id]);
  runQuery('DELETE FROM tasks WHERE id = ?', [id]);
  saveDb();
  return true;
}