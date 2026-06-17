import { getDb, initDb, saveDb, runQuery, generateId, now } from './core';
import type { TaskHistoryEntry } from '../types';

export async function getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  await initDb();
  return runQuery(
    'SELECT id, field, old_value as oldValue, new_value as newValue, changed_at as changedAt FROM task_history WHERE task_id = ? ORDER BY changed_at DESC',
    [taskId]
  ) as unknown as Promise<TaskHistoryEntry[]>;
}