import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { CustomView } from '../types';

export async function getCustomViews(): Promise<CustomView[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, icon, filter_config as filterConfig, is_default as isDefault, created_at as createdAt, updated_at as updatedAt FROM custom_views ORDER BY is_default DESC, name'
  ) as unknown as Promise<CustomView[]>;
}

export async function getCustomViewById(id: string): Promise<CustomView | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, icon, filter_config as filterConfig, is_default as isDefault, created_at as createdAt, updated_at as updatedAt FROM custom_views WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as CustomView;
}

export async function createCustomView(data: { name: string; icon?: string | null; filterConfig: string; isDefault?: boolean }): Promise<CustomView> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO custom_views (id, name, icon, filter_config, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.icon || '📋', data.filterConfig, data.isDefault ? 1 : 0, nowVal, nowVal]
  );
  saveDb();

  return { id, name: data.name, icon: data.icon || null, filterConfig: data.filterConfig, isDefault: data.isDefault || false, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateCustomView(id: string, data: Partial<CustomView>): Promise<CustomView | null> {
  await initDb();
  const view = await getCustomViewById(id);
  if (!view) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
  if (data.filterConfig !== undefined) { updates.push('filter_config = ?'); values.push(data.filterConfig); }
  if (data.isDefault !== undefined) { updates.push('is_default = ?'); values.push(data.isDefault ? 1 : 0); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE custom_views SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...view, ...data, updatedAt: nowVal };
}

export async function deleteCustomView(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM custom_views WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function setDefaultCustomView(id: string): Promise<void> {
  await initDb();
  runQuery('UPDATE custom_views SET is_default = 0');
  runQuery('UPDATE custom_views SET is_default = 1 WHERE id = ?', [id]);
  saveDb();
}