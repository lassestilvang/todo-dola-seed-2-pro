import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Task } from '../types';

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string | null;
  assignedAt: number;
  dueDate?: number | null;
}

// Get tasks with upcoming reminders (within 24 hours)
export async function getUpcomingReminders(): Promise<Task[]> {
  await initDb();
  const nowVal = now();
  const in24Hours = nowVal + 24 * 60 * 60 * 1000;

  const { buildTaskQueryBase } = await import('./tasks');

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

  const { mapDbTask } = await import('./tasks');
  return rows.filter((row): row is Record<string, unknown> & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  await initDb();
  const rows = runQuery(
    'SELECT id, task_id as taskId, user_id as userId, assigned_by as assignedBy, assigned_at as assignedAt, due_date as dueDate FROM task_assignments WHERE task_id = ? ORDER BY assigned_at DESC',
    [taskId]
  );
  return rows.map((row) => ({
    id: row.id as string,
    taskId: row.taskId as string,
    userId: row.userId as string,
    assignedBy: row.assignedBy as string | null,
    assignedAt: row.assignedAt as number,
    dueDate: row.dueDate as number | null | undefined,
  }));
}

export async function getAssignmentsByUser(userId: string): Promise<{ task: Task; assignedAt: number }[]> {
  await initDb();
  const { getTaskById } = await import('./tasks');

  const rows = runQuery(
    'SELECT task_id, assigned_at FROM task_assignments WHERE user_id = ? AND (due_date IS NULL OR due_date >= ?)',
    [userId, Date.now()]
  );

  const results = [];
  for (const row of rows) {
    const task = await getTaskById(row.task_id as string);
    if (task) {
      results.push({ task, assignedAt: row.assigned_at as number });
    }
  }
  return results;
}

export async function createTaskAssignment(taskId: string, userId: string, assignedBy?: string, dueDate?: number): Promise<TaskAssignment> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO task_assignments (id, task_id, user_id, assigned_by, assigned_at, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, userId, assignedBy, nowVal, dueDate]
  );
  saveDb();

  return { id, taskId, userId, assignedBy: assignedBy || null, assignedAt: nowVal, dueDate };
}

export async function updateTaskAssignment(id: string, updates: { dueDate?: number; completed?: boolean }): Promise<TaskAssignment | null> {
  await initDb();
  const { buildTaskQueryBase, runGet } = await import('./core');

  const row = runGet('SELECT * FROM task_assignments WHERE id = ?', [id]);
  if (!row) return null;

  const db = getDb();
  if (!db) return null;

  const setClause: string[] = [];
  const params: unknown[] = [];

  if (updates.dueDate !== undefined) {
    setClause.push('due_date = ?');
    params.push(updates.dueDate);
  }

  if (params.length === 0) {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      userId: row.user_id as string,
      assignedBy: row.assigned_by as string | null,
      assignedAt: row.assigned_at as number,
      dueDate: row.due_date as number | null | undefined,
    };
  }

  params.push(id);
  runQuery(`UPDATE task_assignments SET ${setClause.join(', ')} WHERE id = ?`, params);
  saveDb();

  return {
    id: row.id as string,
    taskId: row.task_id as string,
    userId: row.user_id as string,
    assignedBy: row.assigned_by as string | null,
    assignedAt: row.assigned_at as number,
    dueDate: updates.dueDate ?? (row.due_date as number | null | undefined),
  };
}

export async function deleteTaskAssignment(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_assignments WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function clearTaskAssignments(taskId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);
  saveDb();
  return true;
}