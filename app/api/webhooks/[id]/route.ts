import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDb, saveDb } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  await initDb();
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();
  const { url, events, enabled, secret } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (url !== undefined) {
    updates.push('url = ?');
    values.push(url);
  }
  if (events !== undefined) {
    updates.push('config = json_set(config, "$.events", ?)');
    values.push(JSON.stringify(events));
  }
  if (enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(enabled);
  }
  if (secret !== undefined) {
    updates.push('config = json_set(config, "$.secret", ?)');
    values.push(secret);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  db.exec(`UPDATE integrations SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, [...values, Date.now()] as (string | number | null)[]);
  saveDb();

  const result = db.exec(
    'SELECT id, config, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations WHERE id = ?',
    [id]
  );

  if (!result || result.length === 0) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const columns = result[0].columns;
  const row = result[0].values[0] as unknown[];
  const webhook: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    webhook[col] = row[i];
  });

  return NextResponse.json({ data: webhook });
}

export async function DELETE(request: NextRequest) {
  await initDb();
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  db.exec('DELETE FROM integrations WHERE id = ?', [id]);
  saveDb();

  return NextResponse.json({ success: true });
}