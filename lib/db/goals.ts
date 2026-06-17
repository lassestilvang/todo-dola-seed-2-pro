import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Goal, GoalMilestone, GoalUnit } from '../types';

export async function getGoals(): Promise<Goal[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, target_value as targetValue, current_value as currentValue, unit, deadline, task_id as taskId, created_at as createdAt, updated_at as updatedAt FROM goals ORDER BY deadline ASC, created_at DESC'
  ) as unknown as Promise<Goal[]>;
}

export async function getGoalById(id: string): Promise<Goal | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, description, target_value as targetValue, current_value as currentValue, unit, deadline, task_id as taskId, created_at as createdAt, updated_at as updatedAt FROM goals WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Goal;
}

export async function createGoal(data: { name: string; description?: string | null; targetValue: number; unit: GoalUnit; deadline?: number | null; taskId?: string | null }): Promise<Goal> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO goals (id, name, description, target_value, current_value, unit, deadline, task_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description || null, data.targetValue, 0, data.unit, data.deadline || null, data.taskId || null, nowVal, nowVal]
  );
  saveDb();

  return { id, name: data.name, description: data.description || null, targetValue: data.targetValue, currentValue: 0, unit: data.unit, deadline: data.deadline || null, taskId: data.taskId || null, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<Goal | null> {
  await initDb();
  const goal = await getGoalById(id);
  if (!goal) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.targetValue !== undefined) { updates.push('target_value = ?'); values.push(data.targetValue); }
  if (data.currentValue !== undefined) { updates.push('current_value = ?'); values.push(data.currentValue); }
  if (data.unit !== undefined) { updates.push('unit = ?'); values.push(data.unit); }
  if (data.deadline !== undefined) { updates.push('deadline = ?'); values.push(data.deadline); }
  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...goal, ...data, updatedAt: nowVal };
}

export async function updateGoalProgress(id: string, increment: number): Promise<Goal | null> {
  await initDb();
  const goal = await getGoalById(id);
  if (!goal) return null;

  const newValue = Math.min(Math.max(goal.currentValue + increment, 0), goal.targetValue);
  const nowVal = now();

  runQuery('UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ?', [newValue, nowVal, id]);
  saveDb();

  return { ...goal, currentValue: newValue, updatedAt: nowVal };
}

export async function deleteGoal(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM goals WHERE id = ?', [id]);
  runQuery('DELETE FROM goal_milestones WHERE goal_id = ?', [id]);
  saveDb();
  return true;
}

// Goal Milestones
export async function getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
  await initDb();
  return runQuery(
    'SELECT id, goal_id as goalId, name, target_value as targetValue, current_value as currentValue, completed, completed_at as completedAt, created_at as createdAt, updated_at as updatedAt FROM goal_milestones WHERE goal_id = ? ORDER BY created_at DESC',
    [goalId]
  ) as unknown as Promise<GoalMilestone[]>;
}

export async function createGoalMilestone(data: { goalId: string; name: string; targetValue: number; currentValue?: number }): Promise<GoalMilestone> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO goal_milestones (id, goal_id, name, target_value, current_value, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [id, data.goalId, data.name, data.targetValue, data.currentValue || 0, nowVal, nowVal]
  );
  saveDb();

  return { id, goalId: data.goalId, name: data.name, targetValue: data.targetValue, currentValue: data.currentValue || 0, completed: false, completedAt: null, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateGoalMilestone(id: string, data: Partial<GoalMilestone>): Promise<GoalMilestone | null> {
  await initDb();
  const milestone = await runGet('SELECT * FROM goal_milestones WHERE id = ?', [id]);
  if (!milestone) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.targetValue !== undefined) { updates.push('target_value = ?'); values.push(data.targetValue); }
  if (data.currentValue !== undefined) { updates.push('current_value = ?'); values.push(data.currentValue); }
  if (data.completed !== undefined) { updates.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(data.completedAt); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE goal_milestones SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...milestone, ...data, completed: data.completed ?? milestone.completed, completedAt: data.completedAt ?? milestone.completedAt, updatedAt: nowVal } as GoalMilestone;
}

export async function completeGoalMilestone(id: string): Promise<GoalMilestone | null> {
  await initDb();
  const milestone = await runGet('SELECT * FROM goal_milestones WHERE id = ?', [id]);
  if (!milestone) return null;

  const nowVal = now();
  runQuery('UPDATE goal_milestones SET completed = 1, completed_at = ?, updated_at = ? WHERE id = ?', [nowVal, nowVal, id]);
  saveDb();

  return { ...milestone, completed: true, completedAt: nowVal, updatedAt: nowVal } as GoalMilestone;
}

export async function deleteGoalMilestone(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM goal_milestones WHERE id = ?', [id]);
  saveDb();
  return true;
}