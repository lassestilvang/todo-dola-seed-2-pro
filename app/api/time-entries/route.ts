import { initDb, getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, duration, description } = await request.json();

    if (!taskId || !duration) {
      return Response.json({ error: 'Task ID and duration are required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const now = Date.now();
    const id = randomUUID();

    db.exec(
      'INSERT INTO time_entries (id, task_id, duration, description, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, taskId, duration, description, now, now]
    );

    // Update actual_time on task
    db.exec(
      'UPDATE tasks SET actual_time = COALESCE(actual_time, 0) + ? WHERE id = ?',
      [duration, taskId]
    );

    saveDb();

    return Response.json({ data: { id, taskId, duration, description, startedAt: now, endedAt: null, createdAt: now } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create time entry:', error);
    return Response.json({ error: 'Failed to create time entry' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    let query = `
      SELECT id, task_id as taskId, duration, description, started_at as startedAt, ended_at as endedAt, created_at as createdAt
      FROM time_entries
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (taskId) {
      query += ' AND task_id = ?';
      params.push(taskId);
    }

    query += ' ORDER BY started_at DESC';

    const result = db.exec(query, params as never[]);
    if (!result || result.length === 0) {
      return Response.json({ data: [] });
    }

    const columns = result[0].columns;
    const rows = result[0].values;

    const entries = rows.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return Response.json({ data: entries });
  } catch (error) {
    console.error('Failed to fetch time entries:', error);
    return Response.json({ error: 'Failed to fetch time entries' }, { status: 500 });
  }
}