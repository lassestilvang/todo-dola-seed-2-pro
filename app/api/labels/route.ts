import { initDb, getDb, saveDb } from '@/lib/db';
import { LabelCreateSchema } from '@/lib/schemas';

type LabelRow = { id: string; name: string; emoji: string; color: string };

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const result = db.exec('SELECT id, name, emoji, color FROM labels ORDER BY name');
    const labels = result[0]?.values.map((row: unknown[]) => ({
      id: row[0],
      name: row[1],
      emoji: row[2],
      color: row[3],
    })) as LabelRow[] || [];

    return Response.json(labels);
  } catch (error) {
    console.error('Failed to fetch labels:', error);
    return Response.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const body = await request.json();
    const validated = LabelCreateSchema.safeParse(body);

    if (!validated.success) {
      return Response.json({ error: 'Invalid label data', details: validated.error.flatten() }, { status: 400 });
    }

    const data = validated.data;
    const id = crypto.randomUUID();
    const now = Date.now();
    const emoji = data.emoji || '🏷️';
    const color = data.color || '#3b82f6';

    db.exec(
      'INSERT INTO labels (id, name, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, emoji, color, now, now] as never[]
    );

    saveDb();

    return Response.json({ id, name: data.name, emoji: data.emoji, color }, { status: 201 });
  } catch (error) {
    console.error('Failed to create label:', error);
    return Response.json({ error: 'Failed to create label' }, { status: 500 });
  }
}