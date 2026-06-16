import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDb, saveDb } from '@/lib/db';
import type { CustomField } from '@/lib/types';

export async function PATCH(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const body = await request.json();
  const { name, type, options } = body;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  if (options !== undefined) {
    updates.push('options = ?');
    values.push(JSON.stringify(options));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  db.exec(`UPDATE custom_fields SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, [...values, Date.now()]);
  saveDb();

  const result = db.exec('SELECT * FROM custom_fields WHERE id = ?', [id]);
  if (!result || result.length === 0) {
    return NextResponse.json({ error: 'Field not found' }, { status: 404 });
  }

  const row = result[0].values[0] as (string | number | null)[];
  const field: CustomField = {
    id: row[0] as string,
    name: row[1] as string,
    type: row[2] as 'text' | 'number' | 'date' | 'boolean' | 'select',
    options: row[3] ? JSON.parse(row[3] as string) : [],
    createdAt: row[4] as number,
    updatedAt: row[5] as number,
  };

  return NextResponse.json({ data: field });
}

export async function DELETE(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  db.exec('DELETE FROM custom_fields WHERE id = ?', [id]);
  db.exec('DELETE FROM task_custom_field_values WHERE field_id = ?', [id]);
  saveDb();

  return NextResponse.json({ success: true });
}