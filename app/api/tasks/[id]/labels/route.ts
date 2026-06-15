import { initDb, getDb, saveDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;

    const result = db.exec(
      `SELECT l.id, l.name, l.emoji, l.color FROM labels l
       JOIN task_labels tl ON l.id = tl.label_id
       WHERE tl.task_id = ?`,
      [id]
    );

    const labels = result[0]?.values.map((row: unknown[]) => ({
      id: row[0],
      name: row[1],
      emoji: row[2],
      color: row[3],
    })) || [];

    return Response.json({ data: labels });
  } catch (error) {
    console.error('Failed to fetch task labels:', error);
    return Response.json({ error: 'Failed to fetch task labels' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const body = await request.json() as { labelId: string };

    if (!body.labelId) {
      return Response.json({ error: 'Label ID required' }, { status: 400 });
    }

    db.exec('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, body.labelId]);
    saveDb();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to add label to task:', error);
    return Response.json({ error: 'Failed to add label to task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;
    const url = new URL(request.url);
    const labelId = url.searchParams.get('labelId');

    if (!labelId) {
      return Response.json({ error: 'Label ID required' }, { status: 400 });
    }

    db.exec('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [id, labelId]);
    saveDb();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to remove label from task:', error);
    return Response.json({ error: 'Failed to remove label from task' }, { status: 500 });
  }
}