import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TimeBlock } from '../types';

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
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO time_blocks (id, task_id, name, description, start, end, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.taskId || null, data.name, data.description || null, data.start, data.end, data.color || '#3b82f6', nowVal, nowVal]
  );
  saveDb();

  return { id, taskId: data.taskId || null, name: data.name, description: data.description || null, start: data.start, end: data.end, color: data.color || '#3b82f6', createdAt: nowVal, updatedAt: nowVal };
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock | null> {
  await initDb();
  const block = await getTimeBlockById(id);
  if (!block) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.start !== undefined) { updates.push('start = ?'); values.push(data.start); }
  if (data.end !== undefined) { updates.push('end = ?'); values.push(data.end); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...block, ...data, updatedAt: nowVal };
}

export async function deleteTimeBlock(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM time_blocks WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function getSuggestedTimeSlot(duration: number, preferredHours?: number[]): Promise<{ start: number; end: number }> {
  await initDb();

  const busyBlocks = runQuery(
    'SELECT date as start, deadline as end FROM tasks WHERE date IS NOT NULL AND deadline IS NOT NULL'
  ) as { start: number; end: number }[];

  const nowVal = now();
  const oneWeek = nowVal + 7 * 24 * 60 * 60 * 1000;
  const existingBlocks = await getTimeBlocks(nowVal, oneWeek);
  busyBlocks.push(...existingBlocks.map(b => ({ start: b.start, end: b.end })));

  busyBlocks.sort((a, b) => a.start - b.start);

  const checkHour = preferredHours?.[0] ?? 9;
  let candidateStart = new Date(nowVal);
  candidateStart.setHours(checkHour, 0, 0, 0);
  let candidateStartTs = candidateStart.getTime();

  for (const block of busyBlocks) {
    if (candidateStartTs >= block.start && candidateStartTs < block.end) {
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