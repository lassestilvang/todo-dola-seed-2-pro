import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import { randomUUID } from 'crypto';

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
    if (expiresInHours) {
      const expiresAt = now() + expiresInHours * 60 * 60 * 1000;
      runQuery('UPDATE shared_tasks SET expires_at = ? WHERE task_id = ?', [expiresAt, taskId]);
      saveDb();
    }
    return existing.shareToken;
  }

  const id = generateId();
  const shareToken = randomUUID();
  const nowVal = now();
  const expiresAt = expiresInHours ? nowVal + expiresInHours * 60 * 60 * 1000 : null;

  runQuery(
    'INSERT INTO shared_tasks (id, task_id, share_token, shared_by, shared_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, shareToken, sharedBy || null, nowVal, expiresAt]
  );
  saveDb();

  return shareToken;
}

export async function getTaskByShareToken(token: string): Promise<any | null> {
  const { buildTaskQueryBase, mapDbTask } = await import('./tasks');
  await initDb();

  const nowVal = now();
  const result = runGet(
    `${buildTaskQueryBase()}
    JOIN shared_tasks st ON t.id = st.task_id
    WHERE st.share_token = ? AND (st.expires_at IS NULL OR st.expires_at > ?) AND t.deleted_at IS NULL
    GROUP BY t.id`,
    [token, nowVal]
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