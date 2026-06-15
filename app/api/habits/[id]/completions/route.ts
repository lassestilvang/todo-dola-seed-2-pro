import { initDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';
import { NextRequest } from 'next/server';

interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: number;
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

function getHabitById(id: string): { id: string } | null {
  const rows = runQuery('SELECT id FROM habits WHERE id = ?', [id]);
  return rows.length > 0 ? { id: rows[0].id as string } : null;
}

function getHabitIdFromPath(pathname: string): string {
  const parts = pathname.split('/');
  return parts[parts.length - 2]; // /api/habits/[id]/completions
}

// GET /api/habits/[id]/completions
export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const habitId = getHabitIdFromPath(request.nextUrl.pathname);

  if (!getHabitById(habitId)) {
    throw new ApiError(404, 'Habit not found');
  }

  const rows = runQuery(
    'SELECT id, habit_id as habitId, completed_at as completedAt FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC',
    [habitId]
  );

  const completions: HabitCompletion[] = rows.map(row => ({
    id: row.id as string,
    habitId: row.habitId as string,
    completedAt: row.completedAt as number,
  }));

  return Response.json({ data: completions });
}));

// POST /api/habits/[id]/completions
export const POST = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const habitId = getHabitIdFromPath(request.nextUrl.pathname);

  const habitRow = runQuery('SELECT id, streak, last_completed as lastCompleted FROM habits WHERE id = ?', [habitId]);
  if (habitRow.length === 0) {
    throw new ApiError(404, 'Habit not found');
  }

  const habit = habitRow[0];
  const now = Date.now();
  const currentStreak = (habit.streak as number) || 0;
  const lastCompleted = habit.lastCompleted as number | null;

  let newStreak = 1;
  if (lastCompleted) {
    const lastDate = new Date(lastCompleted);
    lastDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = currentStreak + 1;
    } else if (diffDays === 0) {
      newStreak = currentStreak;
    } else {
      newStreak = 1;
    }
  }

  const id = randomUUID();
  runQuery('INSERT INTO habit_completions (id, habit_id, completed_at) VALUES (?, ?, ?)', [id, habitId, now]);
  runQuery('UPDATE habits SET streak = ?, last_completed = ?, updated_at = ? WHERE id = ?', [newStreak, now, now, habitId]);
  saveDb();

  return Response.json({
    data: { id, habitId, completedAt: now, streak: newStreak },
  }, { status: 201 });
}));