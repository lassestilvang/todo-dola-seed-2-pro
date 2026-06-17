import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TaskTemplate } from '../types';

export async function getTemplates(): Promise<TaskTemplate[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, list_id as listId, priority, created_at as createdAt, updated_at as updatedAt FROM task_templates ORDER BY name'
  ) as unknown as Promise<TaskTemplate[]>;
}

export async function getTemplateById(id: string): Promise<TaskTemplate & { labels: string[] } | null> {
  await initDb();
  const template = runGet(
    'SELECT id, name, description, list_id as listId, priority, created_at as createdAt, updated_at as updatedAt FROM task_templates WHERE id = ?',
    [id]
  );

  if (!template || !template.id) return null;

  const labelRows = runQuery('SELECT label_id FROM template_labels WHERE template_id = ?', [id]);
  const labels = labelRows.map((r: Record<string, unknown>) => r.label_id as string);

  return {
    ...template,
    labels,
  } as TaskTemplate & { labels: string[] };
}

export async function createTemplate(data: { name: string; description?: string | null; listId?: string; priority?: string; labels?: string[] }): Promise<TaskTemplate> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO task_templates (id, name, description, list_id, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description, data.listId || 'inbox', data.priority || 'none', nowVal, nowVal]
  );

  if (data.labels && data.labels.length > 0) {
    for (const labelId of data.labels) {
      runQuery('INSERT INTO template_labels (template_id, label_id) VALUES (?, ?)', [id, labelId]);
    }
  }

  saveDb();
  return { id, name: data.name, description: data.description ?? null, listId: data.listId || 'inbox', priority: data.priority || 'none', labels: data.labels || [], createdAt: nowVal, updatedAt: nowVal } as TaskTemplate;
}

export async function updateTemplate(id: string, data: Partial<TaskTemplate>): Promise<TaskTemplate | null> {
  await initDb();
  const template = await runGet('SELECT * FROM task_templates WHERE id = ?', [id]);
  if (!template) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.listId !== undefined) { updates.push('list_id = ?'); values.push(data.listId); }
  if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE task_templates SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...template, ...data, updatedAt: nowVal } as TaskTemplate;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM template_labels WHERE template_id = ?', [id]);
  runQuery('DELETE FROM task_templates WHERE id = ?', [id]);
  saveDb();
  return true;
}

export async function useTemplate(templateId: string, overrides: Partial<any> = {}): Promise<any> {
  const { createTask } = await import('./tasks');
  await initDb();
  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const task = await createTask({
    name: overrides.name ?? template.name,
    description: overrides.description ?? template.description,
    listId: overrides.listId ?? template.listId,
    priority: overrides.priority ?? template.priority,
  });

  if (template.labels && template.labels.length > 0) {
    for (const labelId of template.labels) {
      runQuery('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)', [task.id, labelId]);
    }
  }

  saveDb();
  return task;
}