import { getDb, initDb, saveDb, runInTransaction, DbError } from './index';
import { randomUUID } from 'crypto';
import type { SqlValue } from 'sql.js';

export { getDb, initDb, saveDb, runInTransaction, DbError };

// Re-export buildTaskQueryBase for use in other modules
export { buildTaskQueryBase } from './tasks';

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  try {
    if (typeof value === 'string') {
      return JSON.parse(value) as T;
    }
    return value as T;
  } catch {
    return fallback;
  }
}

export function toSqlValue(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  return value as SqlValue;
}

export function runQuery(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(sql, params.map(toSqlValue));
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row: SqlValue[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function runGet(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(sql, params.map(toSqlValue));
  if (result.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const obj: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    obj[col] = values[i];
  });
  return obj;
}

export function generateId(): string {
  return randomUUID();
}

export function now(): number {
  return Date.now();
}