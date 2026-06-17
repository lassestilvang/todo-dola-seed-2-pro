import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Notification } from '../types';

export async function getNotifications(userId?: string, taskId?: string): Promise<Notification[]> {
  await initDb();
  if (userId && taskId) {
    return runQuery(
      'SELECT id, type, task_id as taskId, user_id as userId, message, read, created_at as createdAt FROM notifications WHERE user_id = ? AND task_id = ? ORDER BY created_at DESC',
      [userId, taskId]
    ) as unknown as Promise<Notification[]>;
  }
  if (userId) {
    return runQuery(
      'SELECT id, type, task_id as taskId, user_id as userId, message, read, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ) as unknown as Promise<Notification[]>;
  }
  return runQuery(
    'SELECT id, type, task_id as taskId, user_id as userId, message, read, created_at as createdAt FROM notifications ORDER BY created_at DESC'
  ) as unknown as Promise<Notification[]>;
}

export async function createNotification(data: {
  type: 'mention' | 'assignment' | 'reminder' | 'activity';
  taskId: string;
  userId: string;
  message: string;
  read?: boolean;
}): Promise<Notification> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO notifications (id, type, task_id, user_id, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.type, data.taskId, data.userId, data.message, data.read ? 1 : 0, nowVal]
  );
  saveDb();

  return {
    id,
    type: data.type,
    taskId: data.taskId,
    userId: data.userId,
    message: data.message,
    read: data.read ?? false,
    createdAt: nowVal,
  };
}

export async function createNotificationWithTimestamp(data: {
  type: 'mention' | 'assignment' | 'reminder' | 'activity';
  taskId: string;
  userId: string;
  message: string;
  read?: boolean;
  createdAt?: number;
}): Promise<Notification> {
  await initDb();
  const id = generateId();
  const nowVal = data.createdAt ?? now();

  runQuery(
    'INSERT INTO notifications (id, type, task_id, user_id, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.type, data.taskId, data.userId, data.message, data.read ? 1 : 0, nowVal]
  );
  saveDb();

  return {
    id,
    type: data.type,
    taskId: data.taskId,
    userId: data.userId,
    message: data.message,
    read: data.read ?? false,
    createdAt: nowVal,
  };
}

export async function markNotificationRead(id: string): Promise<boolean> {
  await initDb();
  runQuery('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  await initDb();
  runQuery('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
  saveDb();
  return true;
}

export async function deleteNotification(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM notifications WHERE id = ?', [id]);
  saveDb();
  return true;
}