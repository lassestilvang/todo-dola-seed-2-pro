import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TaskList } from '../types';

export async function getLists(): Promise<TaskList[]> {
  await initDb();
  return runQuery('SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists ORDER BY sort_order, is_inbox DESC, name') as unknown as Promise<TaskList[]>;
}

export async function getListById(id: string): Promise<TaskList | null> {
  await initDb();
  const row = runGet('SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists WHERE id = ?', [id]);
  if (!row || !row.id) return null;
  return row as unknown as TaskList;
}

export async function updateList(id: string, data: Partial<TaskList>): Promise<TaskList | null> {
  await initDb();
  const list = await getListById(id);
  if (!list) return null;

  const nowVal = now();
  const name = data.name !== undefined ? data.name : list.name;
  const emoji = data.emoji !== undefined ? data.emoji : list.emoji;
  const color = data.color !== undefined ? data.color : list.color;
  const sortOrder = data.sortOrder !== undefined ? data.sortOrder : list.sortOrder;

  runQuery(
    'UPDATE lists SET name = ?, emoji = ?, color = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    [name, emoji, color, sortOrder, nowVal, id]
  );
  saveDb();

  return { ...list, name, emoji, color, sortOrder, updatedAt: nowVal };
}

export async function deleteList(id: string): Promise<boolean> {
  await initDb();
  const list = await getListById(id);
  if (!list) return false;
  if (list.isInbox) {
    throw new Error('Cannot delete the inbox list');
  }

  runQuery('DELETE FROM lists WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function updateListSortOrder(id: string, sortOrder: number): Promise<void> {
  await initDb();
  runQuery('UPDATE lists SET sort_order = ? WHERE id = ?', [sortOrder, id]);
  saveDb();
}

export async function reorderLists(lists: { id: string; sortOrder: number }[]): Promise<void> {
  await initDb();
  for (const list of lists) {
    runQuery('UPDATE lists SET sort_order = ? WHERE id = ?', [list.sortOrder, list.id]);
  }
  saveDb();
}

export async function createList(data: Partial<TaskList>): Promise<TaskList> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  const maxOrder = runGet('SELECT MAX(sort_order) as maxOrder FROM lists');
  const sortOrder = ((maxOrder?.maxOrder as number) || 0) + 1;

  runQuery(
    `INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.emoji, data.color, data.isInbox ? 1 : 0, sortOrder, nowVal, nowVal]
  );

  saveDb();
  return { id, createdAt: nowVal, updatedAt: nowVal, sortOrder, ...data } as TaskList;
}