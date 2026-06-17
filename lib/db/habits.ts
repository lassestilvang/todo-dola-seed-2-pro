import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Habit, HabitCompletion } from '../types';

export async function getHabits(): Promise<Habit[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, streak, last_completed as lastCompleted, created_at as createdAt, updated_at as updatedAt FROM habits ORDER BY streak DESC, created_at DESC'
  ) as unknown as Promise<Habit[]>;
}

export async function getHabitById(id: string): Promise<Habit | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, description, streak, last_completed as lastCompleted, created_at as createdAt, updated_at as updatedAt FROM habits WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Habit;
}

export async function createHabit(data: { name: string; description?: string | null }): Promise<Habit> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO habits (id, name, description, streak, last_completed, created_at, updated_at) VALUES (?, ?, ?, 0, NULL, ?, ?)',
    [id, data.name, data.description || null, nowVal, nowVal]
  );
  saveDb();

  return { id, name: data.name, description: data.description || null, streak: 0, lastCompleted: null, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateHabit(id: string, data: Partial<Habit>): Promise<Habit | null> {
  await initDb();
  const habit = await getHabitById(id);
  if (!habit) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...habit, ...data, updatedAt: nowVal };
}

export async function deleteHabit(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM habit_completions WHERE habit_id = ?', [id]);
  runQuery('DELETE FROM habits WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function completeHabit(id: string): Promise<Habit | null> {
  await initDb();
  const habit = await getHabitById(id);
  if (!habit) return null;

  const nowVal = now();
  const today = new Date(nowVal);
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  // Check if already completed today
  const existingCompletion = runGet(
    'SELECT id FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at < ?',
    [id, todayTs, todayTs + 24 * 60 * 60 * 1000]
  );

  if (existingCompletion) {
    return habit;
  }

  // Calculate new streak
  let newStreak = habit.streak;
  if (habit.lastCompleted) {
    const lastDate = new Date(habit.lastCompleted);
    lastDate.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((todayTs - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      newStreak = habit.streak + 1;
    } else if (dayDiff > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  // Record completion
  runQuery(
    'INSERT INTO habit_completions (id, habit_id, completed_at, created_at) VALUES (?, ?, ?, ?)',
    [generateId(), id, nowVal, nowVal]
  );

  // Update habit
  runQuery(
    'UPDATE habits SET streak = ?, last_completed = ?, updated_at = ? WHERE id = ?',
    [newStreak, nowVal, nowVal, id]
  );
  saveDb();

  return { ...habit, streak: newStreak, lastCompleted: nowVal, updatedAt: nowVal };
}

export async function getHabitCompletions(habitId: string, limit: number = 30): Promise<HabitCompletion[]> {
  await initDb();
  return runQuery(
    'SELECT id, habit_id as habitId, completed_at as completedAt FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC LIMIT ?',
    [habitId, limit]
  ) as unknown as Promise<HabitCompletion[]>;
}

export async function getAllHabitCompletions(): Promise<HabitCompletion[]> {
  await initDb();
  return runQuery(
    'SELECT id, habit_id as habitId, completed_at as completedAt FROM habit_completions ORDER BY completed_at DESC'
  ) as unknown as Promise<HabitCompletion[]>;
}