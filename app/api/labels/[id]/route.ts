import { initDb, getDb, saveDb } from '@/lib/db';
import { LabelSchema } from '@/lib/schemas';
import type { Label } from '@/lib/types';

interface LabelRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
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
      'SELECT id, name, emoji, color, created_at as createdAt, updated_at as updatedAt FROM labels WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      return Response.json({ error: 'Label not found' }, { status: 404 });
    }

    const row = result[0].values[0] as unknown as LabelRow;
    return Response.json(row);
  } catch (error) {
    console.error('Failed to fetch label:', error);
    return Response.json({ error: 'Failed to fetch label' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    db.exec('DELETE FROM labels WHERE id = ?', [id]);
    saveDb();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete label:', error);
    return Response.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const body = await request.json();

    const validated = LabelSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid label data', details: validated.error.flatten() }, { status: 400 });
    }

    const data = validated.data;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.emoji !== undefined) {
      updates.push('emoji = ?');
      values.push(data.emoji);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    db.exec(`UPDATE labels SET ${updates.join(', ')}, updated_at = strftime('%s', 'now') WHERE id = ?`, values as never);
    saveDb();

    // Fetch and return updated label
    const result = db.exec(
      'SELECT id, name, emoji, color, created_at as createdAt, updated_at as updatedAt FROM labels WHERE id = ?',
      [id]
    );
    const updated = result[0]?.values[0] as unknown as LabelRow;
    return Response.json(updated);
  } catch (error) {
    console.error('Failed to update label:', error);
    return Response.json({ error: 'Failed to update label' }, { status: 500 });
  }
}