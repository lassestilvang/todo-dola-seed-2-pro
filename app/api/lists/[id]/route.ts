import { initDb, getDb, saveDb } from '@/lib/db';
import { TaskListSchema } from '@/lib/schemas';
import type { TaskList } from '@/lib/types';

interface ListRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isInbox: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

function rowToList(row: ListRow): TaskList {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji || '📋',
    color: row.color || '#6b7280',
    isInbox: row.isInbox === 1,
    sortOrder: row.sortOrder || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const result = db.exec(
      'SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    const row = result[0].values[0] as unknown as ListRow;
    return Response.json(rowToList(row));
  } catch (error) {
    console.error('Failed to fetch list:', error);
    return Response.json({ error: 'Failed to fetch list' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;

    const result = db.exec('SELECT id, is_inbox FROM lists WHERE id = ?', [id]);
    const lists = result[0]?.values || [];
    const list = lists[0];

    if (!list) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    if (list[1] === 1) {
      return Response.json({ error: 'Cannot delete inbox' }, { status: 400 });
    }

    db.exec('DELETE FROM lists WHERE id = ?', [id]);
    saveDb();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete list:', error);
    return Response.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const body = await request.json();

    const validated = TaskListSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid list data', details: validated.error.flatten() }, { status: 400 });
    }

    const data = validated.data;

    const result = db.exec('SELECT id, is_inbox, name, emoji, color, sort_order, created_at, updated_at FROM lists WHERE id = ?', [id]);
    const lists = result[0]?.values || [];
    const list = lists[0];

    if (!list) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    if (list[1] === 1) {
      return Response.json({ error: 'Cannot update inbox' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    const now = Date.now();

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
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(data.sortOrder);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(now, id);
    db.exec(`UPDATE lists SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, values as never[]);
    saveDb();

    const updatedList = db.exec(
      'SELECT id, name, emoji, color, is_inbox as isInbox, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM lists WHERE id = ?',
      [id]
    );

    return Response.json(rowToList(updatedList[0].values[0] as unknown as ListRow));
  } catch (error) {
    console.error('Failed to update list:', error);
    return Response.json({ error: 'Failed to update list' }, { status: 500 });
  }
}