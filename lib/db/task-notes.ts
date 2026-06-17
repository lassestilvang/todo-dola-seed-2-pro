import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TaskNote, NoteAttachment } from '../types';

export async function getTaskNotes(taskId: string): Promise<TaskNote[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, title, content, created_at as createdAt, updated_at as updatedAt FROM task_notes WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  ) as unknown as Promise<TaskNote[]>;
}

export async function getTaskNoteById(id: string): Promise<TaskNote | null> {
  await initDb();
  const row = runGet(
    'SELECT id, task_id as taskId, title, content, created_at as createdAt, updated_at as updatedAt FROM task_notes WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as TaskNote;
}

export async function createTaskNote(taskId: string, content: string, title?: string | null): Promise<TaskNote> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO task_notes (id, task_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, title || null, content, nowVal, nowVal]
  );
  saveDb();

  return { id, taskId, title: title || null, content, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateTaskNote(id: string, data: Partial<TaskNote>): Promise<TaskNote | null> {
  await initDb();
  const note = await getTaskNoteById(id);
  if (!note) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE task_notes SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...note, ...data, updatedAt: nowVal };
}

export async function deleteTaskNote(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_notes WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Note Attachments
export async function getNoteAttachments(noteId: string): Promise<NoteAttachment[]> {
  await initDb();
  return runQuery(
    'SELECT id, note_id as noteId, filename, mimetype, size, created_at as createdAt FROM note_attachments WHERE note_id = ? ORDER BY created_at DESC',
    [noteId]
  ) as unknown as Promise<NoteAttachment[]>;
}

export async function createNoteAttachment(noteId: string, filename: string, mimetype: string, size: number): Promise<NoteAttachment> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO note_attachments (id, note_id, filename, mimetype, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, noteId, filename, mimetype, size, nowVal]
  );
  saveDb();

  return { id, noteId, filename, mimetype, size, createdAt: nowVal };
}

export async function deleteNoteAttachment(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM note_attachments WHERE id = ?', [id]);
  saveDb();
  return true;
}