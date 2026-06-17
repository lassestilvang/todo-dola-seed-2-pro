import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Subtask } from '../types';

export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, name, completed, completed_at as completedAt, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM subtasks WHERE task_id = ? ORDER BY sort_order',
    [taskId]
  ) as unknown as Promise<Subtask[]>;
}

export async function createSubtask(taskId: string, name: string): Promise<Subtask> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM subtasks WHERE task_id = ?', [taskId]);
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  runQuery(
    'INSERT INTO subtasks (id, task_id, name, completed, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
    [id, taskId, name, sortOrder, nowVal, nowVal]
  );
  saveDb();

  return { id, taskId, name, completed: false, completedAt: null, sortOrder, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateSubtask(id: string, data: Partial<Subtask>): Promise<Subtask | null> {
  await initDb();
  const subtask = await runGet('SELECT * FROM subtasks WHERE id = ?', [id]);
  if (!subtask) return null;

  const nowVal = now();
  const updated: Partial<Subtask> = { ...subtask, ...data, updatedAt: nowVal };

  runQuery(
    'UPDATE subtasks SET name = ?, completed = ?, completed_at = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    [updated.name, updated.completed ? 1 : 0, updated.completedAt, updated.sortOrder, nowVal, id]
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

export async function reorderSubtasks(tasks: { id: string; sortOrder: number }[]): Promise<void> {
  await initDb();
  for (const task of tasks) {
    runQuery('UPDATE subtasks SET sort_order = ? WHERE id = ?', [task.sortOrder, task.id]);
  }
  saveDb();
}