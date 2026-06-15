import { initDb, saveDb } from '@/lib/db';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { CustomField } from '@/lib/types';

type DbExec = { exec: (sql: string, params?: (string | number | null)[]) => unknown[] };

function ensureTables(db: DbExec) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean', 'select')),
      options TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_custom_field_values (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_task ON task_custom_field_values(task_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_field ON task_custom_field_values(field_id)`);
}

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    ensureTables(db);

    const result = db.exec(`
      SELECT id, name, type, options, created_at as createdAt, updated_at as updatedAt
      FROM custom_fields
      ORDER BY name
    `);

    if (!result || result.length === 0) return Response.json({ data: [] });

    const fields = result[0].values.map((row: unknown[]) => {
      const [id, name, type, options, createdAt, updatedAt] = row as [string, string, string, string | null, number, number];
      return {
        id,
        name,
        type: type as 'text' | 'number' | 'date' | 'boolean' | 'select',
        options: options ? JSON.parse(options) : [],
        createdAt,
        updatedAt,
      } satisfies CustomField;
    });

    return Response.json({ data: fields });
  } catch (error) {
    console.error('Failed to fetch custom fields:', error);
    return Response.json({ error: 'Failed to fetch custom fields' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    ensureTables(db);

    const { name, type, options } = await request.json();

    if (!name || !type) {
      return Response.json({ error: 'name and type are required' }, { status: 400 });
    }

    const id = randomUUID();
    const now = Date.now();
    const optionsStr = options ? JSON.stringify(options) : null;

    db.exec(
      'INSERT INTO custom_fields (id, name, type, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type, optionsStr, now, now]
    );

    saveDb();

    return Response.json({ data: {
      id,
      name,
      type: type as 'text' | 'number' | 'date' | 'boolean' | 'select',
      options: options || [],
      createdAt: now,
      updatedAt: now,
    }}, { status: 201 });
  } catch (error) {
    console.error('Failed to create custom field:', error);
    return Response.json({ error: 'Failed to create custom field' }, { status: 500 });
  }
}