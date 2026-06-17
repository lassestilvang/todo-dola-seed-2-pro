import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Label } from '../types';

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

export async function createLabel(data: Partial<Label>): Promise<Label> {
  await initDb();
  const id = generateId();
  const nowVal = now();
  const label = { id, createdAt: nowVal, updatedAt: nowVal, ...data };

  runQuery(
    'INSERT INTO labels (id, name, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.name, data.emoji, data.color, nowVal, nowVal]
  );
  saveDb();

  return label as Label;
}

export async function updateLabel(id: string, data: Partial<Label>): Promise<Label | null> {
  await initDb();
  const labelRow = await runGet('SELECT * FROM labels WHERE id = ?', [id]);
  if (!labelRow) return null;

  const nowVal = now();
  const updated: Partial<Label> = { ...labelRow, ...data, updatedAt: nowVal };

  runQuery(
    'UPDATE labels SET name = ?, emoji = ?, color = ?, updated_at = ? WHERE id = ?',
    [updated.name, updated.emoji, updated.color, nowVal, id]
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