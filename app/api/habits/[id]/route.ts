import { initDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';
import { NextRequest } from 'next/server';

interface Habit {
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

function getHabitById(id: string): Habit | null {
  const rows = runQuery(
    'SELECT id, name, description, streak, last_completed as lastCompleted, created_at as createdAt, updated_at as updatedAt FROM habits WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    streak: (row.streak as number) || 0,
    lastCompleted: row.lastCompleted as number | null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  };
}

// GET /api/habits/[id]
export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const urlParts = request.nextUrl.pathname.split('/');
  const id = urlParts[urlParts.length - 1];
  const habit = getHabitById(id);
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }
  return Response.json({ data: habit });
}));

// PATCH /api/habits/[id] - Update habit
export const PATCH = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const urlParts = request.nextUrl.pathname.split('/');
  const id = urlParts[urlParts.length - 1];
  const habit = getHabitById(id);
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const body = await request.json();
  const { name, description } = body;
  const now = Date.now();

  if (name !== undefined) {
    runQuery('UPDATE habits SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
  }
  if (description !== undefined) {
    runQuery('UPDATE habits SET description = ?, updated_at = ? WHERE id = ?', [description || null, now, id]);
  }

  saveDb();
  const updated = getHabitById(id);
  return Response.json({ data: updated });
}));

// DELETE /api/habits/[id]
export const DELETE = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const urlParts = request.nextUrl.pathname.split('/');
  const id = urlParts[urlParts.length - 1];
  const habit = getHabitById(id);
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  runQuery('DELETE FROM habit_completions WHERE habit_id = ?', [id]);
  runQuery('DELETE FROM habits WHERE id = ?', [id]);
  saveDb();

  return Response.json({ success: true });
}));