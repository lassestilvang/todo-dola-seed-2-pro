import { initDb, getDb, saveDb } from '@/lib/db';
import { SubtaskSchema } from '@/lib/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const body = await request.json();

    const validated = SubtaskSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid subtask data', details: validated.error.flatten() }, { status: 400 });
    }

    const data = validated.data;
    const subtaskId = crypto.randomUUID();
    const now = Date.now();

    db.exec(
      'INSERT INTO subtasks (id, task_id, name, completed, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subtaskId, id, data.name, data.completed ? 1 : 0, 0, now, now] as never[]
    );
    saveDb();

    return Response.json({ id: subtaskId, name: data.name, completed: false }, { status: 201 });
  } catch (error) {
    console.error('Failed to create subtask:', error);
    return Response.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const result = db.exec(
      'SELECT id, name, completed, completed_at as completedAt, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM subtasks WHERE task_id = ? ORDER BY sort_order',
      [id]
    );
    const subtasks = result[0]?.values.map((row: unknown[]) => ({
      id: row[0],
      name: row[1],
      completed: Boolean(row[2]),
      completedAt: row[3],
      sortOrder: row[4],
      createdAt: row[5],
      updatedAt: row[6],
    })) || [];

    return Response.json(subtasks);
  } catch (error) {
    console.error('Failed to fetch subtasks:', error);
    return Response.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}