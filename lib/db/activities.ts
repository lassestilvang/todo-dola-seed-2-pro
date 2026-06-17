import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Activity } from '../types';

export async function getActivities(limit: number = 50): Promise<Activity[]> {
  await initDb();
  return runQuery(
    'SELECT id, type, task_id as taskId, user_id as userId, user_name as userName, details, created_at as createdAt FROM activities ORDER BY created_at DESC LIMIT ?',
    [limit]
  ) as unknown as Promise<Activity[]>;
}

export async function createActivity(data: { type: string; taskId: string; userId?: string | null; userName?: string | null; details?: string | null }): Promise<Activity> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO activities (id, type, task_id, user_id, user_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.type, data.taskId, data.userId || null, data.userName || null, data.details || null, nowVal]
  );
  saveDb();

  return { id, type: data.type as any, taskId: data.taskId, userId: data.userId || null, userName: data.userName || null, details: data.details || null, createdAt: nowVal };
}

// Helper to extract @mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}