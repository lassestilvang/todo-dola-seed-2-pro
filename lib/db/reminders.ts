import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Reminder } from '../types';

export async function getReminders(taskId?: string): Promise<Reminder[]> {
  await initDb();
  if (taskId) {
    return runQuery(
      'SELECT id, task_id as taskId, reminder_time as reminderTime, sent_at as sentAt, channel, enabled, created_at as createdAt, updated_at as updatedAt FROM reminders WHERE task_id = ? ORDER BY reminder_time ASC',
      [taskId]
    ) as unknown as Promise<Reminder[]>;
  }
  return runQuery(
    'SELECT id, task_id as taskId, reminder_time as reminderTime, sent_at as sentAt, channel, enabled, created_at as createdAt, updated_at as updatedAt FROM reminders ORDER BY reminder_time ASC'
  ) as unknown as Promise<Reminder[]>;
}

export async function createReminder(data: { taskId: string; reminderTime: number; channel?: 'email' | 'in-app' | 'slack' | 'discord' }): Promise<Reminder> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO reminders (id, task_id, reminder_time, sent_at, channel, enabled, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, 1, ?, ?)',
    [id, data.taskId, data.reminderTime, data.channel || 'in-app', nowVal, nowVal]
  );
  saveDb();

  return { id, taskId: data.taskId, reminderTime: data.reminderTime, sentAt: null, channel: data.channel || 'in-app', enabled: true, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | null> {
  await initDb();
  const reminder = await runGet('SELECT * FROM reminders WHERE id = ?', [id]);
  if (!reminder) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.taskId !== undefined) { updates.push('task_id = ?'); values.push(data.taskId); }
  if (data.reminderTime !== undefined) { updates.push('reminder_time = ?'); values.push(data.reminderTime); }
  if (data.sentAt !== undefined) { updates.push('sent_at = ?'); values.push(data.sentAt); }
  if (data.channel !== undefined) { updates.push('channel = ?'); values.push(data.channel); }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...reminder, ...data, enabled: data.enabled ?? reminder.enabled, updatedAt: nowVal } as Reminder;
}

export async function deleteReminder(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM reminders WHERE id = ?', [id]);
  saveDb();
  return true;
}