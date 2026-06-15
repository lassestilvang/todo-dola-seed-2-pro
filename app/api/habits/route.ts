import { initDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, validateRequiredFields } from '@/lib/api/middleware';

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  streak: number;
  lastCompleted: number | null;
  createdAt: number;
  updatedAt: number;
}

function runQuery(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const { getDb } = require('@/lib/db');
  const db = getDb();
  if (!db) throw new Error('Database not initialized');
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const columns: string[] = result[0].columns;
  return result[0].values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Get all habits
export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const rows = runQuery(
    'SELECT id, name, description, streak, last_completed as lastCompleted, created_at as createdAt, updated_at as updatedAt FROM habits ORDER BY streak DESC, name'
  );
  const habits = rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    streak: (row.streak as number) || 0,
    lastCompleted: row.lastCompleted as number | null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  }));
  return Response.json({ data: habits });
}));

// Create a new habit
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();
  const { name, description } = body;

  validateRequiredFields({ name }, ['name']);

  const id = randomUUID();
  const now = Date.now();

  runQuery(
    'INSERT INTO habits (id, name, description, streak, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    [id, name, description || null, now, now]
  );
  saveDb();

  const habit: Habit = {
    id,
    name,
    description: description || null,
    streak: 0,
    lastCompleted: null,
    createdAt: now,
    updatedAt: now,
  };

  return Response.json({ data: habit }, { status: 201 });
}));