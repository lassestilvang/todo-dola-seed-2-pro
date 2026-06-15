import { initDb, getDb, saveDb } from '@/lib/db';
import { SubtaskSchema } from '@/lib/schemas';

type SubtaskUpdate = { completed?: boolean; name?: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { subtaskId } = await params;
    const body = await request.json();

    const validated = SubtaskSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid subtask data', details: validated.error.flatten() }, { status: 400 });
    }

    const data = validated.data;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.completed !== undefined) {
      updates.push('completed = ?');
      values.push(data.completed ? 1 : 0);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(subtaskId);
    db.exec(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`, values as never[]);
    saveDb();

    const result = db.exec('SELECT id, name, completed FROM subtasks WHERE id = ?', [subtaskId]);
    const subtask = result[0]?.values[0];

    if (!subtask) {
      return Response.json({ error: 'Subtask not found' }, { status: 404 });
    }

    return Response.json({ data: { id: subtask[0], name: subtask[1], completed: Boolean(subtask[2]) } });
  } catch (error) {
    console.error('Failed to update subtask:', error);
    return Response.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { subtaskId } = await params;
    db.exec('DELETE FROM subtasks WHERE id = ?', [subtaskId]);
    saveDb();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete subtask:', error);
    return Response.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}