import { initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TimeEntry } from '../types';

export async function getTimeEntries(taskId?: string): Promise<TimeEntry[]> {
  await initDb();
  if (taskId) {
    return runQuery(
      'SELECT id, task_id as taskId, duration, description, started_at as startedAt, ended_at as endedAt FROM time_entries WHERE task_id = ? ORDER BY started_at DESC',
      [taskId]
    ) as unknown as Promise<TimeEntry[]>;
  }
  return runQuery(
    'SELECT id, task_id as taskId, duration, description, started_at as startedAt, ended_at as endedAt FROM time_entries ORDER BY started_at DESC'
  ) as unknown as Promise<TimeEntry[]>;
}

export async function getTimeEntryById(id: string): Promise<TimeEntry | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, duration, description, started_at as startedAt, ended_at as endedAt FROM time_entries WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as TimeEntry;
}

export async function createTimeEntry(data: {
  taskId: string;
  duration: number;
  description?: string | null;
  startedAt: number;
  endedAt?: number | null;
}): Promise<TimeEntry> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO time_entries (id, task_id, duration, description, started_at, ended_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.taskId, data.duration, data.description || null, data.startedAt, data.endedAt || null, nowVal, nowVal]
  );
  saveDb();

  return {
    id,
    taskId: data.taskId,
    duration: data.duration,
    description: data.description || null,
    startedAt: data.startedAt,
    endedAt: data.endedAt || null,
    createdAt: nowVal,
    updatedAt: nowVal,
  };
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | null> {
  await initDb();
  const entry = await getTimeEntryById(id);
  if (!entry) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.startedAt !== undefined) { updates.push('started_at = ?'); values.push(data.startedAt); }
  if (data.endedAt !== undefined) { updates.push('ended_at = ?'); values.push(data.endedAt); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...entry, ...data, updatedAt: nowVal };
}

export async function deleteTimeEntry(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM time_entries WHERE id = ?', [id]);
  saveDb();
  return true;
}