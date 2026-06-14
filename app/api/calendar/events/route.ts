import { initDb, getDb } from '@/lib/db';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: number;
  end: number;
  taskId?: string;
}

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = `
      SELECT t.id, t.name as title, t.description, t.date as start, t.deadline as end, t.id as taskId
      FROM tasks t
      WHERE t.date IS NOT NULL
    `;
    const params: unknown[] = [];

    if (from) {
      query += ' AND t.date >= ?';
      params.push(parseInt(from, 10));
    }
    if (to) {
      query += ' AND t.date <= ?';
      params.push(parseInt(to, 10));
    }

    const result = db.exec(query, params as never[]);
    if (!result || result.length === 0) {
      return Response.json([]);
    }

    const events = result[0].values.map((row: unknown[]) => ({
      id: row[4] as string,
      title: row[1] as string,
      description: row[2] as string,
      start: row[3] as number,
      end: row[3] as number + 60 * 60 * 1000, // Default 1 hour duration
      taskId: row[4] as string,
    }));

    return Response.json(events);
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { title, description, start, end, taskId } = await request.json();

    if (!taskId || !start) {
      return Response.json({ error: 'taskId and start are required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    // Update task date
    db.exec(
      'UPDATE tasks SET date = ?, deadline = ? WHERE id = ?',
      [start, end || start, taskId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}