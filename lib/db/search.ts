import { getDb, initDb, saveDb, runQuery, runGet, now } from './core';
import Fuse from 'fuse.js';
import type { Task } from '../types';

export async function searchTasks(query: string, options: { limit?: number; listId?: string; priority?: string; completed?: boolean; dueBefore?: number; dueAfter?: number } = {}): Promise<Task[]> {
  await initDb();

  let sql = 'SELECT id, list_id as listId, name, description, date, deadline, reminder, estimate, actual_time as actualTime, priority, completed, completed_at as completedAt, recurring_type as recurringType, recurring_config as recurringConfig, attachment_path as attachmentPath, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM tasks WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (options.listId) {
    sql += ' AND list_id = ?';
    params.push(options.listId);
  }

  if (options.priority) {
    sql += ' AND priority = ?';
    params.push(options.priority);
  }

  if (options.completed !== undefined) {
    sql += ' AND completed = ?';
    params.push(options.completed ? 1 : 0);
  }

  if (options.dueBefore) {
    sql += ' AND deadline <= ?';
    params.push(options.dueBefore);
  }

  if (options.dueAfter) {
    sql += ' AND deadline >= ?';
    params.push(options.dueAfter);
  }

  const rows = runQuery(sql, params);
  let tasks = rows.map(row => ({
    id: row.id as string,
    listId: row.listId as string,
    name: row.name as string,
    description: row.description as string | null,
    date: row.date as number | null,
    deadline: row.deadline as number | null,
    reminder: row.reminder as number | null,
    estimate: row.estimate as number | null,
    actualTime: row.actualTime as number | null,
    priority: (row.priority as string) || 'none',
    completed: Boolean(row.completed),
    completedAt: row.completedAt as number | null,
    recurringType: row.recurringType as string | null,
    recurringConfig: row.recurringConfig as string | null,
    attachmentPath: row.attachmentPath as string | null,
    sortOrder: (row.sortOrder as number) || 0,
    createdAt: (row.createdAt as number) || now(),
    updatedAt: (row.updatedAt as number) || now(),
  })) as Task[];

  // Use Fuse.js for fuzzy search
  if (query) {
    const options = {
      keys: ['name', 'description'],
      threshold: 0.3,
      includeScore: true,
    };
    const fuse = new Fuse(tasks, options);
    const results = fuse.search(query);
    tasks = results.map(r => r.item);
  }

  return tasks.slice(0, options.limit || 50);
}

export async function getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
  await initDb();

  // Get recent task names that match the query
  const rows = runQuery(
    'SELECT DISTINCT name FROM tasks WHERE name LIKE ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?',
    [`%${query}%`, limit]
  );

  return rows.map(row => row.name as string);
}