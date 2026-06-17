import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Comment } from '../types';

export async function getComments(taskId: string): Promise<Comment[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, author, content, created_at as createdAt, updated_at as updatedAt FROM comments WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<Comment[]>;
}

export async function getCommentById(id: string): Promise<Comment | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, author, content, created_at as createdAt, updated_at as updatedAt FROM comments WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Comment;
}

export async function createComment(taskId: string, content: string, author?: string): Promise<Comment> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO comments (id, task_id, author, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, author || null, content, nowVal, nowVal]
  );
  saveDb();

  return { id, taskId, author: author || null, content, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateComment(id: string, content: string): Promise<Comment | null> {
  await initDb();
  const comment = await runGet('SELECT * FROM comments WHERE id = ?', [id]);
  if (!comment) return null;

  const nowVal = now();
  runQuery('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?', [content, nowVal, id]);
  saveDb();

  return { ...comment, content, updatedAt: nowVal } as Comment;
}

export async function deleteComment(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM comments WHERE id = ?', [id]);
  saveDb();
  return true;
}