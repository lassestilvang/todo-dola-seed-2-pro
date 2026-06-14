import { initDb, getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';

interface CustomFieldValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;

    const result = db.exec(
      `SELECT id, task_id as taskId, field_id as fieldId, value, created_at as createdAt, updated_at as updatedAt
       FROM task_custom_field_values
       WHERE task_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    if (!result || result.length === 0) return Response.json([]);

    const values = result[0].values.map((row: unknown[]) => {
      const [id, taskId, fieldId, value, createdAt, updatedAt] = row as [string, string, string, string | null, number, number];
      return { id, taskId, fieldId, value: value ?? '', createdAt, updatedAt };
    });

    return Response.json(values);
  } catch (error) {
    console.error('Failed to fetch task custom field values:', error);
    return Response.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const { fieldId, value } = await request.json();

    if (!fieldId) {
      return Response.json({ error: 'fieldId is required' }, { status: 400 });
    }

    const existing = db.exec(
      'SELECT id FROM task_custom_field_values WHERE task_id = ? AND field_id = ?',
      [id, fieldId]
    )[0]?.values[0];

    const now = Date.now();
    let result: CustomFieldValue;

    if (existing) {
      db.exec(
        'UPDATE task_custom_field_values SET value = ?, updated_at = ? WHERE task_id = ? AND field_id = ?',
        [value, now, id, fieldId]
      );
      result = { id: existing[0] as string, taskId: id, fieldId, value, createdAt: now, updatedAt: now };
    } else {
      const newId = randomUUID();
      db.exec(
        'INSERT INTO task_custom_field_values (id, task_id, field_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newId, id, fieldId, value, now, now]
      );
      result = { id: newId, taskId: id, fieldId, value, createdAt: now, updatedAt: now };
    }

    saveDb();
    return Response.json(result);
  } catch (error) {
    console.error('Failed to save custom field value:', error);
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }
}