import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TaskLink, TaskLinkType } from '../types';

export async function getTaskLinks(taskId: string): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskLink[]>;
}

export async function getLinkedTasks(taskId: string): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE linked_task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskLink[]>;
}

export async function getTaskLinksByType(taskId: string, type: TaskLinkType): Promise<TaskLink[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, linked_task_id as linkedTaskId, type, created_at as createdAt FROM task_links WHERE task_id = ? AND type = ? ORDER BY created_at DESC',
    [taskId, type]
  ) as unknown as Promise<TaskLink[]>;
}

export async function createTaskLink(taskId: string, linkedTaskId: string, type: TaskLinkType): Promise<TaskLink> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO task_links (id, task_id, linked_task_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, taskId, linkedTaskId, type, nowVal]
  );
  saveDb();

  return { id, taskId, linkedTaskId, type, createdAt: nowVal };
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

export async function getBlockingTasks(taskId: string): Promise<any[]> {
  await initDb();
  const { mapDbTask, buildTaskQueryBase } = await import('./tasks');

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

  return rows.filter((row): row is Record<string, unknown> & { id: unknown } => Boolean(row.id)).map(mapDbTask);
}