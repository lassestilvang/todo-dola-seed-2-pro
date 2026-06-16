import { initDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';
import { randomUUID } from 'crypto';

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

// POST /api/habits/[id]/complete - Complete habit (updates streak)
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // Get habit id from [...id]/complete

  const habit = getHabitById(id);
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  // Check if already completed today
  const completions = runQuery(
    'SELECT completed_at FROM habit_completions WHERE habit_id = ? AND date(completed_at / 1000, "unixepoch") = date(?)',
    [id, now]
  );

  if (completions.length > 0) {
    return Response.json({ data: habit });
  }

  // Calculate new streak
  let newStreak = 1;
  if (habit.lastCompleted) {
    const lastCompleted = new Date(habit.lastCompleted);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastCompleted.getTime() === yesterday.getTime()) {
      newStreak = habit.streak + 1;
    }
  }

  // Record completion
  const completionId = randomUUID();
  runQuery(
    'INSERT INTO habit_completions (id, habit_id, completed_at, created_at) VALUES (?, ?, ?, ?)',
    [completionId, id, todayTimestamp, now]
  );

  // Update habit
  runQuery(
    'UPDATE habits SET streak = ?, last_completed = ?, updated_at = ? WHERE id = ?',
    [newStreak, todayTimestamp, now, id]
  );
  saveDb();

  const updated = getHabitById(id);
  return Response.json({ data: updated });
}));